class NewsProcessor {
  // Main processing function
  processNewsForStocks(articles) {
    const stocksWithNews = new Map();
    const processedArticles = [];
    
    articles.forEach(article => {
      // Extract Robinhood-tradeable tickers
      const tickers = this.extractRobinhoodTickers(article);
      
      if (tickers.length > 0) {
        const processedArticle = {
          ...this.processArticle(article),
          relevantTickers: tickers,
          minutesAgo: Math.floor((Date.now() - new Date(article.published_utc).getTime()) / 60000)
        };
        
        processedArticles.push(processedArticle);
        
        // Add to stocks map
        tickers.forEach(ticker => {
          if (!stocksWithNews.has(ticker)) {
            stocksWithNews.set(ticker, {
              ticker,
              articles: [],
              newsCount: 0,
              totalSentiment: 0,
              totalImpact: 0
            });
          }
          
          const stock = stocksWithNews.get(ticker);
          stock.articles.push(processedArticle);
          stock.newsCount++;
          stock.totalSentiment += processedArticle.sentimentScore;
          stock.totalImpact += processedArticle.impactScore;
        });
      }
    });
    
    // Convert to array and calculate averages
    const stocks = Array.from(stocksWithNews.values()).map(stock => ({
      ...stock,
      avgSentiment: stock.totalSentiment / stock.newsCount,
      avgImpact: stock.totalImpact / stock.newsCount,
      latestNews: stock.articles.sort((a, b) => a.minutesAgo - b.minutesAgo)[0]
    }));
    
    return {
      articles: processedArticles,
      stocks,
      totalArticles: articles.length,
      robinhoodStocks: stocks.length
    };
  }
  
  // Extract tickers that are tradeable on Robinhood
  extractRobinhoodTickers(article) {
    const tickers = (article.tickers || [])
      .map(t => t.toUpperCase())
      .filter(ticker => this.isRobinhoodTradeable(ticker));
    
    return [...new Set(tickers)]; // Remove duplicates
  }
  
  // Check if ticker is Robinhood-tradeable
  isRobinhoodTradeable(ticker) {
    return (
      ticker.length <= 5 &&
      ticker.length >= 1 &&
      !ticker.includes('.') &&
      !ticker.endsWith('W') && // Warrants
      !ticker.endsWith('U') && // Units  
      !ticker.endsWith('R') && // Rights
      !ticker.includes('Q') && // Bankruptcy
      /^[A-Z]+$/.test(ticker) // Only letters
    );
  }
  
  // Process individual article
  processArticle(article) {
    return {
      id: article.id,
      title: article.title,
      description: article.description || '',
      publishedUtc: article.published_utc,
      articleUrl: article.article_url,
      imageUrl: article.image_url,
      publisher: article.publisher?.name || 'Unknown',
      tickers: article.tickers || [],
      sentimentScore: this.calculateSentiment(article),
      impactScore: this.calculateImpact(article)
    };
  }
  
  // Simple sentiment analysis
  calculateSentiment(article) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    
    const positiveWords = ['up', 'gain', 'rise', 'growth', 'strong', 'beat', 'exceed', 'approve', 'breakthrough', 'success'];
    const negativeWords = ['down', 'drop', 'fall', 'decline', 'weak', 'miss', 'reject', 'concern', 'warning', 'loss'];
    
    const posCount = positiveWords.filter(word => text.includes(word)).length;
    const negCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (posCount + negCount === 0) return 0;
    return (posCount - negCount) / (posCount + negCount);
  }
  
  // Calculate impact score
  calculateImpact(article) {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    
    const highImpact = ['earnings', 'fda', 'merger', 'acquisition', 'breakthrough', 'approval'];
    const mediumImpact = ['partnership', 'contract', 'analyst', 'upgrade', 'downgrade'];
    const lowImpact = ['guidance', 'forecast', 'outlook'];
    
    if (highImpact.some(word => text.includes(word))) return 0.8;
    if (mediumImpact.some(word => text.includes(word))) return 0.6;
    if (lowImpact.some(word => text.includes(word))) return 0.4;
    return 0.3;
  }
}

export const newsProcessor = new NewsProcessor();