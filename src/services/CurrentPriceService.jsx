class CurrentPriceService {
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

      console.log(`[INFO] Current Price API call: ${endpoint}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[INFO] Current Price API response: ${data.status}, results: ${data.results?.length || 0}`);
      
      return data;
    } catch (error) {
      console.error(`[ERROR] Current Price API request failed:`, error);
      throw error;
    }
  }

  // Get current price and volume for a single ticker
  async getCurrentPrice(ticker) {
    try {
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/prev`, {
        adjusted: 'true'
      });
      
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        return {
          ticker: ticker,
          price: result.c, // close price
          volume: result.v, // volume
          high: result.h, // high
          low: result.l, // low
          open: result.o, // open
          change: result.c - result.o, // change from open
          changePercent: ((result.c - result.o) / result.o) * 100,
          timestamp: result.t
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[ERROR] Failed to get current price for ${ticker}:`, error);
      return null;
    }
  }

  // Get current prices for multiple tickers (batch processing)
  async getCurrentPrices(tickers) {
    console.log(`[INFO] Getting current prices for ${tickers.length} tickers...`);
    
    const results = [];
    const batchSize = 5; // Process 5 at a time to avoid rate limits
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(ticker => this.getCurrentPrice(ticker));
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
        }
      });
      
      // Small delay between batches to be respectful of API limits
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[INFO] Successfully got prices for ${results.length}/${tickers.length} tickers`);
    return results;
  }

  // Alternative method using grouped bars API (might be more efficient)
  async getCurrentPricesGrouped(tickers) {
    try {
      // Get previous day's data for all tickers
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const response = await this.makeRequest('/v2/aggs/grouped/locale/us/market/stocks/' + dateStr, {
        adjusted: 'true',
        include_otc: 'false'
      });
      
      if (response.results) {
        // Filter to only the tickers we care about and format the data
        const tickerSet = new Set(tickers.map(t => t.toUpperCase()));
        
        return response.results
          .filter(result => tickerSet.has(result.T))
          .map(result => ({
            ticker: result.T,
            price: result.c, // close price
            volume: result.v, // volume
            high: result.h, // high
            low: result.l, // low
            open: result.o, // open
            change: result.c - result.o, // change from open
            changePercent: ((result.c - result.o) / result.o) * 100,
            timestamp: result.t
          }));
      }
      
      return [];
    } catch (error) {
      console.error('[ERROR] Failed to get grouped current prices:', error);
      // Fallback to individual requests
      return this.getCurrentPrices(tickers);
    }
  }
}

export const currentPriceService = new CurrentPriceService();