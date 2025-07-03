// src/hooks/useNewsData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { polygonService } from '../services/PolygonService';
import { newsProcessor } from '../services/NewsProcessor';
import { geminiService } from '../services/GeminiService';
import { articleFetcher } from '../services/ArticleFetcher';

export function useNewsData(refreshInterval = 5 * 60 * 1000) {
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false); // For news fetching
  const [analysisLoading, setAnalysisLoading] = useState(false); // For AI analysis
  const [analysisPerformed, setAnalysisPerformed] = useState(false); // Track if analysis was run
  const [error, setError] = useState(null);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(false); // Changed to false
  const [minPrice, setMinPrice] = useState(''); // Minimum stock price filter
  const [maxPrice, setMaxPrice] = useState(''); // Maximum stock price filter
  
  const lastProcessedArticles = useRef(new Set()); // Cache processed article IDs
  const isInitialLoad = useRef(true);

  // Function to apply price filters to existing data
  const applyPriceFilters = useCallback((stocks) => {
    if (!stocks || stocks.length === 0) return stocks;
    
    const min = minPrice === '' ? 0 : parseFloat(minPrice) || 0;
    const max = maxPrice === '' ? Infinity : parseFloat(maxPrice) || Infinity;
    
    return stocks.filter(stock => {
      if (!stock.currentPrice) return false;
      return stock.currentPrice >= min && stock.currentPrice <= max;
    });
  }, [minPrice, maxPrice]);

  // Update filtered stocks when price filters change
  useEffect(() => {
    if (newsData && newsData.allStocks) {
      const filteredStocks = applyPriceFilters(newsData.allStocks);
      setNewsData(prevData => ({
        ...prevData,
        stocks: filteredStocks
      }));
    }
  }, [minPrice, maxPrice, applyPriceFilters, newsData?.allStocks]);

  const fetchNewsData = useCallback(async (triggerAnalysis = false) => {
    try {
      console.log('[INFO] 🚀 Fetching latest news...');
      setError(null);
      
      if (isInitialLoad.current) {
        setNewsLoading(true);
        isInitialLoad.current = false;
      }
      
      // Step 1: Get positive sentiment news only
      const rawNews = await polygonService.getAllMarketNews(4);
      
      if (!rawNews?.results?.length) {
        setNewsData({
          articles: [],
          stocks: [],
          totalArticles: 0,
          positiveArticles: 0,
          robinhoodStocks: 0,
          aiSignals: null, // Changed from [] to null
          timestamp: new Date().toISOString()
        });
        setNewsLoading(false);
        return;
      }

      // Check if we have new articles
      const currentArticleIds = new Set(rawNews.results.map(article => article.id));
      const hasNewArticles = !Array.from(currentArticleIds).every(id => 
        lastProcessedArticles.current.has(id)
      );

      if (!hasNewArticles && newsData && !triggerAnalysis) {
        console.log('[INFO] 📰 No new articles found, skipping processing');
        setNewsLoading(false);
        return;
      }

      // Update cache
      lastProcessedArticles.current = currentArticleIds;

      const totalArticles = rawNews.results.length;
      console.log(`[INFO] 📰 Processing ${totalArticles} positive Robinhood articles...`);
      
      // Step 2: Process news and extract tradeable stocks
      const processedData = newsProcessor.processNewsForStocks(rawNews.results);
      
      // Initialize variables
      let allStocks = processedData.stocks;
      let filteredStocks = processedData.stocks;
      
      // Step 3: Get current market data and apply price filters
      if (processedData.stocks.length > 0) {
        console.log(`[INFO] 📊 Getting market data for ${processedData.stocks.length} stocks...`);
        const tickers = processedData.stocks.map(s => s.ticker);
        const marketData = await polygonService.getMarketData(tickers);
        
        console.log('[DEBUG] Sample market data:', marketData.slice(0, 2));
        
        // Merge market data
        processedData.stocks = processedData.stocks.map(stock => {
          const snapshot = marketData.find(m => m.ticker === stock.ticker);
          
          if (snapshot) {
            console.log(`[DEBUG] ${stock.ticker} snapshot:`, {
              ticker: snapshot.ticker,
              lastTrade: snapshot.lastTrade,
              todaysChangePerc: snapshot.todaysChangePerc,
              dailyBar: snapshot.dailyBar,
              day: snapshot.day,
              prevDay: snapshot.prevDay,
              lastQuote: snapshot.lastQuote
            });
          }
          
          return {
            ...stock,
            currentPrice: snapshot?.lastTrade?.p || 
                         snapshot?.prevDay?.c || 
                         snapshot?.day?.c || 
                         snapshot?.lastQuote?.p || 
                         null,
            changePercent: snapshot?.todaysChangePerc || 
                          snapshot?.day?.changePercent || 
                          0,
            volume: snapshot?.dailyBar?.v || 
                   snapshot?.day?.v || 
                   0,
            marketCap: snapshot?.marketCap || null,
            exchange: snapshot?.exchange || 'Unknown',
            rawSnapshot: snapshot ? 'Found' : 'Missing'
          };
        });
        
        // Apply price filters
        const beforePriceFilter = processedData.stocks.length;
        allStocks = [...processedData.stocks]; // Keep original list
        filteredStocks = applyPriceFilters(processedData.stocks);
        
        console.log(`[INFO] 💰 Price filter applied: ${beforePriceFilter} → ${filteredStocks.length} stocks (${minPrice || '0'}-${maxPrice || '∞'})`);
        
        // Debug: Show which stocks got pricing data
        const stocksWithPrices = processedData.stocks.filter(s => s.currentPrice);
        const stocksWithoutPrices = processedData.stocks.filter(s => !s.currentPrice);
        
        console.log(`[DEBUG] Stocks with prices: ${stocksWithPrices.length}/${processedData.stocks.length}`);
        if (stocksWithoutPrices.length > 0) {
          console.log('[DEBUG] Stocks missing prices:', stocksWithoutPrices.map(s => s.ticker));
        }
      }

      // Set initial data without AI analysis
      setNewsData({
        ...processedData,
        stocks: filteredStocks,
        allStocks: allStocks, // Keep unfiltered list for re-filtering
        aiSignals: null, // Changed from [] to null to indicate no analysis performed
        aiAnalysisEnabled,
        totalArticles,
        positiveArticles: totalArticles,
        polygonFiltered: true,
        timestamp: new Date().toISOString()
      });
      
      setNewsLoading(false);

      // Step 4: AI Analysis Pipeline (only if explicitly triggered)
      if (triggerAnalysis && filteredStocks.length > 0) {
        await performAIAnalysis(filteredStocks);
      }
      
    } catch (err) {
      console.error('[ERROR] 💥 Failed to fetch news data:', err);
      setError(err.message);
      setNewsLoading(false);
      setAnalysisLoading(false);
    }
  }, [minPrice, maxPrice, newsData, applyPriceFilters]);

  const performAIAnalysis = async (stocks) => {
    try {
      setAnalysisLoading(true);
      setAnalysisPerformed(true); // Mark that analysis has been performed
      console.log('[INFO] 🤖 Starting AI analysis pipeline...');
      
      // Filter candidates for deep analysis
      const candidateStocks = stocks.filter(stock => 
        stock.latestNews?.minutesAgo < 120 && // Recent news (2 hours)
        stock.currentPrice && // Has price data
        stock.articles.length > 0 // Has articles
      );
      
      if (candidateStocks.length === 0) {
        console.log('[INFO] No candidates for AI analysis');
        setAnalysisLoading(false);
        return;
      }

      console.log(`[INFO] 🎯 AI analyzing ${candidateStocks.length} candidate stocks...`);
      
      // Step 4a: Fetch full article content
      const articlesWithContent = await Promise.all(
        candidateStocks.map(async (stock) => {
          try {
            const latestArticle = stock.latestNews;
            console.log(`[INFO] 📖 Fetching content for ${stock.ticker}: ${latestArticle.title.substring(0, 50)}...`);
            
            const fullContent = await articleFetcher.fetchArticleContent(latestArticle.articleUrl);
            
            return {
              ...stock,
              fullContent
            };
          } catch (error) {
            console.error(`[ERROR] Content fetch failed for ${stock.ticker}:`, error);
            return {
              ...stock,
              fullContent: {
                content: stock.latestNews.description || stock.latestNews.title,
                title: stock.latestNews.title,
                success: false
              }
            };
          }
        })
      );
      
      // Step 4b: AI sentiment analysis on full content
      const stocksWithAISentiment = await Promise.all(
        articlesWithContent.map(async (stock) => {
          try {
            console.log(`[INFO] 🧠 AI analyzing sentiment for ${stock.ticker}...`);
            
            const newsAnalysis = await geminiService.analyzeFullArticle(
              stock.latestNews,
              stock.fullContent
            );
            
            return {
              ...stock,
              newsAnalysis
            };
          } catch (error) {
            console.error(`[ERROR] AI sentiment analysis failed for ${stock.ticker}:`, error);
            return {
              ...stock,
              newsAnalysis: {
                sentiment: 0.3,
                confidence: 0.2,
                tradingSignal: 'neutral',
                keyTopics: ['unknown'],
                urgency: 0.3,
                reasoning: 'AI analysis failed'
              }
            };
          }
        })
      );
      
      // Step 4c: Get minute-by-minute price data for promising stocks
      const promisingStocks = stocksWithAISentiment.filter(
        stock => stock.newsAnalysis?.sentiment > 0.2 && stock.newsAnalysis?.confidence > 0.5
      );
      
      let stocksWithBuySignals = [];
      
      if (promisingStocks.length > 0) {
        console.log(`[INFO] 📈 Getting price data for ${promisingStocks.length} promising stocks...`);
        
        const stocksWithPriceAction = await Promise.all(
          promisingStocks.map(async (stock) => {
            try {
              console.log(`[INFO] 📊 Getting 30min data for ${stock.ticker}...`);
              
              const minuteData = await polygonService.getMinuteData(stock.ticker, 30);
              const currentSnapshot = await polygonService.getCurrentSnapshot(stock.ticker);
              
              const priceAction = polygonService.analyzePriceAction(minuteData, currentSnapshot);
              
              return {
                ...stock,
                priceAction,
                minuteData,
                currentSnapshot
              };
            } catch (error) {
              console.error(`[ERROR] Price analysis failed for ${stock.ticker}:`, error);
              return {
                ...stock,
                priceAction: {
                  trend: 'unknown',
                  volumeSpike: false,
                  priceChange: 0,
                  volumeRatio: 0,
                  momentum: 0
                }
              };
            }
          })
        );
        
        // Step 4d: Generate AI buy signals
        console.log('[INFO] 🎯 Generating AI buy signals...');
        stocksWithBuySignals = await geminiService.batchAnalyzeStocks(
          stocksWithPriceAction.filter(stock => stock.priceAction && stock.newsAnalysis)
        );
      }
      
      // Merge AI results back with all stocks
      const aiStockMap = new Map(stocksWithBuySignals.map(stock => [stock.ticker, stock]));
      
      const aiEnhancedStocks = stocks.map(stock => {
        const aiStock = aiStockMap.get(stock.ticker);
        return aiStock || stock;
      });
      
      // Sort by AI buy percentage first
      aiEnhancedStocks.sort((a, b) => {
        if (a.buySignal && b.buySignal) {
          return b.buySignal.buyPercentage - a.buySignal.buyPercentage;
        }
        if (a.buySignal && !b.buySignal) return -1;
        if (!a.buySignal && b.buySignal) return 1;
        
        if (Math.abs(a.avgImpact - b.avgImpact) > 0.1) {
          return b.avgImpact - a.avgImpact;
        }
        return b.newsCount - a.newsCount;
      });

      // Extract top AI signals (40%+ confidence)
      const aiSignals = aiEnhancedStocks
        .filter(stock => stock.buySignal && stock.buySignal.buyPercentage >= 40)
        .slice(0, 10);

      // Update with AI results
      setNewsData(prevData => ({
        ...prevData,
        stocks: aiEnhancedStocks,
        aiSignals,
        timestamp: new Date().toISOString()
      }));
      
      console.log(`[INFO] 🎉 AI Analysis complete: ${aiEnhancedStocks.length} stocks, ${aiSignals.length} AI signals`);
      
    } catch (error) {
      console.error('[ERROR] AI analysis failed:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Initial fetch and setup interval
  useEffect(() => {
    fetchNewsData(false); // Don't trigger analysis on initial load
    
    const interval = setInterval(() => {
      console.log('[INFO] 🔄 Auto-refreshing news data...');
      fetchNewsData(false); // Auto-refresh without analysis
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchNewsData, refreshInterval]);

  return {
    newsData,
    newsLoading,
    analysisLoading,
    analysisPerformed,
    error,
    refresh: () => fetchNewsData(false),
    performAnalysis: () => performAIAnalysis(newsData?.stocks || []),
    aiAnalysisEnabled,
    setAiAnalysisEnabled,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice
  };
}