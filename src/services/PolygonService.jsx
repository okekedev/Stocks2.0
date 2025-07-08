// src/services/PolygonService.js - Enhanced with Market Hours Detection & Price Fallback
class PolygonService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.cache = new Map(); // Price cache to reduce API calls
    this.cacheExpiry = 30000; // 30 seconds cache
    
    if (!this.apiKey) {
      throw new Error('VITE_POLYGON_API_KEY environment variable is required');
    }
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
      console.error(`[ERROR] API request failed:`, error);
      throw error;
    }
  }

  // ✅ NEW: Market Hours Detection
  isMarketOpen() {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const day = et.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Regular market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
    const marketClose = 16 * 60;    // 4:00 PM in minutes
    
    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  }

  // ✅ NEW: Get detailed market status
  getMarketStatus() {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const day = et.getDay();
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    if (day === 0 || day === 6) return 'weekend';
    
    const preMarket = 4 * 60;        // 4:00 AM
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;     // 4:00 PM
    const afterHours = 20 * 60;      // 8:00 PM
    
    if (timeInMinutes < preMarket) return 'closed';
    if (timeInMinutes < marketOpen) return 'premarket';
    if (timeInMinutes < marketClose) return 'open';
    if (timeInMinutes < afterHours) return 'afterhours';
    return 'closed';
  }

  // ✅ NEW: Get market status with additional info
  getDetailedMarketStatus() {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const status = this.getMarketStatus();
    
    return {
      status,
      isOpen: status === 'open',
      hasActiveTrading: ['open', 'premarket', 'afterhours'].includes(status),
      easternTime: et.toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
      easternDate: et.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
      timestamp: now.toISOString()
    };
  }

  // Get positive sentiment news only
  async getAllMarketNews(hours = 4) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const response = await this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate
    });
    
    // Filter for positive sentiment only
    if (response.results) {
      response.results = response.results.filter(article => 
        article.insights && 
        article.insights.some(insight => insight.sentiment === 'positive')
      );
    }
    
    return response;
  }

  // ✅ ENHANCED: Get previous day's closing price for a ticker
  async getPreviousDayClose(ticker, daysBack = 1) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysBack);
      
      // Keep going back until we find a trading day (skip weekends)
      while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        targetDate.setDate(targetDate.getDate() - 1);
      }
      
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${dateStr}/${dateStr}`);
      
      if (response.results?.[0]) {
        const bar = response.results[0];
        return {
          ticker,
          previousClose: bar.c,
          previousOpen: bar.o,
          previousHigh: bar.h,
          previousLow: bar.l,
          previousVolume: bar.v,
          date: dateStr,
          found: true
        };
      }
      
      return { ticker, found: false };
      
    } catch (error) {
      console.warn(`[WARN] Could not get previous close for ${ticker}:`, error.message);
      return { ticker, found: false, error: error.message };
    }
  }

  // ✅ NEW: Enhanced market data with fallback for closed market
  async getMarketDataWithFallback(tickers) {
    try {
      const now = Date.now();
      const marketStatus = this.getMarketStatus();
      const isMarketOpen = this.isMarketOpen();
      
      console.log(`[INFO] Market status: ${marketStatus}, fetching data for ${tickers.length} tickers`);
      
      // Get current/intraday data first
      const currentData = await this.getMarketData(tickers);
      
      // Find tickers without current prices
      const missingPriceTickers = tickers.filter(ticker => {
        const snapshot = currentData.find(m => m.ticker === ticker);
        const hasCurrentPrice = snapshot?.lastTrade?.p || snapshot?.day?.c;
        return !hasCurrentPrice;
      });
      
      if (missingPriceTickers.length > 0) {
        console.log(`[INFO] ${missingPriceTickers.length} tickers missing current prices, fetching previous close...`);
        
        // Get previous day closes for missing tickers
        const previousClosePromises = missingPriceTickers.map(ticker => 
          this.getPreviousDayClose(ticker)
        );
        
        const previousCloses = await Promise.allSettled(previousClosePromises);
        
        // Add synthetic snapshots with previous close data
        previousCloses.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.found) {
            const prevData = result.value;
            const ticker = missingPriceTickers[index];
            
            // Create synthetic snapshot
            currentData.push({
              ticker,
              day: {
                c: prevData.previousClose,
                o: prevData.previousOpen,
                h: prevData.previousHigh,
                l: prevData.previousLow,
                v: prevData.previousVolume
              },
              todaysChangePerc: 0, // No change yet (market closed)
              lastTrade: null,
              // ✅ Mark as previous close data
              isPreviousClose: true,
              previousCloseDate: prevData.date,
              marketStatus,
              dataSource: 'previous_close'
            });
            
            console.log(`[INFO] Added previous close for ${ticker}: $${prevData.previousClose}`);
          } else {
            console.warn(`[WARN] Could not get previous close for ${missingPriceTickers[index]}`);
          }
        });
      }
      
      // Add market status to all snapshots
      const enhancedData = currentData.map(snapshot => ({
        ...snapshot,
        marketStatus,
        isMarketOpen,
        dataTimestamp: now,
        hasLiveData: !snapshot.isPreviousClose
      }));
      
      console.log(`[SUCCESS] Enhanced market data: ${enhancedData.length} snapshots (${enhancedData.filter(s => s.isPreviousClose).length} using previous close)`);
      
      return enhancedData;
      
    } catch (error) {
      console.error('[ERROR] Failed to get market data with fallback:', error);
      return [];
    }
  }

  // ✅ OPTIMIZED: Efficient market data fetching with caching
  async getMarketData(tickers) {
    try {
      const now = Date.now();
      const uncachedTickers = [];
      const result = [];

      // Check cache first
      tickers.forEach(ticker => {
        const cached = this.cache.get(ticker);
        if (cached && (now - cached.timestamp) < this.cacheExpiry) {
          result.push(cached.data);
        } else {
          uncachedTickers.push(ticker);
        }
      });

      // Fetch uncached tickers
      if (uncachedTickers.length > 0) {
        console.log(`[PolygonService] Fetching fresh data for ${uncachedTickers.length} tickers`);
        
        // Split large requests to avoid API limits (max 100 per request)
        const chunks = [];
        for (let i = 0; i < uncachedTickers.length; i += 100) {
          chunks.push(uncachedTickers.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
            tickers: chunk.join(',')
          });
          
          if (response.tickers) {
            response.tickers.forEach(ticker => {
              // Cache the result
              this.cache.set(ticker.ticker, {
                data: ticker,
                timestamp: now
              });
              result.push(ticker);
            });
          }
        }
      } else {
        console.log(`[PolygonService] Using cached data for all ${tickers.length} tickers`);
      }

      return result;
    } catch (error) {
      console.error('[ERROR] Failed to get market data:', error);
      return [];
    }
  }

  // Get single ticker snapshot (for targeted updates)
  async getSingleTickerSnapshot(ticker) {
    try {
      const response = await this.makeRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
      return response.ticker || null;
    } catch (error) {
      console.error(`[ERROR] Failed to get snapshot for ${ticker}:`, error);
      return null;
    }
  }

  // Get company names for tickers
  async getCompanyNames(tickers) {
    const companyNames = new Map();
    
    try {
      const chunks = [];
      for (let i = 0; i < tickers.length; i += 100) {
        chunks.push(tickers.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const response = await this.makeRequest('/v3/reference/tickers', {
          ticker: chunk.join(','),
          market: 'stocks',
          active: true,
          limit: 1000
        });
        
        if (response.results) {
          response.results.forEach(result => {
            if (result.ticker && result.name) {
              companyNames.set(result.ticker, result.name);
            }
          });
        }
      }
      
    } catch (error) {
      console.error('[ERROR] Failed to fetch company names:', error);
    }
    
    return companyNames;
  }

  // ✅ NEW: Get last trading day (skips weekends and holidays)
  getLastTradingDay(daysBack = 1) {
    const date = new Date();
    let count = 0;
    
    while (count < daysBack) {
      date.setDate(date.getDate() - 1);
      
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        count++;
      }
    }
    
    return date.toISOString().split('T')[0];
  }

  // ✅ NEW: Batch get previous closes for multiple tickers
  async getBatchPreviousCloses(tickers, daysBack = 1) {
    const targetDate = this.getLastTradingDay(daysBack);
    const results = new Map();
    
    console.log(`[INFO] Fetching previous closes for ${tickers.length} tickers on ${targetDate}`);
    
    // Process in chunks to avoid overwhelming the API
    const chunks = [];
    for (let i = 0; i < tickers.length; i += 10) {
      chunks.push(tickers.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(ticker => this.getPreviousDayClose(ticker, daysBack));
      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach((result, index) => {
        const ticker = chunk[index];
        if (result.status === 'fulfilled' && result.value.found) {
          results.set(ticker, result.value);
        } else {
          results.set(ticker, { ticker, found: false, error: result.reason?.message });
        }
      });
      
      // Small delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const successCount = Array.from(results.values()).filter(r => r.found).length;
    console.log(`[INFO] Previous close fetch complete: ${successCount}/${tickers.length} successful`);
    
    return results;
  }

  // ✅ Clear cache manually if needed
  clearCache() {
    this.cache.clear();
    console.log('[PolygonService] Price cache cleared');
  }

  // ✅ Get cache stats
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      if ((now - entry.timestamp) < this.cacheExpiry) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheExpiryMs: this.cacheExpiry
    };
  }

  // ✅ NEW: Debug method to check market data availability
  async debugMarketData(ticker) {
    console.log(`[DEBUG] Checking market data for ${ticker}...`);
    
    const marketStatus = this.getDetailedMarketStatus();
    console.log('[DEBUG] Market Status:', marketStatus);
    
    try {
      // Try current snapshot
      const snapshot = await this.getSingleTickerSnapshot(ticker);
      console.log('[DEBUG] Current Snapshot:', snapshot);
      
      // Try previous close
      const prevClose = await this.getPreviousDayClose(ticker);
      console.log('[DEBUG] Previous Close:', prevClose);
      
      return {
        ticker,
        marketStatus,
        currentSnapshot: snapshot,
        previousClose: prevClose,
        recommendation: snapshot?.lastTrade?.p || snapshot?.day?.c ? 
          'Use current data' : 
          prevClose.found ? 'Use previous close' : 'No data available'
      };
      
    } catch (error) {
      console.error(`[DEBUG] Error checking ${ticker}:`, error);
      return {
        ticker,
        marketStatus,
        error: error.message
      };
    }
  }
}

export const polygonService = new PolygonService();