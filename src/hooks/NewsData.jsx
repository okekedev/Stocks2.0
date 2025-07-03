import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/PolygonService';
import { currentPriceService } from '../services/CurrentPriceService';
import { newsProcessor } from '../services/NewsProcessor';

export function useNewsData(refreshInterval = 5 * 60 * 1000) { // 5 minutes
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNewsData = useCallback(async () => {
    try {
      console.log('[INFO] Fetching latest market news...');
      setError(null);
      
      // Step 1: Get all recent market news (8-hour window to catch more news cycles)
      const rawNews = await polygonService.getAllMarketNews(8);
      
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
      
      // Debug: Check what articles we're getting
      console.log('[DEBUG] Sample articles:', rawNews.results.slice(0, 3).map(a => ({
        title: a.title,
        tickers: a.tickers,
        publishedUtc: a.published_utc
      })));
      
      // Step 2: Process news and extract Robinhood stocks
      const processedData = newsProcessor.processNewsForStocks(rawNews.results);
      
      // Debug: Check processing results
      console.log('[DEBUG] Processing results:', {
        totalArticles: rawNews.results.length,
        articlesWithValidTickers: processedData.articles.length,
        uniqueStocks: processedData.stocks.length,
        filteredOutArticles: rawNews.results.length - processedData.articles.length
      });
      
      // Step 3: Get current price and volume data for stocks with news
      if (processedData.stocks.length > 0) {
        console.log(`[INFO] Getting current market data for ${processedData.stocks.length} stocks...`);
        const tickers = processedData.stocks.map(s => s.ticker);
        
        // Use the new current price service
        const priceData = await currentPriceService.getCurrentPricesGrouped(tickers);
        
        // Create a map for faster lookups
        const priceMap = new Map(priceData.map(p => [p.ticker, p]));
        
        // Merge price data with news data
        processedData.stocks = processedData.stocks.map(stock => {
          const marketData = priceMap.get(stock.ticker);
          return {
            ...stock,
            currentPrice: marketData?.price || null,
            price: marketData?.price || null, // Add both for compatibility
            changePercent: marketData?.changePercent || 0,
            change: marketData?.change || 0,
            volume: marketData?.volume || 0,
            high: marketData?.high || null,
            low: marketData?.low || null,
            open: marketData?.open || null,
            exchange: 'NASDAQ' // Default since we don't have exchange info from price API
          };
        });
        
        console.log(`[INFO] Successfully merged price data for ${priceData.length} stocks`);
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