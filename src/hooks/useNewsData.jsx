// src/hooks/useNewsData.js - Updated with 8-hour prediction messaging and consistent field names
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
  const [persistentAnalyses, setPersistentAnalyses] = useState({}); // ✅ Store AI analyses separately

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
        
        // Add price data and merge with persistent analyses
        processedData.stocks = processedData.stocks.map(stock => {
          const snapshot = marketData.find(m => m.ticker === stock.ticker);
          
          // ✅ Get existing AI analysis for this ticker
          const existingAnalysis = persistentAnalyses[stock.ticker];
          
          return {
            ...stock,
            currentPrice: snapshot?.lastTrade?.p || snapshot?.day?.c || null,
            changePercent: snapshot?.todaysChangePerc || 0,
            volume: snapshot?.day?.v || 0,
            exchange: snapshot?.exchange || 'Unknown',
            // ✅ Preserve existing AI analysis
            buySignal: existingAnalysis || stock.buySignal || null
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
        console.log(`[INFO] Preserved ${Object.keys(persistentAnalyses).length} existing AI analyses`);
      }
      
      setNewsLoading(false);
      
    } catch (err) {
      console.error('[ERROR] Failed to fetch news data:', err);
      setError(err.message);
      setNewsLoading(false);
    }
  }, [applyPriceFilters, persistentAnalyses]);

  // ✅ UPDATED: 8-hour prediction analysis function that App.jsx can call
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
        console.log('[INFO] No candidate stocks for 8-hour prediction analysis');
        setAnalysisLoading(false);
        return;
      }

      console.log(`[INFO] Starting 8-hour prediction analysis of ${candidateStocks.length} stocks...`);
      const stocksWithBuySignals = await geminiService.batchAnalyzeStocks(candidateStocks);
      
      // ✅ Update persistent analyses state FIRST
      const newAnalyses = {};
      stocksWithBuySignals.forEach(stock => {
        if (stock.buySignal) {
          newAnalyses[stock.ticker] = stock.buySignal;
        }
      });
      
      // ✅ Update persistent analyses immediately
      setPersistentAnalyses(prev => {
        const updated = { ...prev, ...newAnalyses };
        console.log(`[INFO] Updated persistent analyses:`, Object.keys(updated));
        return updated;
      });
      
      // ✅ Also update current newsData with analyses immediately
      setNewsData(prevData => {
        if (!prevData) return prevData;
        
        // ✅ Merge with BOTH existing persistent analyses AND new analyses
        const allAnalyses = { ...persistentAnalyses, ...newAnalyses };
        
        const updatedStocks = prevData.stocks.map(stock => {
          const analysis = allAnalyses[stock.ticker];
          return analysis ? { ...stock, buySignal: analysis } : stock;
        });
        
        // Sort by buy signal strength
        updatedStocks.sort((a, b) => {
          if (a.buySignal && b.buySignal) {
            return b.buySignal.buyPercentage - a.buySignal.buyPercentage;
          }
          if (a.buySignal && !b.buySignal) return -1;
          if (!a.buySignal && b.buySignal) return 1;
          return a.latestMinutesAgo - b.latestMinutesAgo;
        });

        const aiSignals = updatedStocks
          .filter(stock => stock.buySignal && stock.buySignal.buyPercentage >= 40)
          .slice(0, 10);

        console.log(`[INFO] Updated newsData with ${updatedStocks.filter(s => s.buySignal).length} analyzed stocks`);

        return {
          ...prevData,
          stocks: updatedStocks,
          aiSignals,
          timestamp: new Date().toISOString()
        };
      });

      console.log(`[SUCCESS] 8-hour prediction analysis complete. ${Object.keys(newAnalyses).length} new predictions saved.`);
      
    } catch (error) {
      console.error('[ERROR] 8-hour prediction analysis failed:', error);
    } finally {
      setAnalysisLoading(false);
    }
  }, [newsData?.stocks, persistentAnalyses]);

  // ✅ UPDATED: Function to handle individual analysis completion with correct field names
  const updateSingleAnalysis = useCallback((ticker, result) => {
    console.log(`[INFO] Updating single 8-hour prediction for ${ticker}:`, result);
    
    // Update persistent analyses
    setPersistentAnalyses(prev => ({
      ...prev,
      [ticker]: result
    }));
    
    // Update current newsData
    setNewsData(prevData => {
      if (!prevData) return prevData;
      
      const updatedStocks = prevData.stocks.map(stock => {
        if (stock.ticker === ticker) {
          return { ...stock, buySignal: result };
        }
        return stock;
      });
      
      // Re-sort by buy signal strength
      updatedStocks.sort((a, b) => {
        if (a.buySignal && b.buySignal) {
          return b.buySignal.buyPercentage - a.buySignal.buyPercentage;
        }
        if (a.buySignal && !b.buySignal) return -1;
        if (!a.buySignal && b.buySignal) return 1;
        return a.latestMinutesAgo - b.latestMinutesAgo;
      });

      return {
        ...prevData,
        stocks: updatedStocks,
        timestamp: new Date().toISOString()
      };
    });
  }, []);

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
    performAnalysis, // ✅ Returns the 8-hour prediction analysis function
    updateSingleAnalysis, // ✅ Function to update individual analysis
    persistentAnalyses, // ✅ Expose persistent analyses
    clearAnalyses: () => setPersistentAnalyses({}), // ✅ Allow manual clearing
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice
  };
}