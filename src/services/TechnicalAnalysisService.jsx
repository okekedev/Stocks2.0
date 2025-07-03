// src/services/TechnicalAnalysisService.js - Comprehensive Stock Data for AI Analysis
class TechnicalAnalysisService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = new URL(endpoint, this.baseUrl);
      url.searchParams.set('apikey', this.apiKey);
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[ERROR] Technical Analysis API request failed:`, error);
      throw error;
    }
  }

  // Check cache for fresh data
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  // Store data in cache
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get comprehensive market snapshot with enhanced data
  async getMarketSnapshot(ticker) {
    const cacheKey = `snapshot_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
      
      const snapshot = response.ticker;
      if (!snapshot) {
        throw new Error(`No snapshot data found for ${ticker}`);
      }

      const enhancedSnapshot = {
        ticker: snapshot.ticker,
        currentPrice: snapshot.lastTrade?.p || snapshot.day?.c,
        previousClose: snapshot.prevDay?.c,
        dayChange: snapshot.todaysChange,
        dayChangePercent: snapshot.todaysChangePerc,
        
        // Intraday data
        dayOpen: snapshot.day?.o,
        dayHigh: snapshot.day?.h,
        dayLow: snapshot.day?.l,
        dayVolume: snapshot.day?.v,
        dayVWAP: snapshot.day?.vw, // Volume Weighted Average Price if available
        
        // Previous day comparison
        prevDayVolume: snapshot.prevDay?.v,
        volumeRatio: snapshot.day?.v && snapshot.prevDay?.v ? 
          snapshot.day.v / snapshot.prevDay.v : null,
        
        // Trading session data
        session: {
          regular: {
            change: snapshot.day?.c - snapshot.day?.o,
            changePercent: snapshot.day?.o ? 
              ((snapshot.day.c - snapshot.day.o) / snapshot.day.o) * 100 : null
          },
          extended: snapshot.afterHours || snapshot.preMarket || null
        },

        // Market metadata
        exchange: snapshot.exchange,
        marketStatus: snapshot.market_status,
        lastUpdated: snapshot.updated || Date.now()
      };

      this.setCachedData(cacheKey, enhancedSnapshot);
      return enhancedSnapshot;

    } catch (error) {
      console.error(`[ERROR] Failed to get market snapshot for ${ticker}:`, error);
      throw error;
    }
  }

  // Get Simple Moving Averages (short-term focus for day trading)
  async getSMAData(ticker) {
    const cacheKey = `sma_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Only get short-term SMAs for day trading (5, 10, 20 day max)
      const smaPromises = [
        this.makeRequest(`/v1/indicators/sma/${ticker}`, {
          window: 5,
          series_type: 'close',
          timespan: 'day',
          limit: 1,
          order: 'desc'
        }),
        this.makeRequest(`/v1/indicators/sma/${ticker}`, {
          window: 10,
          series_type: 'close',
          timespan: 'day',
          limit: 1,
          order: 'desc'
        }),
        this.makeRequest(`/v1/indicators/sma/${ticker}`, {
          window: 20,
          series_type: 'close',
          timespan: 'day',
          limit: 1,
          order: 'desc'
        })
      ];

      const [sma5, sma10, sma20] = await Promise.all(smaPromises);

      const smaData = {
        sma5: sma5.results?.values?.[0]?.value || null,
        sma10: sma10.results?.values?.[0]?.value || null,
        sma20: sma20.results?.values?.[0]?.value || null,
        timestamp: sma20.results?.values?.[0]?.timestamp || null
      };

      this.setCachedData(cacheKey, smaData);
      return smaData;

    } catch (error) {
      console.error(`[ERROR] Failed to get SMA data for ${ticker}:`, error);
      return { sma5: null, sma10: null, sma20: null };
    }
  }

  // Get Exponential Moving Averages
  async getEMAData(ticker) {
    const cacheKey = `ema_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const emaPromises = [
        this.makeRequest(`/v1/indicators/ema/${ticker}`, {
          window: 12,
          series_type: 'close',
          timespan: 'day',
          limit: 1,
          order: 'desc'
        }),
        this.makeRequest(`/v1/indicators/ema/${ticker}`, {
          window: 26,
          series_type: 'close',
          timespan: 'day',
          limit: 1,
          order: 'desc'
        })
      ];

      const [ema12, ema26] = await Promise.all(emaPromises);

      const emaData = {
        ema12: ema12.results?.values?.[0]?.value || null,
        ema26: ema26.results?.values?.[0]?.value || null,
        timestamp: ema12.results?.values?.[0]?.timestamp || null
      };

      this.setCachedData(cacheKey, emaData);
      return emaData;

    } catch (error) {
      console.error(`[ERROR] Failed to get EMA data for ${ticker}:`, error);
      return { ema12: null, ema26: null };
    }
  }

  // Get MACD data
  async getMACDData(ticker) {
    const cacheKey = `macd_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/v1/indicators/macd/${ticker}`, {
        short_window: 12,
        long_window: 26,
        signal_window: 9,
        series_type: 'close',
        timespan: 'day',
        limit: 5, // Get last 5 days to see trend
        order: 'desc'
      });

      const values = response.results?.values || [];
      const latest = values[0];
      const previous = values[1];

      const macdData = {
        macd: latest?.value || null,
        signal: latest?.signal || null,
        histogram: latest?.histogram || null,
        
        // Trend analysis
        macdTrend: latest && previous ? 
          (latest.value > previous.value ? 'bullish' : 'bearish') : null,
        signalCrossover: latest && previous ?
          this.detectMACDCrossover(latest, previous) : null,
        
        timestamp: latest?.timestamp || null
      };

      this.setCachedData(cacheKey, macdData);
      return macdData;

    } catch (error) {
      console.error(`[ERROR] Failed to get MACD data for ${ticker}:`, error);
      return { macd: null, signal: null, histogram: null };
    }
  }

  // Get RSI data
  async getRSIData(ticker) {
    const cacheKey = `rsi_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/v1/indicators/rsi/${ticker}`, {
        window: 14,
        series_type: 'close',
        timespan: 'day',
        limit: 3, // Get last 3 days to see trend
        order: 'desc'
      });

      const values = response.results?.values || [];
      const latest = values[0];
      const previous = values[1];

      const rsiData = {
        rsi: latest?.value || null,
        rsiTrend: latest && previous ? 
          (latest.value > previous.value ? 'rising' : 'falling') : null,
        timestamp: latest?.timestamp || null
      };

      this.setCachedData(cacheKey, rsiData);
      return rsiData;

    } catch (error) {
      console.error(`[ERROR] Failed to get RSI data for ${ticker}:`, error);
      return { rsi: null };
    }
  }

  // Get recent trade activity and volume analysis
  async getVolumeAnalysis(ticker) {
    const cacheKey = `volume_${ticker}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get recent trades to analyze volume patterns
      const response = await this.makeRequest(`/v3/trades/${ticker}`, {
        limit: 100,
        order: 'desc'
      });

      const trades = response.results || [];
      if (trades.length === 0) {
        return { volumeSpike: false, averageTradeSize: null, tradingIntensity: 'low' };
      }

      // Calculate volume metrics
      const totalVolume = trades.reduce((sum, trade) => sum + (trade.size || 0), 0);
      const averageTradeSize = totalVolume / trades.length;
      const largeTradesCount = trades.filter(trade => trade.size > averageTradeSize * 2).length;
      
      const volumeAnalysis = {
        totalRecentVolume: totalVolume,
        averageTradeSize: Math.round(averageTradeSize),
        largeTradesPercentage: (largeTradesCount / trades.length) * 100,
        volumeSpike: largeTradesCount > trades.length * 0.3, // 30% large trades = spike
        lastTradeTimestamp: trades[0]?.participant_timestamp || null
      };

      this.setCachedData(cacheKey, volumeAnalysis);
      return volumeAnalysis;

    } catch (error) {
      console.error(`[ERROR] Failed to get volume analysis for ${ticker}:`, error);
      return { volumeSpike: false };
    }
  }

  // Helper: Detect MACD crossover signals
  detectMACDCrossover(current, previous) {
    if (!current || !previous) return null;
    
    const currentAbove = current.value > current.signal;
    const previousAbove = previous.value > previous.signal;
    
    if (currentAbove && !previousAbove) return 'bullish_crossover';
    if (!currentAbove && previousAbove) return 'bearish_crossover';
    return 'no_crossover';
  }

  // MAIN METHOD: Get comprehensive analysis data for AI
  async getComprehensiveAnalysis(ticker, newsData = null) {
    console.log(`[INFO] Fetching comprehensive analysis for ${ticker}...`);
    
    try {
      // Fetch all data in parallel for speed
      const [
        marketSnapshot,
        smaData,
        emaData,
        macdData,
        rsiData,
        volumeAnalysis
      ] = await Promise.all([
        this.getMarketSnapshot(ticker),
        this.getSMAData(ticker),
        this.getEMAData(ticker),
        this.getMACDData(ticker),
        this.getRSIData(ticker),
        this.getVolumeAnalysis(ticker)
      ]);

      // Compile comprehensive analysis object
      const comprehensiveData = {
        // Basic Info
        ticker,
        timestamp: new Date().toISOString(),
        
        // Price & Market Data
        price: {
          current: marketSnapshot.currentPrice,
          previousClose: marketSnapshot.previousClose,
          dayChange: marketSnapshot.dayChange,
          dayChangePercent: marketSnapshot.dayChangePercent,
          dayRange: {
            open: marketSnapshot.dayOpen,
            high: marketSnapshot.dayHigh,
            low: marketSnapshot.dayLow
          },
          session: marketSnapshot.session
        },

        // Volume Analysis
        volume: {
          current: marketSnapshot.dayVolume,
          previous: marketSnapshot.prevDayVolume,
          ratio: marketSnapshot.volumeRatio,
          vwap: marketSnapshot.dayVWAP,
          analysis: volumeAnalysis
        },

        // Technical Indicators
        technicals: {
          sma: smaData,
          ema: emaData,
          macd: macdData,
          rsi: rsiData
        },

        // Market Context
        market: {
          exchange: marketSnapshot.exchange,
          status: marketSnapshot.marketStatus,
          lastUpdated: marketSnapshot.lastUpdated
        },

        // News Context (if provided)
        news: newsData ? {
          latestTitle: newsData.latestNews?.title,
          minutesAgo: newsData.latestNews?.minutesAgo,
          sentiment: newsData.latestNews?.sentiment,
          newsCount: newsData.newsCount,
          articles: newsData.articles?.slice(0, 3) // Include top 3 articles
        } : null,

        // Derived Insights for AI
        insights: this.generateInsights(marketSnapshot, smaData, emaData, macdData, rsiData, volumeAnalysis)
      };

      console.log(`[SUCCESS] Comprehensive analysis complete for ${ticker}`);
      return comprehensiveData;

    } catch (error) {
      console.error(`[ERROR] Failed to get comprehensive analysis for ${ticker}:`, error);
      throw error;
    }
  }

  // Generate key insights for AI interpretation (short-term focus)
  generateInsights(market, sma, ema, macd, rsi, volume) {
    const insights = {
      // Only short-term trend for day trading
      trend: {
        immediate: market.currentPrice && sma.sma5 ? 
          (market.currentPrice > sma.sma5 ? 'bullish' : 'bearish') : 'unknown',
        short: market.currentPrice && sma.sma10 ? 
          (market.currentPrice > sma.sma10 ? 'bullish' : 'bearish') : 'unknown'
      },
      momentum: {
        rsi: rsi.rsi || null,
        macd: macd.macdTrend || 'unknown'
      },
      signals: {
        macdCrossover: macd.signalCrossover || 'none',
        volumeSpike: volume.volumeSpike || false,
        rsiExtreme: rsi.rsi ? (rsi.rsi > 70 || rsi.rsi < 30) : false
      }
    };

    return insights;
  }

  // Clear cache (useful for forced refresh)
  clearCache() {
    this.cache.clear();
    console.log('[INFO] Technical analysis cache cleared');
  }
}

export const technicalAnalysisService = new TechnicalAnalysisService();