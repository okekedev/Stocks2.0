import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/polygonService';
import { newsProcessor } from '../services/newsProcessor';

export function useNewsData(refreshInterval = 5 * 60 * 1000) { // 5 minutes
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNewsData = useCallback(async () => {
    try {
      console.log('[INFO] Fetching latest market news...');
      setError(null);
      
      // Step 1: Get all recent market news (4-hour window)
      const rawNews = await polygonService.getAllMarketNews(4);
      
      if (!rawNews?.results?.length) {
        setNewsData({
          articles: [],
          stocks: [],
          totalArticles: 0,
          robinhoodStocks: 0,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`[INFO] Processing ${rawNews.results.length} articles...`);
      
      // Step 2: Process news and extract Robinhood stocks
      const processedData = newsProcessor.processNewsForStocks(rawNews.results);
      
      // Step 3: Get market data for stocks with news
      if (processedData.stocks.length > 0) {
        console.log(`[INFO] Getting market data for ${processedData.stocks.length} stocks...`);
        const tickers = processedData.stocks.map(s => s.ticker);
        const marketData = await polygonService.getMarketData(tickers);
        
        // Merge market data with news data
        processedData.stocks = processedData.stocks.map(stock => {
          const snapshot = marketData.find(m => m.ticker === stock.ticker);
          return {
            ...stock,
            currentPrice: snapshot?.lastTrade?.p || null,
            changePercent: snapshot?.todaysChangePerc || 0,
            volume: snapshot?.dailyBar?.v || 0,
            marketCap: snapshot?.marketCap || null,
            exchange: snapshot?.exchange || 'Unknown'
          };
        });
      }
      
      // Sort by impact and news count
      processedData.stocks.sort((a, b) => {
        if (Math.abs(a.avgImpact - b.avgImpact) > 0.1) {
          return b.avgImpact - a.avgImpact;
        }
        return b.newsCount - a.newsCount;
      });

      setNewsData({
        ...processedData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[INFO] Data updated: ${processedData.stocks.length} stocks with news`);
      
    } catch (err) {
      console.error('[ERROR] Failed to fetch news data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and setup interval
  useEffect(() => {
    fetchNewsData();
    
    const interval = setInterval(() => {
      console.log('[INFO] Auto-refreshing news data...');
      fetchNewsData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchNewsData, refreshInterval]);

  return {
    newsData,
    loading,
    error,
    refresh: fetchNewsData
  };
}

// =============================================================================
// services/polygonService.js - Direct API Calls
// =============================================================================

class PolygonService {
  constructor() {
    // API key stored in environment variable
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    
    if (!this.apiKey) {
      console.warn('[WARN] VITE_POLYGON_API_KEY not found in environment');
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

      console.log(`[INFO] Polygon API: ${endpoint}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[INFO] Polygon response: ${data.status}, count: ${data.count || 0}`);
      
      return data;
    } catch (error) {
      console.error(`[ERROR] Polygon API request failed:`, error);
      throw error;
    }
  }

  // Get all recent market news
  async getAllMarketNews(hours = 4) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();
    
    return this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate,
      'published_utc.lte': toDate
    });
  }

  // Get market snapshots for multiple tickers
  async getMarketData(tickers) {
    try {
      const batchSize = 250; // Polygon limit
      const allSnapshots = [];
      
      // Process in batches
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