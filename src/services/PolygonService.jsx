// src/services/PolygonService.js - Add method for individual ticker updates
class PolygonService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    
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

  // Get market snapshots for pricing (optimized for real-time updates)
  async getMarketData(tickers) {
    try {
      // Split large requests to avoid API limits
      const chunks = [];
      for (let i = 0; i < tickers.length; i += 100) {
        chunks.push(tickers.slice(i, i + 100));
      }

      const allData = [];
      for (const chunk of chunks) {
        const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
          tickers: chunk.join(',')
        });
        
        if (response.tickers) {
          allData.push(...response.tickers);
        }
      }

      return allData;
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
}

export const polygonService = new PolygonService();