import express from 'express';
import { getMarketNews, getNewsSentiment, getTickerNews, getRecentNewsForTickers } from '../services/newsService.js';

const router = express.Router();

// Start monitoring for positive news only (2-hour window)
router.post('/monitor/positive', async (req, res) => {
  try {
    const { tickers, hours = 2 } = req.body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Tickers array is required' 
      });
    }
    
    console.log(`[INFO] Starting positive news monitoring for ${tickers.length} tickers over past ${hours} hours`);
    
    // Get all recent news first
    const allNewsData = await getRecentNewsForTickers(tickers, hours);
    
    if (!allNewsData.articles || allNewsData.articles.length === 0) {
      return res.json({
        status: 'no_news',
        message: 'No recent news found for monitored stocks',
        watchlist: [],
        totalTickers: tickers.length,
        timeRange: hours,
        timestamp: new Date().toISOString()
      });
    }
    
    // Filter for positive news only
    const positiveNews = allNewsData.articles.filter(article => {
      // Check if article has positive sentiment insights
      if (article.insights && article.insights.length > 0) {
        return article.insights.some(insight => insight.sentiment === 'positive');
      }
      // Fallback to our calculated sentiment score
      return article.sentimentScore > 0.3;
    });
    
    console.log(`[INFO] Found ${positiveNews.length} positive news articles out of ${allNewsData.articles.length} total`);
    
    if (positiveNews.length === 0) {
      return res.json({
        status: 'no_positive_news',
        message: 'No positive news found for monitored stocks',
        watchlist: [],
        totalNews: allNewsData.articles.length,
        positiveNews: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get unique tickers with positive news
    const tickersWithPositiveNews = [...new Set(positiveNews.map(article => article.ticker))];
    
    console.log(`[INFO] Tickers with positive news: ${tickersWithPositiveNews.join(', ')}`);
    
    // Perform technical analysis on stocks with positive news
    const { analyzeNewsImpactOnStocks } = await import('../services/technicalService.js');
    const technicalAnalysis = await analyzeNewsImpactOnStocks(tickersWithPositiveNews, { articles: positiveNews });
    
    // Build watchlist with detailed info
    const watchlist = technicalAnalysis.results.map(result => ({
      ticker: result.ticker,
      currentPrice: result.currentPrice,
      marketCap: result.marketCap,
      newsCount: result.newsCount,
      
      // Top positive news headlines for context
      headlines: result.topNews.map(news => ({
        title: news.title,
        description: news.description,
        publishedUtc: news.publishedUtc,
        minutesAgo: news.minutesAgo,
        sentimentScore: news.sentimentScore,
        impactScore: news.impactScore,
        articleUrl: news.articleUrl,
        publisher: news.publisher?.name || 'Unknown'
      })),
      
      // Technical analysis results
      signals: {
        action: result.analysis.signal,
        strength: result.analysis.signalStrength,
        confidence: result.analysis.confidence,
        recommendation: result.analysis.recommendation,
        targetPrice: result.analysis.targetPrice,
        stopLoss: result.analysis.stopLoss,
        riskLevel: result.analysis.riskLevel
      },
      
      // Technical indicators
      technicals: {
        momentum: result.analysis.momentumAnalysis,
        volume: result.analysis.volumeAnalysis,
        newsCorrelation: result.analysis.newsCorrelation
      },
      
      lastUpdated: result.lastUpdated
    }));
    
    // Sort by signal strength
    watchlist.sort((a, b) => b.signals.strength - a.signals.strength);
    
    const response = {
      status: 'active',
      watchlist,
      summary: {
        totalTickers: tickers.length,
        tickersWithNews: allNewsData.tickersWithNews.length,
        tickersWithPositiveNews: tickersWithPositiveNews.length,
        totalNews: allNewsData.articles.length,
        positiveNews: positiveNews.length,
        strongSignals: watchlist.filter(stock => stock.signals.strength > 60).length,
        timeRange: hours
      },
      monitoring: {
        startTime: new Date().toISOString(),
        nextNewsCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        nextTechnicalUpdate: new Date(Date.now() + 1 * 60 * 1000).toISOString(), // 1 minute
        windowHours: hours
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`[INFO] Positive news monitoring complete: ${watchlist.length} stocks in watchlist, ${response.summary.strongSignals} strong signals`);
    
    res.json(response);
    
  } catch (error) {
    console.error('[ERROR] Positive news monitoring failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to start positive news monitoring', 
      message: error.message 
    });
  }
});

// Update technical data for watchlist stocks (1-minute updates)
router.post('/update/technicals', async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Tickers array is required' 
      });
    }
    
    console.log(`[INFO] Updating technical data for ${tickers.length} watchlist stocks`);
    
    // Get 2-hour minute data for all watchlist stocks
    const { analyzeMinuteDataForWatchlist } = await import('../services/technicalService.js');
    const updates = await analyzeMinuteDataForWatchlist(tickers, 2); // 2-hour window
    
    res.json({
      status: 'updated',
      updates,
      updateTime: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 1 * 60 * 1000).toISOString() // Next minute
    });
    
  } catch (error) {
    console.error('[ERROR] Technical update failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to update technical data', 
      message: error.message 
    });
  }
});

// Check for new positive news (5-minute checks)
router.post('/check/new-news', async (req, res) => {
  try {
    const { currentWatchlist, lastCheck } = req.body;
    
    if (!currentWatchlist || !Array.isArray(currentWatchlist)) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Current watchlist is required' 
      });
    }
    
    console.log(`[INFO] Checking for new news since ${lastCheck} for ${currentWatchlist.length} stocks`);
    
    // Get all tickers that could have new news (current watchlist + potential new ones)
    const allTickers = currentWatchlist; // For now, just check current watchlist
    
    // Get news since last check
    const newsData = await getRecentNewsForTickers(allTickers, 2); // Still 2-hour window
    
    // Filter for news newer than last check
    const newNews = newsData.articles.filter(article => {
      const articleTime = new Date(article.publishedUtc);
      const lastCheckTime = new Date(lastCheck);
      return articleTime > lastCheckTime;
    });
    
    // Filter for positive news
    const newPositiveNews = newNews.filter(article => {
      if (article.insights && article.insights.length > 0) {
        return article.insights.some(insight => insight.sentiment === 'positive');
      }
      return article.sentimentScore > 0.3;
    });
    
    console.log(`[INFO] Found ${newPositiveNews.length} new positive news articles`);
    
    res.json({
      status: 'checked',
      newNews: newPositiveNews,
      newNewsCount: newPositiveNews.length,
      checkTime: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('[ERROR] New news check failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to check for new news', 
      message: error.message 
    });
  }
});

// Start comprehensive monitoring - news + technical analysis
router.post('/monitor/full', async (req, res) => {
  try {
    const { tickers, hours = 1 } = req.body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Tickers array is required' 
      });
    }
    
    console.log(`[INFO] Starting comprehensive monitoring for ${tickers.length} tickers`);
    
    // Step 1: Get recent news for all tickers
    const newsData = await getRecentNewsForTickers(tickers, hours);
    
    // Step 2: Get tickers that have news (these are our focus)
    const tickersWithNews = newsData.tickersWithNews;
    
    if (tickersWithNews.length === 0) {
      return res.json({
        status: 'no_news',
        message: 'No recent news found for monitored stocks',
        totalTickers: tickers.length,
        timeRange: hours,
        timestamp: new Date().toISOString()
      });
    }
    
    // Step 3: Perform technical analysis on stocks with news
    const { analyzeNewsImpactOnStocks } = await import('../services/technicalService.js');
    const technicalAnalysis = await analyzeNewsImpactOnStocks(tickersWithNews, newsData);
    
    // Step 4: Combine results
    const response = {
      status: 'active',
      monitoring: {
        totalTickers: tickers.length,
        tickersWithNews: tickersWithNews.length,
        timeRange: hours,
        startTime: new Date().toISOString()
      },
      newsData: {
        totalArticles: newsData.articles.length,
        articlesPerTicker: newsData.articlesPerTicker,
        highImpactNews: newsData.articles.filter(article => article.impactScore > 0.7)
      },
      technicalAnalysis: {
        results: technicalAnalysis.results,
        totalAnalyzed: technicalAnalysis.totalAnalyzed,
        strongSignals: technicalAnalysis.results.filter(result => 
          result.analysis.signalStrength > 60 && 
          result.analysis.confidence > 70
        ),
        buySignals: technicalAnalysis.results.filter(result => 
          result.analysis.signal.includes('buy')
        ),
        sellSignals: technicalAnalysis.results.filter(result => 
          result.analysis.signal.includes('sell')
        )
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`[INFO] Monitoring complete: ${technicalAnalysis.results.length} stocks analyzed, ${response.technicalAnalysis.strongSignals.length} strong signals`);
    
    res.json(response);
    
  } catch (error) {
    console.error('[ERROR] Comprehensive monitoring failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to start comprehensive monitoring', 
      message: error.message 
    });
  }
});

// Start monitoring endpoint - gets recent news for screened stocks
router.post('/monitor', async (req, res) => {
  try {
    const { tickers, hours = 1 } = req.body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Tickers array is required' 
      });
    }
    
    console.log(`[INFO] Starting news monitoring for ${tickers.length} tickers over past ${hours} hours`);
    
    const newsData = await getRecentNewsForTickers(tickers, hours);
    
    // Add monitoring metadata
    const response = {
      ...newsData,
      monitoringStarted: new Date().toISOString(),
      status: 'active',
      config: {
        tickers: tickers.length,
        timeRange: hours,
        updateInterval: '1min' // Will implement real-time updates later
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[ERROR] News monitoring failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to start news monitoring', 
      message: error.message 
    });
  }
});

// Get market news
router.get('/', async (req, res) => {
  try {
    const filters = {
      ticker: req.query.ticker,
      limit: parseInt(req.query.limit) || 50,
      from: req.query.from,
      to: req.query.to
    };
    
    console.log('[INFO] News request:', filters);
    
    const results = await getMarketNews(filters);
    res.json(results);
    
  } catch (error) {
    console.error('[ERROR] News request failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to get market news', 
      message: error.message 
    });
  }
});

// Get news sentiment
router.get('/sentiment', async (req, res) => {
  try {
    const { ticker, days = 7 } = req.query;
    
    console.log('[INFO] News sentiment request:', { ticker, days });
    
    const sentiment = await getNewsSentiment(ticker, parseInt(days));
    res.json(sentiment);
    
  } catch (error) {
    console.error('[ERROR] News sentiment failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to get news sentiment', 
      message: error.message 
    });
  }
});

// Get ticker-specific news
router.get('/ticker/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { days = 7, limit = 20, sentiment = 'true' } = req.query;
    
    console.log(`[INFO] Ticker news request: ${ticker}`, { days, limit, sentiment });
    
    const options = {
      days: parseInt(days),
      limit: parseInt(limit),
      includeSentiment: sentiment === 'true',
      minRelevanceScore: 1
    };
    
    const results = await getTickerNews(ticker.toUpperCase(), options);
    res.json(results);
    
  } catch (error) {
    console.error(`[ERROR] Ticker news failed for ${req.params.ticker}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to get ticker news', 
      message: error.message 
    });
  }
});

export default router;