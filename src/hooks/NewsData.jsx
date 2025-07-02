import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/PolygonService';
import { newsProcessor } from '../services/NewsProcessor';

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