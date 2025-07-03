// src/services/PolygonService.js - Enhanced for efficient price polling
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
}

export const polygonService = new PolygonService();