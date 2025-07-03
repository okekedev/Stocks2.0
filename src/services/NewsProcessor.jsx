// src/services/NewsProcessor.js - Optimized version
import { polygonService } from './PolygonService';

class NewsProcessor {
  constructor() {
    this.tickerCache = new Map(); // Cache for company names
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour cache
  }

  // Enhanced ticker validation
  isValidTicker(ticker) {
    return ticker &&
           typeof ticker === 'string' &&
           ticker.length <= 5 &&
           ticker.length >= 1 &&
           /^[A-Z]+$/.test(ticker);
  }

  // Extract all possible tickers from article content and insights
  extractAllTickers(article) {
    const tickers = new Set();
    
    // 1. From article.tickers array
    if (article.tickers && article.tickers.length > 0) {
      article.tickers
        .map(t => t.toString().toUpperCase().trim())
        .filter(ticker => this.isValidTicker(ticker))
        .forEach(ticker => tickers.add(ticker));
    }
    
    // 2. From insights (this was the main source of mismatches)
    if (article.insights && article.insights.length > 0) {
      article.insights.forEach(insight => {
        if (insight.ticker && this.isValidTicker(insight.ticker.toUpperCase())) {
          tickers.add(insight.ticker.toUpperCase());
        }
      });
    }
    
    return Array.from(tickers);
  }

  // Get sentiment for a specific ticker from insights
  getTickerSentiment(article, ticker) {
    if (!article.insights) return 'neutral';
    
    const insight = article.insights.find(i => 
      i.ticker && i.ticker.toUpperCase() === ticker.toUpperCase()
    );
    
    return insight?.sentiment || 'neutral';
  }

  // Get reasoning for a specific ticker
  getTickerReasoning(article, ticker) {
    if (!article.insights) return 'No specific insight available';
    
    const insight = article.insights.find(i => 
      i.ticker && i.ticker.toUpperCase() === ticker.toUpperCase()
    );
    
    return insight?.sentiment_reasoning || 'No specific insight available';
  }

  // Main processing function
  async processNewsForStocks(articles) {
    const stocksWithNews = new Map();
    const processedArticles = [];
    
    // Filter for articles from last 4 hours only
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    const recentArticles = articles.filter(article => {
      const articleTime = new Date(article.published_utc).getTime();
      return articleTime >= fourHoursAgo;
    });
    
    console.log(`[INFO] Filtered to ${recentArticles.length} articles from last 4 hours`);
    
    // Sort by time (newest first)
    const sortedArticles = recentArticles.sort((a, b) =>
      new Date(b.published_utc).getTime() - new Date(a.published_utc).getTime()
    );

    // Collect all unique tickers from both sources
    const allTickers = new Set();
    sortedArticles.forEach(article => {
      const tickers = this.extractAllTickers(article);
      tickers.forEach(ticker => allTickers.add(ticker));
    });

    console.log(`[INFO] Found ${allTickers.size} unique tickers`);

    // Fetch company names (with caching)
    const companyNames = await this.getCompanyNamesWithCache(Array.from(allTickers));

    // Process articles with enhanced ticker extraction
    sortedArticles.forEach(article => {
      const tickers = this.extractAllTickers(article);
      
      if (tickers.length === 0) return;

      const minutesAgo = Math.floor(
        (Date.now() - new Date(article.published_utc).getTime()) / 60000
      );

      // Create processed article for each ticker with its specific sentiment
      tickers.forEach(ticker => {
        const tickerSentiment = this.getTickerSentiment(article, ticker);
        const tickerReasoning = this.getTickerReasoning(article, ticker);
        
        // Only process positive sentiment tickers
        if (tickerSentiment !== 'positive') return;
        
        const processedArticle = {
          id: article.id,
          title: article.title,
          description: article.description || '',
          publishedUtc: article.published_utc,
          articleUrl: article.article_url,
          ticker: ticker, // Specific to this ticker
          sentiment: tickerSentiment,
          reasoning: tickerReasoning,
          minutesAgo: minutesAgo,
          allTickers: tickers // Keep reference to all tickers in article
        };

        processedArticles.push(processedArticle);

        // Add to stock data
        if (!stocksWithNews.has(ticker)) {
          const apiCompanyName = companyNames.get(ticker);
          
          stocksWithNews.set(ticker, {
            ticker,
            companyName: (apiCompanyName && apiCompanyName !== ticker) ? apiCompanyName : null,
            articles: [],
            newsCount: 0,
            latestMinutesAgo: Infinity
          });
        }

        const stock = stocksWithNews.get(ticker);
        stock.articles.push(processedArticle);
        stock.newsCount++;
        stock.latestMinutesAgo = Math.min(stock.latestMinutesAgo, minutesAgo);
      });
    });

    // Convert to array and sort by recency
    const stocks = Array.from(stocksWithNews.values()).map(stock => {
      // Sort articles by recency (newest first)
      stock.articles.sort((a, b) => a.minutesAgo - b.minutesAgo);
      
      return {
        ...stock,
        latestNews: stock.articles[0] // Most recent article
      };
    });

    // Sort stocks by most recent news
    stocks.sort((a, b) => a.latestMinutesAgo - b.latestMinutesAgo);

    console.log(`[INFO] Final result: ${stocks.length} stocks with positive sentiment from last 4 hours`);

    return {
      articles: processedArticles,
      stocks,
      totalArticles: articles.length,
      recentArticles: recentArticles.length,
      positiveStocks: stocks.length
    };
  }

  // Enhanced company name fetching with caching
  async getCompanyNamesWithCache(tickers) {
    const companyNames = new Map();
    const tickersToFetch = [];
    
    // Check cache first
    const now = Date.now();
    tickers.forEach(ticker => {
      const cached = this.tickerCache.get(ticker);
      if (cached && (now - cached.timestamp) < this.cacheExpiry) {
        companyNames.set(ticker, cached.name);
      } else {
        tickersToFetch.push(ticker);
      }
    });

    // Fetch missing tickers
    if (tickersToFetch.length > 0) {
      console.log(`[INFO] Fetching company names for ${tickersToFetch.length} tickers...`);
      const freshNames = await polygonService.getCompanyNames(tickersToFetch);
      
      // Update cache and results
      freshNames.forEach((name, ticker) => {
        this.tickerCache.set(ticker, { name, timestamp: now });
        companyNames.set(ticker, name);
      });
    }

    return companyNames;
  }
}

export const newsProcessor = new NewsProcessor();