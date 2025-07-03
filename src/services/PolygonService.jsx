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
      
      // Add API key and params
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
      console.error(`[ERROR] API request failed:`, error);
      throw error;
    }
  }

  // Get all recent market news
  async getAllMarketNews(hours = 4) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate.toISOString()
    });
  }

  // Get market data for stocks with news
  async getMarketData(tickers) {
    try {
      const batchSize = 250;
      const allSnapshots = [];
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        
        const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
          tickers: batch.join(',')
        });
        
        if (response.tickers) {
          allSnapshots.push(...response.tickers);
        }
        
        // Small delay between batches
        if (i + batchSize < tickers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return allSnapshots;
    } catch (error) {
      console.error('[ERROR] Failed to get market data:', error);
      return [];
    }
  }
}

export const polygonService = new PolygonService();