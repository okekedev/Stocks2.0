// src/services/NewsProcessor.js - Fixed company name handling
import { polygonService } from './PolygonService';

class NewsProcessor {
  // Centralized ticker validation
  isValidTicker(ticker) {
    return ticker && 
           typeof ticker === 'string' &&
           ticker.length <= 5 && 
           ticker.length >= 1 && 
           /^[A-Z]+$/.test(ticker);
  }

  async processNewsForStocks(articles) {
    const stocksWithNews = new Map();
    const processedArticles = [];
    
    // Sort articles by time (newest first)
    const sortedArticles = articles.sort((a, b) => 
      new Date(b.published_utc).getTime() - new Date(a.published_utc).getTime()
    );
    
    // Collect all unique tickers first
    const allTickers = new Set();
    sortedArticles.forEach(article => {
      if (article.tickers && article.tickers.length > 0) {
        const tickers = article.tickers
          .map(t => t.toString().toUpperCase().trim())
          .filter(ticker => this.isValidTicker(ticker));
        
        tickers.forEach(ticker => allTickers.add(ticker));
      }
    });
    
    // Fetch company names for all tickers from Polygon API
    console.log(`[INFO] Fetching company names for ${allTickers.size} tickers from Polygon API...`);
    const companyNames = await polygonService.getCompanyNames(Array.from(allTickers));
    
    // Process articles with API-fetched company names
    sortedArticles.forEach(article => {
      if (!article.tickers || article.tickers.length === 0) {
        return;
      }

      const tickers = article.tickers
        .map(t => t.toString().toUpperCase().trim())
        .filter(ticker => this.isValidTicker(ticker));
      
      if (tickers.length > 0) {
        const processedArticle = {
          id: article.id,
          title: article.title,
          description: article.description || '',
          publishedUtc: article.published_utc,
          articleUrl: article.article_url,
          tickers: tickers,
          sentiment: article.insights?.[0]?.sentiment || 'positive',
          minutesAgo: Math.floor((Date.now() - new Date(article.published_utc).getTime()) / 60000)
        };
        
        processedArticles.push(processedArticle);
        
        // Add to each ticker with proper company name handling
        tickers.forEach(ticker => {
          if (!stocksWithNews.has(ticker)) {
            const apiCompanyName = companyNames.get(ticker);
            
            stocksWithNews.set(ticker, {
              ticker,
              // Only show company name if it's different from ticker and actually exists
              companyName: (apiCompanyName && apiCompanyName !== ticker) ? apiCompanyName : null,
              articles: [],
              newsCount: 0
            });
          }
          
          const stock = stocksWithNews.get(ticker);
          stock.articles.push(processedArticle);
          stock.newsCount++;
        });
      }
    });
    
    // Convert to array and get latest news
    const stocks = Array.from(stocksWithNews.values()).map(stock => {
      stock.articles.sort((a, b) => a.minutesAgo - b.minutesAgo);
      
      return {
        ...stock,
        latestNews: stock.articles[0] // Just take the newest
      };
    });
    
    return {
      articles: processedArticles,
      stocks,
      totalArticles: articles.length,
      robinhoodStocks: stocks.length
    };
  }
}

export const newsProcessor = new NewsProcessor();