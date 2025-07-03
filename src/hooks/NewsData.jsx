// src/hooks/useNewsData.js
import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/PolygonService';
import { newsProcessor } from '../services/NewsProcessor';
import { geminiService } from '../services/GeminiService';
import { articleFetcher } from '../services/ArticleFetcher';

export function useNewsData(refreshInterval = 5 * 60 * 1000) {
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);

  const fetchNewsData = useCallback(async () => {
    try {
      console.log('[INFO] 🚀 Starting AI-powered news analysis...');
      setError(null);
      
      // Step 1: Get positive sentiment news only
      const rawNews = await polygonService.getAllMarketNews(8);
      
      if (!rawNews?.results?.length) {
        setNewsData({
          articles: [],
          stocks: [],
          totalArticles: 0,
          positiveArticles: 0,
          robinhoodStocks: 0,
          aiSignals: [],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const totalArticles = rawNews.results.length;
      console.log(`[INFO] 📰 Processing ${totalArticles} positive Robinhood articles...`);
      
      // Step 2: Process news and extract tradeable stocks
      const processedData = newsProcessor.processNewsForStocks(rawNews.results);
      
      // Step 3: Get current market data
      if (processedData.stocks.length > 0) {
        console.log(`[INFO] 📊 Getting market data for ${processedData.stocks.length} stocks...`);
        const tickers = processedData.stocks.map(s => s.ticker);
        const marketData = await polygonService.getMarketData(tickers);
        
        // Merge market data
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
      
      // Step 4: AI Analysis Pipeline
      let aiEnhancedStocks = processedData.stocks;
      
      if (aiAnalysisEnabled && processedData.stocks.length > 0) {
        console.log('[INFO] 🤖 Starting AI analysis pipeline...');
        
        // Filter candidates for deep analysis
        const candidateStocks = processedData.stocks.filter(stock => 
          stock.latestNews?.minutesAgo < 120 && // Recent news (2 hours)
          stock.currentPrice && // Has price data
          stock.articles.length > 0 // Has articles
        );
        
        if (candidateStocks.length > 0) {
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
          
          if (promisingStocks.length > 0) {
            console.log(`[INFO] 📈 Getting price data for ${promisingStocks.length} promising stocks...`);
            
            const stocksWithPriceAction = await Promise.all(
              promisingStocks.map(async (stock) => {
                try {
                  console.log(`[INFO] 📊 Getting 30min data for ${stock.ticker}...`);
                  
                  // Get 30 minutes of price data
                  const minuteData = await polygonService.getMinuteData(stock.ticker, 30);
                  const currentSnapshot = await polygonService.getCurrentSnapshot(stock.ticker);
                  
                  // Analyze price action
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
            const stocksWithBuySignals = await geminiService.batchAnalyzeStocks(
              stocksWithPriceAction.filter(stock => stock.priceAction && stock.newsAnalysis)
            );
            
            // Merge AI results back with all stocks
            const aiStockMap = new Map(stocksWithBuySignals.map(stock => [stock.ticker, stock]));
            
            aiEnhancedStocks = processedData.stocks.map(stock => {
              const aiStock = aiStockMap.get(stock.ticker);
              return aiStock || stock;
            });
            
      console.log(`[INFO] 🎉 Analysis complete: ${aiEnhancedStocks.length} stocks, ${aiSignals.length} AI signals`);
          }
        }
      }
      
      // Sort by AI buy percentage first
      aiEnhancedStocks.sort((a, b) => {
        if (a.buySignal && b.buySignal) {
          return b.buySignal.buyPercentage - a.buySignal.buyPercentage;
        }
        if (a.buySignal && !b.buySignal) return -1;
        if (!a.buySignal && b.buySignal) return 1;
        
        // Fallback to original sorting
        if (Math.abs(a.avgImpact - b.avgImpact) > 0.1) {
          return b.avgImpact - a.avgImpact;
        }
        return b.newsCount - a.newsCount;
      });

      // Extract top AI signals (40%+ confidence)
      const aiSignals = aiEnhancedStocks
        .filter(stock => stock.buySignal && stock.buySignal.buyPercentage >= 40)
        .slice(0, 10);

      setNewsData({
        ...processedData,
        stocks: aiEnhancedStocks,
        aiSignals,
        aiAnalysisEnabled,
        totalArticles,
        positiveArticles: totalArticles,
        polygonFiltered: true,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[INFO] 🎉 Analysis complete: ${aiEnhancedStocks.length} stocks, ${aiSignals.length} AI signals`);
      
    } catch (err) {
      console.error('[ERROR] 💥 Failed to fetch news data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [aiAnalysisEnabled]);

  // Initial fetch and setup interval
  useEffect(() => {
    fetchNewsData();
    
    const interval = setInterval(() => {
      console.log('[INFO] 🔄 Auto-refreshing news data...');
      fetchNewsData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchNewsData, refreshInterval]);

  return {
    newsData,
    loading,
    error,
    refresh: fetchNewsData,
    aiAnalysisEnabled,
    setAiAnalysisEnabled
  };
}