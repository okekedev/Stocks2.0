// src/services/PolygonService.js - Simple version
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
  async getAllMarketNews(hours = 8) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const response = await this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate
    });
    
    // Filter for positive sentiment only - let NewsProcessor handle ticker filtering
    if (response.results) {
      response.results = response.results.filter(article => 
        article.insights && 
        article.insights.some(insight => insight.sentiment === 'positive')
      );
    }
    
    return response;
  }

  // Get market snapshots for pricing
  async getMarketData(tickers) {
    try {
      const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
        tickers: tickers.join(',')
      });
      
      return response.tickers || [];
    } catch (error) {
      console.error('[ERROR] Failed to get market data:', error);
      return [];
    }
  }
}

export const polygonService = new PolygonService();