// =============================================================================
// TECHNICAL ANALYSIS SERVICE
// =============================================================================

import { 
  getFilteredTickers, 
  getMarketSnapshots, 
  getSingleTickerSnapshot,
  getHistoricalData 
} from './polygonService.js';

// Calculate technical indicators
export function calculateTechnicalIndicators(ohlcvData) {
  if (!ohlcvData || ohlcvData.length < 14) {
    return null;
  }

  const closes = ohlcvData.map(bar => bar.c);
  const highs = ohlcvData.map(bar => bar.h);
  const lows = ohlcvData.map(bar => bar.l);
  const volumes = ohlcvData.map(bar => bar.v);

  // Simple Moving Averages
  const sma20 = closes.length >= 20 ? 
    closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
  const sma50 = closes.length >= 50 ? 
    closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

  // RSI calculation (14-period)
  let gains = 0, losses = 0;
  const rsiPeriod = Math.min(14, closes.length - 1);
  
  for (let i = closes.length - rsiPeriod - 1; i < closes.length - 1; i++) {
    const change = closes[i + 1] - closes[i];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / rsiPeriod;
  const avgLoss = losses / rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // MACD calculation (12, 26, 9)
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 && ema26 ? ema12 - ema26 : null;

  // Bollinger Bands (20-period, 2 standard deviations)
  const bollingerBands = calculateBollingerBands(closes, 20, 2);

  // Volume analysis
  const volumePeriod = Math.min(20, volumes.length);
  const avgVolume = volumes.slice(-volumePeriod).reduce((a, b) => a + b, 0) / volumePeriod;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;

  // Support and Resistance levels
  const supportResistance = calculateSupportResistance(highs, lows, closes);

  return {
    sma20: sma20 ? parseFloat(sma20.toFixed(2)) : null,
    sma50: sma50 ? parseFloat(sma50.toFixed(2)) : null,
    rsi: parseFloat(rsi.toFixed(2)),
    macd: macdLine ? parseFloat(macdLine.toFixed(2)) : null,
    bollingerBands,
    avgVolume: Math.round(avgVolume),
    volumeRatio: parseFloat(volumeRatio.toFixed(2)),
    supportResistance,
    currentPrice: closes[closes.length - 1],
    priceVsSMA20: sma20 ? parseFloat(((closes[closes.length - 1] / sma20 - 1) * 100).toFixed(2)) : null,
    priceVsSMA50: sma50 ? parseFloat(((closes[closes.length - 1] / sma50 - 1) * 100).toFixed(2)) : null,
    timestamp: new Date().toISOString()
  };
}

// Calculate Exponential Moving Average
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices, period, multiplier) {
  if (prices.length < period) return null;
  
  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  // Calculate standard deviation
  const variance = recentPrices.reduce((acc, price) => {
    return acc + Math.pow(price - sma, 2);
  }, 0) / period;
  
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: parseFloat((sma + (stdDev * multiplier)).toFixed(2)),
    middle: parseFloat(sma.toFixed(2)),
    lower: parseFloat((sma - (stdDev * multiplier)).toFixed(2))
  };
}

// Calculate Support and Resistance levels
function calculateSupportResistance(highs, lows, closes) {
  const period = Math.min(20, highs.length);
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  
  // Find local peaks and troughs
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);
  
  return {
    resistance: parseFloat(resistance.toFixed(2)),
    support: parseFloat(support.toFixed(2)),
    currentPrice: closes[closes.length - 1]
  };
}

// Stock screening with technical analysis
export async function performStockScreening(criteria = {}) {
  try {
    console.log('[INFO] Starting stock screening with criteria:', criteria);
    
    // Step 1: Build API query with available filters
    const tickerQuery = {
      market: criteria.market || 'stocks',
      active: true,
      limit: 1000,
      sort: 'ticker',
      order: 'asc'
    };
    
    // Apply exchange filter at API level if specified
    if (criteria.exchanges && criteria.exchanges.length > 0) {
      // Note: Polygon API only supports single exchange per query
      // We'll need to make multiple calls for multiple exchanges
      console.log(`[INFO] Will query exchanges: ${criteria.exchanges.join(', ')}`);
    }
    
    // Step 2: Get tickers (potentially multiple API calls for different exchanges)
    let allTickers = [];
    
    if (criteria.exchanges && criteria.exchanges.length > 0) {
      // Make separate API calls for each exchange
      for (const exchange of criteria.exchanges) {
        try {
          console.log(`[INFO] Querying exchange: ${exchange}`);
          const exchangeQuery = { ...tickerQuery, exchange };
          const tickersResponse = await getFilteredTickers(exchangeQuery);
          
          if (tickersResponse.results) {
            allTickers.push(...tickersResponse.results);
          }
        } catch (error) {
          console.warn(`[WARN] Failed to get tickers for exchange ${exchange}:`, error.message);
        }
      }
    } else {
      // Single API call for all exchanges
      const tickersResponse = await getFilteredTickers(tickerQuery);
      if (tickersResponse.results) {
        allTickers = tickersResponse.results;
      }
    }
    
    if (allTickers.length === 0) {
      return { results: [], message: 'No tickers found matching criteria' };
    }
    
    console.log(`[INFO] Retrieved ${allTickers.length} tickers after exchange filtering`);
    
    // Step 3: Get market snapshots in batches
    const tickerSymbols = allTickers.map(t => t.ticker);
    const batchSize = 250; // Polygon API limit for snapshots
    let allSnapshots = [];
    
    for (let i = 0; i < tickerSymbols.length; i += batchSize) {
      const batch = tickerSymbols.slice(i, i + batchSize);
      console.log(`[INFO] Getting snapshots batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tickerSymbols.length/batchSize)}: ${batch.length} tickers`);
      
      try {
        const snapshotsResponse = await getMarketSnapshots(batch);
        
        if (snapshotsResponse && snapshotsResponse.tickers && Array.isArray(snapshotsResponse.tickers)) {
          console.log(`[DEBUG] Batch ${Math.floor(i/batchSize) + 1} returned ${snapshotsResponse.tickers.length} snapshots`);
          allSnapshots.push(...snapshotsResponse.tickers);
        } else if (snapshotsResponse && snapshotsResponse.results && Array.isArray(snapshotsResponse.results)) {
          console.log(`[DEBUG] Batch ${Math.floor(i/batchSize) + 1} returned ${snapshotsResponse.results.length} snapshots (results field)`);
          allSnapshots.push(...snapshotsResponse.results);
        } else {
          console.warn(`[WARN] Batch ${Math.floor(i/batchSize) + 1}: Unexpected response structure:`, Object.keys(snapshotsResponse || {}));
        }
      } catch (error) {
        console.warn(`[WARN] Failed to get snapshots for batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < tickerSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[INFO] Retrieved ${allSnapshots.length} market snapshots`);
    
    if (allSnapshots.length === 0) {
      return { results: [], message: 'No market data available' };
    }
    
    // Step 4: Apply client-side filters (price, volume, market cap, etc.)
    const screenedStocks = [];
    let processedCount = 0;
    
    for (const snapshot of allSnapshots) {
      processedCount++;
      
      const ticker = snapshot.ticker;
      const lastTrade = snapshot.lastTrade;
      const dailyBar = snapshot.dailyBar;
      const prevDailyBar = snapshot.prevDailyBar;
      
      // Skip if missing essential data
      if (!lastTrade || !dailyBar) {
        continue;
      }
      
      // Find ticker info from our filtered list
      const tickerInfo = allTickers.find(t => t.ticker === ticker);
      if (!tickerInfo) continue;
      
      // Calculate metrics
      const currentPrice = lastTrade.p;
      const changePercent = prevDailyBar ? ((currentPrice - prevDailyBar.c) / prevDailyBar.c) * 100 : 0;
      const volume = dailyBar.v;
      const marketCap = snapshot.marketCap;
      
      // Apply screening filters
      if (criteria.minPrice && currentPrice < criteria.minPrice) continue;
      if (criteria.maxPrice && currentPrice > criteria.maxPrice) continue;
      if (criteria.minVolume && volume < criteria.minVolume) continue;
      if (criteria.maxVolume && volume > criteria.maxVolume) continue;
      if (criteria.minChangePercent && changePercent < criteria.minChangePercent) continue;
      if (criteria.maxChangePercent && changePercent > criteria.maxChangePercent) continue;
      
      // Market cap filtering
      const minMarketCap = criteria.minMarketCap && criteria.minMarketCap !== '' ? 
        parseFloat(criteria.minMarketCap) * 1000000 : null; // Convert millions to actual value
      const maxMarketCap = criteria.maxMarketCap && criteria.maxMarketCap !== '' ? 
        parseFloat(criteria.maxMarketCap) * 1000000 : null;
      
      if (minMarketCap && (!marketCap || marketCap < minMarketCap)) continue;
      if (maxMarketCap && marketCap && marketCap > maxMarketCap) continue;
      
      // Get technical indicators if requested
      let technicals = null;
      if (criteria.includeTechnicals) {
        try {
          const fromDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const toDate = new Date().toISOString().split('T')[0];
          
          const historicalResponse = await getHistoricalData(ticker, 'day', fromDate, toDate, 60);
          
          if (historicalResponse.results && historicalResponse.results.length > 0) {
            technicals = calculateTechnicalIndicators(historicalResponse.results);
          }
        } catch (error) {
          console.warn(`[WARN] Failed to get historical data for ${ticker}:`, error.message);
        }
      }
      
      // Apply technical filters
      if (criteria.minRSI && technicals?.rsi && technicals.rsi < criteria.minRSI) continue;
      if (criteria.maxRSI && technicals?.rsi && technicals.rsi > criteria.maxRSI) continue;
      if (criteria.aboveSMA20 && technicals?.sma20 && currentPrice < technicals.sma20) continue;
      if (criteria.belowSMA20 && technicals?.sma20 && currentPrice > technicals.sma20) continue;
      if (criteria.aboveSMA50 && technicals?.sma50 && currentPrice < technicals.sma50) continue;
      if (criteria.belowSMA50 && technicals?.sma50 && currentPrice > technicals.sma50) continue;
      
      // Add to results
      screenedStocks.push({
        ticker,
        name: tickerInfo.name || ticker,
        exchange: tickerInfo.primary_exchange,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume,
        marketCap: marketCap || null,
        marketCapFormatted: marketCap ? `${(marketCap / 1000000000).toFixed(2)}B` : 'N/A',
        dailyBar: {
          open: dailyBar.o,
          high: dailyBar.h,
          low: dailyBar.l,
          close: dailyBar.c,
          volume: dailyBar.v
        },
        prevDailyBar: prevDailyBar ? {
          open: prevDailyBar.o,
          high: prevDailyBar.h,
          low: prevDailyBar.l,
          close: prevDailyBar.c,
          volume: prevDailyBar.v
        } : null,
        technicals,
        timestamp: new Date().toISOString()
      });
      
      // Log progress for large datasets
      if (processedCount % 1000 === 0) {
        console.log(`[INFO] Processed ${processedCount}/${allSnapshots.length} snapshots, found ${screenedStocks.length} matches so far`);
      }
    }
    
    // Sort results
    screenedStocks.sort((a, b) => {
      if (criteria.sortBy === 'volume') return b.volume - a.volume;
      if (criteria.sortBy === 'price') return b.currentPrice - a.currentPrice;
      if (criteria.sortBy === 'rsi' && a.technicals?.rsi && b.technicals?.rsi) {
        return b.technicals.rsi - a.technicals.rsi;
      }
      if (criteria.sortBy === 'marketCap' && a.marketCap && b.marketCap) {
        return b.marketCap - a.marketCap;
      }
      return b.changePercent - a.changePercent; // Default: by change percent
    });
    
    const summary = {
      totalTickersQueried: allTickers.length,
      snapshotsRetrieved: allSnapshots.length,
      finalResults: screenedStocks.length,
      filteringEfficiency: `${((screenedStocks.length / allSnapshots.length) * 100).toFixed(1)}%`,
      exchanges: criteria.exchanges || ['all']
    };
    
    console.log(`[INFO] Stock screening completed:`);
    console.log(`  - Total tickers queried: ${summary.totalTickersQueried}`);
    console.log(`  - Market snapshots retrieved: ${summary.snapshotsRetrieved}`);
    console.log(`  - Final results: ${summary.finalResults}`);
    console.log(`  - Filtering efficiency: ${summary.filteringEfficiency}`);
    
    return {
      results: screenedStocks,
      summary,
      criteria,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[ERROR] Stock screening failed:', error.message);
    throw error;
  }
}

// Get single stock data with technical analysis
export async function getSingleStock(ticker) {
  try {
    console.log(`[INFO] Getting single stock data for: ${ticker}`);
    
    // Get snapshot
    const snapshot = await getSingleTickerSnapshot(ticker);
    
    if (!snapshot.results) {
      return null;
    }
    
    // Get historical data for technical analysis
    const fromDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];
    
    let technicals = null;
    try {
      const historicalResponse = await getHistoricalData(ticker, 'day', fromDate, toDate, 60);
      
      if (historicalResponse.results && historicalResponse.results.length > 0) {
        technicals = calculateTechnicalIndicators(historicalResponse.results);
      }
    } catch (error) {
      console.warn(`[WARN] Failed to get technical data for ${ticker}:`, error.message);
    }
    
    return {
      ...snapshot.results,
      technicals,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[ERROR] Failed to get single stock data for ${ticker}:`, error.message);
    throw error;
  }
}

// Calculate stock signals based on technical indicators
export function calculateTradingSignals(technicals) {
  if (!technicals) return null;
  
  const signals = {
    overall: 'neutral',
    strength: 0, // -3 to +3
    signals: []
  };
  
  // RSI signals
  if (technicals.rsi) {
    if (technicals.rsi < 30) {
      signals.signals.push({ type: 'oversold', indicator: 'RSI', value: technicals.rsi });
      signals.strength += 1;
    } else if (technicals.rsi > 70) {
      signals.signals.push({ type: 'overbought', indicator: 'RSI', value: technicals.rsi });
      signals.strength -= 1;
    }
  }
  
  // SMA signals
  if (technicals.priceVsSMA20 !== null) {
    if (technicals.priceVsSMA20 > 5) {
      signals.signals.push({ type: 'bullish', indicator: 'SMA20', value: `+${technicals.priceVsSMA20}%` });
      signals.strength += 1;
    } else if (technicals.priceVsSMA20 < -5) {
      signals.signals.push({ type: 'bearish', indicator: 'SMA20', value: `${technicals.priceVsSMA20}%` });
      signals.strength -= 1;
    }
  }
  
  // Volume signals
  if (technicals.volumeRatio > 2) {
    signals.signals.push({ type: 'high_volume', indicator: 'Volume', value: `${technicals.volumeRatio}x avg` });
    signals.strength += 0.5;
  }
  
  // MACD signals
  if (technicals.macd !== null) {
    if (technicals.macd > 0) {
      signals.signals.push({ type: 'bullish', indicator: 'MACD', value: technicals.macd });
      signals.strength += 0.5;
    } else if (technicals.macd < 0) {
      signals.signals.push({ type: 'bearish', indicator: 'MACD', value: technicals.macd });
      signals.strength -= 0.5;
    }
  }
  
  // Determine overall signal
  if (signals.strength >= 1.5) signals.overall = 'bullish';
  else if (signals.strength <= -1.5) signals.overall = 'bearish';
  
  return signals;
}