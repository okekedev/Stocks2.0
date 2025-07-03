// src/hooks/useNewsData.js - Updated to return performAnalysis function
import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/PolygonService';
import { newsProcessor } from '../services/NewsProcessor';
import { geminiService } from '../services/GeminiService';

export function useNewsData(refreshInterval = 5 * 60 * 1000) {
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPerformed, setAnalysisPerformed] = useState(false);
  const [error, setError] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const applyPriceFilters = useCallback((stocks) => {
    if (!stocks || stocks.length === 0) return stocks;
    
    const min = minPrice === '' ? 0 : parseFloat(minPrice) || 0;
    const max = maxPrice === '' ? Infinity : parseFloat(maxPrice) || Infinity;
    
    return stocks.filter(stock => {
      if (!stock.currentPrice) return false;
      return stock.currentPrice >= min && stock.currentPrice <= max;
    });
  }, [minPrice, maxPrice]);

  const fetchNewsData = useCallback(async () => {
    try {
      setNewsLoading(true);
      setError(null);
      
      console.log('[INFO] Starting optimized news fetch...');
      
      // Step 1: Get all news from last 4 hours
      const rawNews = await polygonService.getAllMarketNews(4);
      
      if (!rawNews?.results?.length) {
        setNewsData({
          articles: [],
          stocks: [],
          totalArticles: 0,
          recentArticles: 0,
          positiveStocks: 0,
          aiSignals: null,
          timestamp: new Date().toISOString()
        });
        setNewsLoading(false);
        return;
      }

      // Step 2: Process news with enhanced ticker extraction and positive filtering
      const processedData = await newsProcessor.processNewsForStocks(rawNews.results);
      
      // Step 3: Get current prices for all positive stocks
      if (processedData.stocks.length > 0) {
        const tickers = processedData.stocks.map(s => s.ticker);
        const marketData = await polygonService.getMarketData(tickers);
        
        // Add price data
        processedData.stocks = processedData.stocks.map(stock => {
          const snapshot = marketData.find(m => m.ticker === stock.ticker);
          
          return {
            ...stock,
            currentPrice: snapshot?.lastTrade?.p || snapshot?.day?.c || null,
            changePercent: snapshot?.todaysChangePerc || 0,
            volume: snapshot?.day?.v || 0,
            exchange: snapshot?.exchange || 'Unknown'
          };
        });
        
        const allStocks = [...processedData.stocks];
        const filteredStocks = applyPriceFilters(processedData.stocks);
        
        setNewsData({
          ...processedData,
          stocks: filteredStocks,
          allStocks: allStocks,
          aiSignals: null,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[SUCCESS] Loaded ${filteredStocks.length} positive stocks from last 4 hours`);
      }
      
      setNewsLoading(false);
      
    } catch (err) {
      console.error('[ERROR] Failed to fetch news data:', err);
      setError(err.message);
      setNewsLoading(false);
    }
  }, [applyPriceFilters]);

  // ✅ AI Analysis function that App.jsx can call
  const performAnalysis = useCallback(async (stocksToAnalyze = null) => {
    try {
      setAnalysisLoading(true);
      setAnalysisPerformed(true);
      
      // Use provided stocks or default to newsData stocks
      const stocks = stocksToAnalyze || newsData?.stocks || [];
      
      // Only analyze very recent stocks (last 2 hours)
      const candidateStocks = stocks.filter(stock => 
        stock.latestNews?.minutesAgo < 120 && 
        stock.currentPrice && 
        stock.articles.length > 0
      );
      
      if (candidateStocks.length === 0) {
        console.log('[INFO] No candidate stocks for AI analysis');
        setAnalysisLoading(false);
        return;
      }

      console.log(`[INFO] Starting AI analysis of ${candidateStocks.length} stocks...`);
      const stocksWithBuySignals = await geminiService.batchAnalyzeStocks(candidateStocks);
      
      const aiStockMap = new Map(stocksWithBuySignals.map(stock => [stock.ticker, stock]));
      const aiEnhancedStocks = stocks.map(stock => aiStockMap.get(stock.ticker) || stock);
      
      // Sort by buy signal strength
      aiEnhancedStocks.sort((a, b) => {
        if (a.buySignal && b.buySignal) {
          return b.buySignal.buyPercentage - a.buySignal.buyPercentage;
        }
        if (a.buySignal && !b.buySignal) return -1;
        if (!a.buySignal && b.buySignal) return 1;
        return a.latestMinutesAgo - b.latestMinutesAgo; // Most recent first
      });

      const aiSignals = aiEnhancedStocks
        .filter(stock => stock.buySignal && stock.buySignal.buyPercentage >= 40)
        .slice(0, 10);

      setNewsData(prevData => ({
        ...prevData,
        stocks: aiEnhancedStocks,
        aiSignals,
        timestamp: new Date().toISOString()
      }));

      console.log(`[SUCCESS] AI analysis complete. ${aiSignals.length} trading signals found.`);
      
    } catch (error) {
      console.error('[ERROR] AI analysis failed:', error);
    } finally {
      setAnalysisLoading(false);
    }
  }, [newsData?.stocks]);

  useEffect(() => {
    fetchNewsData();
    
    const interval = setInterval(() => {
      fetchNewsData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchNewsData, refreshInterval]);

  return {
    newsData,
    newsLoading,
    analysisLoading,
    analysisPerformed,
    error,
    refresh: fetchNewsData,
    performAnalysis, // ✅ Now returns the analysis function
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice
  };
}