// src/services/EnhancedTechnicalService.js - Focused on price/volume data for intraday trading
class EnhancedTechnicalService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
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
        throw new Error(`API request failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[ERROR] Technical analysis request failed:`, error);
      throw error;
    }
  }

  // Get comprehensive multi-timeframe price/volume data
  async getRawMarketData(ticker, hours = 6) {
    try {
      console.log(`[INFO] Fetching market data for ${ticker}...`);
      
      const now = new Date();
      const fromDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      // Format dates for Polygon API
      const from = fromDate.toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      
      // Get multiple timeframes in parallel
      const [minuteBars, fiveMinBars, hourlyBars] = await Promise.all([
        this.getMinuteBars(ticker, from, to, 1),   // 1-minute bars
        this.getMinuteBars(ticker, from, to, 5),   // 5-minute bars  
        this.getMinuteBars(ticker, from, to, 60),  // 1-hour bars
      ]);
      
      console.log(`[SUCCESS] Retrieved data for ${ticker}:`, {
        minute: minuteBars.length,
        fiveMin: fiveMinBars.length,
        hourly: hourlyBars.length
      });
      
      return {
        ticker,
        timeframes: {
          '1min': minuteBars,
          '5min': fiveMinBars, 
          '1hour': hourlyBars
        },
        metadata: {
          totalBars: minuteBars.length + fiveMinBars.length + hourlyBars.length,
          timespan: `${hours}h`,
          lastUpdate: now.toISOString()
        }
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to get market data for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        timeframes: { '1min': [], '5min': [], '1hour': [] },
        metadata: { totalBars: 0, timespan: `${hours}h`, lastUpdate: new Date().toISOString() }
      };
    }
  }

  // Get minute bars for specific timeframe
  async getMinuteBars(ticker, from, to, multiplier = 1) {
    try {
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/${multiplier}/minute/${from}/${to}`, {
        adjusted: true,
        sort: 'asc', // Chronological order for pattern detection
        limit: 50000
      });
      
      if (!response.results || response.results.length === 0) {
        return [];
      }
      
      // Return clean OHLCV data with timestamps
      return response.results.map(bar => ({
        timestamp: bar.t,
        datetime: new Date(bar.t).toISOString(),
        open: parseFloat(bar.o.toFixed(4)),
        high: parseFloat(bar.h.toFixed(4)), 
        low: parseFloat(bar.l.toFixed(4)),
        close: parseFloat(bar.c.toFixed(4)),
        volume: bar.v,
        vwap: parseFloat(bar.vw?.toFixed(4) || 0),
        trades: bar.n || 0
      }));
      
    } catch (error) {
      console.error(`[ERROR] Failed to get ${multiplier}min bars:`, error);
      return [];
    }
  }

  // Get recent daily data for context
  async getRecentDailyData(ticker, days = 10) {
    try {
      const now = new Date();
      const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const from = fromDate.toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`, {
        adjusted: true,
        sort: 'asc',
        limit: days
      });
      
      if (!response.results) return [];
      
      return response.results.map(bar => ({
        date: new Date(bar.t).toISOString().split('T')[0],
        timestamp: bar.t,
        open: parseFloat(bar.o.toFixed(4)),
        high: parseFloat(bar.h.toFixed(4)),
        low: parseFloat(bar.l.toFixed(4)), 
        close: parseFloat(bar.c.toFixed(4)),
        volume: bar.v,
        vwap: parseFloat(bar.vw?.toFixed(4) || 0)
      }));
      
    } catch (error) {
      console.error(`[ERROR] Failed to get daily data:`, error);
      return [];
    }
  }

  // Main analysis function - focused on price/volume patterns
  async analyzeStockForAI(ticker) {
    try {
      console.log(`[INFO] Starting AI data collection for ${ticker}`);
      
      // Get essential data for intraday pattern recognition
      const [rawData, dailyData] = await Promise.all([
        this.getRawMarketData(ticker, 6), // 6 hours of intraday data
        this.getRecentDailyData(ticker, 10) // 10 days of daily context
      ]);
      
      const totalDataPoints = rawData.metadata.totalBars + dailyData.length;
      
      if (totalDataPoints === 0) {
        return {
          ticker,
          error: 'No market data available',
          hasData: false,
          dataPoints: 0
        };
      }
      
      // Calculate basic statistics for context
      const current1min = rawData.timeframes['1min'];
      const currentPrice = current1min.length > 0 ? current1min[current1min.length - 1].close : null;
      
      const todayOpen = current1min.length > 0 ? current1min[0].open : null;
      const todayChange = currentPrice && todayOpen ? ((currentPrice - todayOpen) / todayOpen) * 100 : null;
      
      // Package everything for AI analysis (focused on price/volume)
      const result = {
        ticker,
        hasData: true,
        dataPoints: totalDataPoints,
        
        // Current state
        currentPrice,
        todayChangePercent: todayChange,
        
        // Raw data for AI pattern recognition (price/volume focus)
        rawTimeframes: rawData.timeframes,
        recentDays: dailyData,
        
        // Metadata for AI context
        dataQuality: {
          minuteBars: rawData.timeframes['1min'].length,
          fiveMinBars: rawData.timeframes['5min'].length, 
          hourlyBars: rawData.timeframes['1hour'].length,
          dailyBars: dailyData.length,
          timespan: '6h intraday + 10d daily',
          focus: 'price_volume_patterns'
        },
        
        timestamp: new Date().toISOString()
      };
      
      console.log(`[SUCCESS] Price/volume data ready for ${ticker}:`, {
        totalDataPoints,
        currentPrice,
        todayChange: todayChange?.toFixed(2) + '%'
      });
      
      return result;
      
    } catch (error) {
      console.error(`[ERROR] AI data collection failed for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        hasData: false,
        dataPoints: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Batch analysis for multiple stocks
  async batchAnalyzeForAI(tickers, maxConcurrent = 3) {
    const results = [];
    
    console.log(`[INFO] Starting batch AI data collection for ${tickers.length} stocks`);
    
    for (let i = 0; i < tickers.length; i += maxConcurrent) {
      const batch = tickers.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(ticker => this.analyzeStockForAI(ticker));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Rate limiting delay
      if (i + maxConcurrent < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successfulResults = results.filter(r => r.hasData);
    console.log(`[SUCCESS] Batch analysis complete: ${successfulResults.length}/${tickers.length} successful`);
    
    return results;
  }
}

export const enhancedTechnicalService = new EnhancedTechnicalService();