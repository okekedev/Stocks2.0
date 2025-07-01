import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Polygon API Configuration
const POLYGON_API_KEY = "XdjkNaeEDf5dSrjflNopslWWJdG_xZZm";

// Simple production detection: check if dist folder exists and has files
const distPath = path.join(__dirname, 'dist');
const isProduction = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (isProduction) {
  // Production: serve built React app
  app.use(express.static(distPath));
  console.log('📦 Production mode - serving built React app from dist/');
} else {
  // Development: don't serve static files (Vite dev server handles this)
  console.log('🔥 Development mode - Vite dev server handles frontend');
}

// Technical Analysis Helper Functions
function calculateTechnicalIndicators(bars) {
  if (!bars || bars.length < 14) return null;
  
  const closes = bars.map(bar => bar.c);
  const volumes = bars.map(bar => bar.v);
  const highs = bars.map(bar => bar.h);
  const lows = bars.map(bar => bar.l);
  
  // Simple Moving Averages
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
  
  // Volume Moving Average (20 period)
  const volumeMA = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
  const currentVolume = volumes[volumes.length - 1];
  
  // RSI Calculation (14 period)
  const rsi = calculateRSI(closes, 14);
  
  // VWAP (Volume Weighted Average Price) for today
  const vwap = calculateVWAP(bars.slice(-78)); // Last 78 5-min bars = 1 trading day
  
  // Price vs VWAP
  const currentPrice = closes[closes.length - 1];
  const priceVsVWAP = ((currentPrice - vwap) / vwap) * 100;
  
  // Volume surge detection
  const volumeSurge = (currentVolume / volumeMA) * 100;
  
  // Price momentum (% change in last hour)
  const hourAgo = closes[Math.max(0, closes.length - 12)]; // 12 bars ago (1 hour in 5min bars)
  const hourMomentum = ((currentPrice - hourAgo) / hourAgo) * 100;
  
  // Buying pressure indicators
  const buyingPressure = analyzeBuyingPressure(bars.slice(-12)); // Last hour
  
  return {
    currentPrice,
    sma20,
    sma50,
    rsi,
    vwap,
    priceVsVWAP: Number(priceVsVWAP.toFixed(2)),
    volumeSurge: Number(volumeSurge.toFixed(1)),
    hourMomentum: Number(hourMomentum.toFixed(2)),
    volumeMA: Math.round(volumeMA),
    currentVolume: Math.round(currentVolume),
    buyingPressure,
    signals: generateSignals({
      rsi, priceVsVWAP, volumeSurge, hourMomentum, currentPrice, sma20, sma50
    })
  };
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50; // Neutral if not enough data
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(1));
}

function calculateVWAP(bars) {
  let totalVolume = 0;
  let totalVolumePrice = 0;
  
  bars.forEach(bar => {
    const typicalPrice = (bar.h + bar.l + bar.c) / 3;
    totalVolumePrice += typicalPrice * bar.v;
    totalVolume += bar.v;
  });
  
  return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
}

function analyzeBuyingPressure(bars) {
  if (!bars || bars.length === 0) return { score: 0, signals: [] };
  
  let bullishBars = 0;
  let volumeWeightedMomentum = 0;
  let highVolumeBreakouts = 0;
  const signals = [];
  
  bars.forEach((bar, index) => {
    const bodySize = Math.abs(bar.c - bar.o);
    const upperWick = bar.h - Math.max(bar.o, bar.c);
    const lowerWick = Math.min(bar.o, bar.c) - bar.l;
    
    // Green candle with strong close
    if (bar.c > bar.o) {
      bullishBars++;
      
      // Strong bullish candle (small upper wick, large body)
      if (upperWick < bodySize * 0.3 && bodySize > (bar.h - bar.l) * 0.6) {
        signals.push(`Strong bullish candle at ${new Date(bar.t).toLocaleTimeString()}`);
      }
    }
    
    // Volume momentum
    const priceChange = ((bar.c - bar.o) / bar.o) * 100;
    volumeWeightedMomentum += priceChange * bar.v;
    
    // High volume breakout
    if (index > 0) {
      const avgVolume = bars.slice(0, index).reduce((sum, b) => sum + b.v, 0) / index;
      if (bar.v > avgVolume * 1.5 && bar.c > bar.o) {
        highVolumeBreakouts++;
        signals.push(`Volume breakout: ${(bar.v / avgVolume).toFixed(1)}x avg volume`);
      }
    }
  });
  
  // Calculate overall buying pressure score (0-100)
  const bullishRatio = (bullishBars / bars.length) * 100;
  const momentumScore = Math.max(0, Math.min(100, volumeWeightedMomentum / 1000000 + 50));
  const breakoutScore = (highVolumeBreakouts / bars.length) * 100;
  
  const score = Number(((bullishRatio * 0.4 + momentumScore * 0.4 + breakoutScore * 0.2)).toFixed(1));
  
  return { score, signals, bullishBars, totalBars: bars.length };
}

function generateSignals(indicators) {
  const signals = [];
  
  // RSI signals
  if (indicators.rsi < 30) signals.push({ type: 'oversold', message: 'RSI Oversold - Potential Reversal', strength: 'medium' });
  if (indicators.rsi > 70) signals.push({ type: 'overbought', message: 'RSI Overbought - Take Profits', strength: 'medium' });
  
  // Volume signals
  if (indicators.volumeSurge > 200) signals.push({ type: 'volume', message: 'Massive Volume Surge', strength: 'high' });
  else if (indicators.volumeSurge > 150) signals.push({ type: 'volume', message: 'High Volume Activity', strength: 'medium' });
  
  // Price vs VWAP
  if (indicators.priceVsVWAP > 2) signals.push({ type: 'momentum', message: 'Strong Above VWAP', strength: 'high' });
  else if (indicators.priceVsVWAP > 0.5) signals.push({ type: 'momentum', message: 'Above VWAP', strength: 'medium' });
  
  // Moving average signals
  if (indicators.currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
    signals.push({ type: 'trend', message: 'Bullish MA Alignment', strength: 'medium' });
  }
  
  // Momentum signals
  if (indicators.hourMomentum > 5) signals.push({ type: 'momentum', message: 'Strong Hourly Momentum', strength: 'high' });
  else if (indicators.hourMomentum > 2) signals.push({ type: 'momentum', message: 'Positive Momentum', strength: 'medium' });
  
  return signals;
}

// API Routes

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// Test Polygon API connection
app.get('/api/test-polygon', async (req, res) => {
  try {
    const response = await fetch(
      `https://api.polygon.io/v2/reference/news?limit=1&apikey=${POLYGON_API_KEY}`
    );
    
    const data = await response.json();
    
    res.json({
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      sampleData: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get qualifying stocks based on criteria
app.post('/api/stocks/screen', async (req, res) => {
  try {
    const { minPrice, maxPrice, minMarketCap, maxMarketCap, minVolume, exchanges } = req.body;
    
    console.log('🔍 Screening stocks with criteria:', req.body);
    
    // Step 1: Get all active stocks
    const tickersResponse = await fetch(
      `https://api.polygon.io/v3/reference/tickers?` +
      `market=stocks&active=true&limit=1000&` +
      `sort=ticker&order=asc&` +
      `apikey=${POLYGON_API_KEY}`
    );
    
    if (!tickersResponse.ok) {
      throw new Error(`Tickers API failed: ${tickersResponse.status}`);
    }
    
    const tickersData = await tickersResponse.json();
    console.log(`📊 Retrieved ${tickersData.results?.length || 0} tickers from Polygon`);
    
    if (!tickersData.results) {
      return res.json({ qualifyingStocks: [] });
    }
    
    // Step 2: Filter by exchange first (reduce API calls)
    const filteredByExchange = tickersData.results.filter(ticker => 
      exchanges.includes(ticker.primary_exchange)
    );
    
    console.log(`🏛️ After exchange filter: ${filteredByExchange.length} stocks`);
    
    // Step 3: Get market data for filtered stocks (batch process)
    const qualifyingStocks = [];
    const batchSize = 10; // Process 10 at a time to avoid rate limits
    
    for (let i = 0; i < filteredByExchange.length && qualifyingStocks.length < 50; i += batchSize) {
      const batch = filteredByExchange.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (ticker) => {
        try {
          // Get current market data
          const snapshotResponse = await fetch(
            `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.ticker}?apikey=${POLYGON_API_KEY}`
          );
          
          if (!snapshotResponse.ok) return null;
          
          const snapshotData = await snapshotResponse.json();
          const result = snapshotData.results?.[0];
          
          if (!result?.value || !result?.day) return null;
          
          const price = result.value; // Current price
          const volume = result.day.v; // Daily volume
          
          // Get market cap from ticker details (if available)
          let marketCap = null;
          if (ticker.market_cap) {
            marketCap = ticker.market_cap / 1000000; // Convert to millions
          } else {
            // Estimate market cap: price * shares outstanding (if available)
            if (ticker.weighted_shares_outstanding && price) {
              marketCap = (price * ticker.weighted_shares_outstanding) / 1000000;
            }
          }
          
          // Apply filters
          if (
            price >= minPrice && 
            price <= maxPrice && 
            volume >= (minVolume * 1000) && // Convert K to actual volume
            (!marketCap || (marketCap >= minMarketCap && marketCap <= maxMarketCap))
          ) {
            return {
              ticker: ticker.ticker,
              name: ticker.name,
              price: Number(price.toFixed(2)),
              marketCap: marketCap ? Number(marketCap.toFixed(0)) : null,
              volume: Math.round(volume / 1000), // Convert to K
              exchange: ticker.primary_exchange,
              sector: ticker.sic_description || 'Unknown'
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error processing ${ticker.ticker}:`, error.message);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      qualifyingStocks.push(...validResults);
      
      console.log(`📈 Batch ${Math.floor(i/batchSize) + 1}: Found ${validResults.length} qualifying stocks`);
      
      // Rate limiting - wait between batches
      if (i + batchSize < filteredByExchange.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    console.log(`✅ Final result: ${qualifyingStocks.length} qualifying stocks found`);
    
    res.json({
      qualifyingStocks: qualifyingStocks.slice(0, 30), // Limit to 30 for performance
      totalScanned: filteredByExchange.length
    });
    
  } catch (error) {
    console.error('❌ Stock screening error:', error);
    res.status(500).json({ 
      error: 'Failed to screen stocks', 
      message: error.message 
    });
  }
});

// Get technical analysis for a specific ticker
app.post('/api/stocks/technical-analysis', async (req, res) => {
  try {
    const { ticker, timeframe = '5' } = req.body; // 5-minute bars for intraday analysis
    
    console.log(`📊 Getting technical analysis for ${ticker}`);
    
    // Get 1 day of 5-minute bars (78 bars = 1 trading day)
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const barsResponse = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${timeframe}/minute/` +
      `${yesterday.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}?` +
      `adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`
    );
    
    if (!barsResponse.ok) {
      throw new Error(`Technical analysis API failed: ${barsResponse.status}`);
    }
    
    const barsData = await barsResponse.json();
    
    if (!barsData.results || barsData.results.length === 0) {
      return res.status(404).json({ error: 'No price data available for analysis' });
    }
    
    // Calculate technical indicators
    const analysis = calculateTechnicalIndicators(barsData.results);
    
    if (!analysis) {
      return res.status(400).json({ error: 'Insufficient data for technical analysis' });
    }
    
    // Get latest quote for additional context
    const quoteResponse = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${POLYGON_API_KEY}`
    );
    
    let additionalData = {};
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      const result = quoteData.results?.[0];
      if (result) {
        additionalData = {
          bid: result.lastQuote?.P,
          ask: result.lastQuote?.p,
          spread: result.lastQuote ? Number((result.lastQuote.p - result.lastQuote.P).toFixed(2)) : null,
          dayChange: result.todaysChange,
          dayChangePercent: result.todaysChangePerc
        };
      }
    }
    
    console.log(`✅ Technical analysis complete for ${ticker}`);
    
    res.json({
      ticker,
      timestamp: new Date().toISOString(),
      timeframe: `${timeframe} minute`,
      barsAnalyzed: barsData.results.length,
      analysis: {
        ...analysis,
        ...additionalData
      }
    });
    
  } catch (error) {
    console.error('❌ Technical analysis error:', error);
    res.status(500).json({
      error: 'Failed to get technical analysis',
      message: error.message
    });
  }
});

// Enhanced news check with automatic technical analysis (POSITIVE SENTIMENT ONLY)
app.post('/api/news/check-with-technicals', async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!tickers || tickers.length === 0) {
      return res.json({ news: [] });
    }
    
    console.log(`📰 Checking positive news + technicals for ${tickers.length} tickers`);
    
    // Get news from last 16 minutes
    const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    
    const newsResponse = await fetch(
      `https://api.polygon.io/v2/reference/news?` +
      `published_utc.gte=${sixteenMinutesAgo.toISOString()}&` +
      `published_utc.lte=${oneMinuteAgo.toISOString()}&` +
      `sort=published_utc&order=desc&` +
      `limit=100&` +
      `apikey=${POLYGON_API_KEY}`
    );
    
    if (!newsResponse.ok) {
      throw new Error(`News API failed: ${newsResponse.status}`);
    }
    
    const newsData = await newsResponse.json();
    
    if (!newsData.results) {
      return res.json({ news: [] });
    }
    
    // Filter for POSITIVE sentiment news ONLY
    const positiveNews = newsData.results.filter(article => {
      const mentionedTickers = article.tickers || [];
      const hasRelevantTicker = mentionedTickers.some(ticker => tickers.includes(ticker));
      
      // ONLY positive sentiment news
      const hasPositiveSentiment = article.insights && 
        article.insights.some(insight => insight.sentiment === 'positive');
      
      return hasRelevantTicker && hasPositiveSentiment;
    });
    
    console.log(`📈 Found ${positiveNews.length} positive sentiment news items`);
    
    // Get technical analysis for stocks with positive news
    const newsWithTechnicals = await Promise.all(
      positiveNews.map(async (article) => {
        const ticker = article.tickers[0];
        
        try {
          // Get technical analysis for this ticker
          const techResponse = await fetch(`http://localhost:${process.env.NODE_ENV === 'production' ? 3000 : 3001}/api/stocks/technical-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker })
          });
          
          let technicalAnalysis = null;
          if (techResponse.ok) {
            const techData = await techResponse.json();
            technicalAnalysis = techData.analysis;
          }
          
          return {
            id: article.id,
            ticker,
            title: article.title,
            description: article.description,
            time: article.published_utc,
            sentiment: article.insights[0].sentiment,
            sentimentReasoning: article.insights[0].sentiment_reasoning,
            source: article.publisher?.name || 'Unknown',
            category: article.keywords?.[0] || 'General',
            url: article.article_url,
            technicalAnalysis // This is the key addition!
          };
          
        } catch (error) {
          console.error(`Error getting technicals for ${ticker}:`, error.message);
          return {
            id: article.id,
            ticker,
            title: article.title,
            description: article.description,
            time: article.published_utc,
            sentiment: article.insights[0].sentiment,
            sentimentReasoning: article.insights[0].sentiment_reasoning,
            source: article.publisher?.name || 'Unknown',
            category: article.keywords?.[0] || 'General',
            url: article.article_url,
            technicalAnalysis: null
          };
        }
      })
    );
    
    console.log(`✅ Technical analysis complete for ${newsWithTechnicals.length} news items`);
    
    res.json({
      news: newsWithTechnicals,
      totalArticles: newsData.results.length,
      positiveNewsCount: positiveNews.length
    });
    
  } catch (error) {
    console.error('❌ News + technicals error:', error);
    res.status(500).json({
      error: 'Failed to get news with technicals',
      message: error.message
    });
  }
});

// Simple API route example
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Neural Stock Radar API is online!',
    features: [
      'Real-time stock screening',
      'Positive sentiment news detection', 
      'Technical analysis with buying pressure',
      'Professional momentum trading signals'
    ],
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes (only in production)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Port configuration: 3001 for development, 3000 for production
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Neural Stock Radar Server running on port ${PORT}`);
  console.log(`🔌 Polygon.io API: Connected`);
  console.log(`📊 Features: Stock Screening | Technical Analysis | Sentiment Detection`);
  
  if (isProduction) {
    console.log(`📱 Application: http://localhost:${PORT}`);
  } else {
    console.log(`📱 Frontend (Vite): http://localhost:3000`);
    console.log(`🔌 Backend API: http://localhost:${PORT}`);
    console.log(`🧪 Test Polygon: http://localhost:${PORT}/api/test-polygon`);
  }
});