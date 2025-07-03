// src/services/NewsProcessor.js
class NewsProcessor {
  // Main processing function - simplified
  processNewsForStocks(articles) {
    const stocksWithNews = new Map();
    const processedArticles = [];
    
    // Sort articles by time (newest first)
    const sortedArticles = articles.sort((a, b) => 
      new Date(b.published_utc).getTime() - new Date(a.published_utc).getTime()
    );
    
    sortedArticles.forEach(article => {
      // Get tickers directly (already filtered for Robinhood exchanges)
      const tickers = (article.tickers || [])
        .map(t => t.toUpperCase())
        .filter(ticker => ticker && ticker.length <= 5);
      
      if (tickers.length > 0) {
        const processedArticle = {
          id: article.id,
          title: article.title,
          description: article.description || '',
          publishedUtc: article.published_utc,
          articleUrl: article.article_url,
          imageUrl: article.image_url,
          publisher: article.publisher?.name || 'Unknown',
          tickers: tickers,
          sentimentScore: 0.6, // All positive due to pre-filtering
          sentimentReasoning: article.insights?.[0]?.sentiment_reasoning || 'Positive sentiment',
          polygonInsights: article.insights || [],
          minutesAgo: Math.floor((Date.now() - new Date(article.published_utc).getTime()) / 60000)
        };
        
        processedArticles.push(processedArticle);
        
        // Add to stocks map
        tickers.forEach(ticker => {
          if (!stocksWithNews.has(ticker)) {
            stocksWithNews.set(ticker, {
              ticker,
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
    
    // Convert to array and set latest news
    const stocks = Array.from(stocksWithNews.values()).map(stock => {
      // Sort articles newest first
      stock.articles.sort((a, b) => a.minutesAgo - b.minutesAgo);
      
      return {
        ...stock,
        avgSentiment: 0.6, // All positive
        avgImpact: 0.6, // Let AI determine actual impact
        latestNews: stock.articles[0] // Newest article
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