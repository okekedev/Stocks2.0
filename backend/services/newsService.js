// =============================================================================
// NEWS ANALYSIS SERVICE
// =============================================================================

import { getPolygonNews } from './polygonService.js';

// Get recent news for multiple tickers (past hour)
export async function getRecentNewsForTickers(tickers, hours = 1) {
  try {
    console.log(`[INFO] Getting recent news for ${tickers.length} tickers over past ${hours} hours`);
    
    // Calculate time range (past hour)
    const toDate = new Date().toISOString();
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const allNews = [];
    
    // Get news for each ticker (batch process to avoid rate limits)
    for (let i = 0; i < tickers.length; i += 10) { // Process 10 tickers at a time
      const tickerBatch = tickers.slice(i, i + 10);
      
      console.log(`[INFO] Processing news batch ${Math.floor(i/10) + 1}/${Math.ceil(tickers.length/10)}: ${tickerBatch.join(', ')}`);
      
      for (const ticker of tickerBatch) {
        try {
          const newsResponse = await getPolygonNews({
            ticker: ticker.toUpperCase(),
            limit: 50, // Get more news per ticker
            from: fromDate,
            to: toDate
          });
          
          if (newsResponse.results && newsResponse.results.length > 0) {
            const processedNews = newsResponse.results.map(article => ({
              ...processNewsArticle(article),
              ticker: ticker.toUpperCase(),
              minutesAgo: Math.floor((Date.now() - new Date(article.published_utc).getTime()) / (1000 * 60))
            }));
            
            allNews.push(...processedNews);
          }
        } catch (error) {
          console.warn(`[WARN] Failed to get news for ${ticker}:`, error.message);
        }
      }
      
      // Small delay between batches to be respectful to API
      if (i + 10 < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Sort by recency and relevance
    allNews.sort((a, b) => {
      // First by impact score, then by recency
      if (Math.abs(a.impactScore - b.impactScore) > 0.1) {
        return b.impactScore - a.impactScore;
      }
      return a.minutesAgo - b.minutesAgo;
    });
    
    console.log(`[INFO] Found ${allNews.length} news articles across ${tickers.length} tickers`);
    
    return {
      articles: allNews,
      tickersWithNews: [...new Set(allNews.map(n => n.ticker))],
      timeRange: { from: fromDate, to: toDate },
      totalTickers: tickers.length,
      articlesPerTicker: allNews.reduce((acc, article) => {
        acc[article.ticker] = (acc[article.ticker] || 0) + 1;
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[ERROR] Failed to get recent news for tickers:', error.message);
    throw error;
  }
}

// Process individual news article with enhanced analysis
function processNewsArticle(article) {
  const processed = {
    id: article.id,
    title: article.title,
    description: article.description,
    author: article.author,
    publishedUtc: article.published_utc,
    articleUrl: article.article_url,
    imageUrl: article.image_url,
    tickers: article.tickers || [],
    keywords: article.keywords || [],
    insights: article.insights || [],
    publisher: article.publisher
  };
  
  // Enhanced sentiment analysis
  processed.sentimentScore = calculateEnhancedSentiment(article);
  processed.newsType = classifyNewsType(article);
  processed.impactScore = calculateImpactScore(article, processed.sentimentScore, processed.newsType);
  processed.urgency = calculateUrgency(article);
  
  return processed;
}

// Enhanced sentiment calculation
function calculateEnhancedSentiment(article) {
  let sentimentScore = 0;
  let totalInsights = 0;
  
  // Base sentiment from Polygon insights
  if (article.insights && article.insights.length > 0) {
    article.insights.forEach(insight => {
      if (insight.sentiment === 'positive') sentimentScore += 1;
      else if (insight.sentiment === 'negative') sentimentScore -= 1;
      totalInsights++;
    });
  }
  
  // Keyword-based sentiment enhancement
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const text = title + ' ' + description;
  
  // Positive keywords
  const positiveKeywords = [
    'beats', 'exceeds', 'raises', 'upgrade', 'bullish', 'growth', 'strong', 
    'partnership', 'acquisition', 'merger', 'approval', 'breakthrough', 
    'expansion', 'positive', 'surge', 'rally', 'gains', 'profit', 'revenue'
  ];
  
  // Negative keywords  
  const negativeKeywords = [
    'misses', 'disappoints', 'cuts', 'downgrade', 'bearish', 'decline', 'weak',
    'lawsuit', 'investigation', 'recall', 'warning', 'negative', 'falls', 
    'drops', 'losses', 'debt', 'bankruptcy', 'scandal'
  ];
  
  // High-impact keywords (more weight)
  const highImpactKeywords = [
    'earnings', 'fda approval', 'acquisition', 'merger', 'breakthrough', 
    'partnership', 'contract', 'deal', 'guidance', 'forecast'
  ];
  
  let keywordSentiment = 0;
  let impactMultiplier = 1;
  
  positiveKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywordSentiment += 0.3;
      if (highImpactKeywords.some(impact => text.includes(impact))) {
        impactMultiplier = 1.5;
      }
    }
  });
  
  negativeKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywordSentiment -= 0.3;
      if (highImpactKeywords.some(impact => text.includes(impact))) {
        impactMultiplier = 1.5;
      }
    }
  });
  
  // Combine sentiment sources
  const baseSentiment = totalInsights > 0 ? sentimentScore / totalInsights : 0;
  const finalSentiment = (baseSentiment + keywordSentiment) * impactMultiplier;
  
  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, finalSentiment));
}

// Classify news type for impact assessment
function classifyNewsType(article) {
  const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
  
  if (text.includes('earnings') || text.includes('quarterly') || text.includes('eps')) {
    return 'earnings';
  } else if (text.includes('fda') || text.includes('approval') || text.includes('clinical')) {
    return 'regulatory';
  } else if (text.includes('acquisition') || text.includes('merger') || text.includes('buyout')) {
    return 'ma'; // Mergers & Acquisitions
  } else if (text.includes('partnership') || text.includes('contract') || text.includes('deal')) {
    return 'partnership';
  } else if (text.includes('upgrade') || text.includes('downgrade') || text.includes('analyst')) {
    return 'analyst';
  } else if (text.includes('guidance') || text.includes('forecast') || text.includes('outlook')) {
    return 'guidance';
  } else {
    return 'general';
  }
}

// Calculate impact score (0-1, how likely to move the stock)
function calculateImpactScore(article, sentimentScore, newsType) {
  // Base impact by news type
  const typeImpacts = {
    'earnings': 0.9,
    'regulatory': 0.8,
    'ma': 0.9,
    'partnership': 0.7,
    'analyst': 0.6,
    'guidance': 0.8,
    'general': 0.3
  };
  
  const baseImpact = typeImpacts[newsType] || 0.3;
  const sentimentMultiplier = Math.abs(sentimentScore); // Higher sentiment (positive or negative) = higher impact
  
  // Publisher credibility (some sources are more market-moving)
  let publisherMultiplier = 1.0;
  const publisher = (article.publisher?.name || '').toLowerCase();
  
  if (publisher.includes('reuters') || publisher.includes('bloomberg') || 
      publisher.includes('wsj') || publisher.includes('cnbc')) {
    publisherMultiplier = 1.2;
  }
  
  // Recency factor (more recent = higher impact)
  const minutesAgo = Math.floor((Date.now() - new Date(article.published_utc).getTime()) / (1000 * 60));
  const recencyMultiplier = Math.max(0.5, 1 - (minutesAgo / 60)); // Decay over 1 hour
  
  const finalImpact = baseImpact * (1 + sentimentMultiplier) * publisherMultiplier * recencyMultiplier;
  
  return Math.min(1, finalImpact);
}

// Calculate urgency (how quickly traders should act)
function calculateUrgency(article) {
  const minutesAgo = Math.floor((Date.now() - new Date(article.published_utc).getTime()) / (1000 * 60));
  
  if (minutesAgo < 5) return 'immediate';
  else if (minutesAgo < 15) return 'high';
  else if (minutesAgo < 30) return 'medium';
  else return 'low';
}

// Get market news with processing
export async function getMarketNews(filters = {}) {
  try {
    console.log('[INFO] Getting market news with filters:', filters);
    
    const newsResponse = await getPolygonNews(filters);
    
    if (!newsResponse.results) {
      return { articles: [], message: 'No news articles found' };
    }
    
    // Process articles
    const processedArticles = newsResponse.results.map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      author: article.author,
      publishedUtc: article.published_utc,
      articleUrl: article.article_url,
      imageUrl: article.image_url,
      tickers: article.tickers || [],
      keywords: article.keywords || [],
      insights: article.insights || [],
      publisher: article.publisher,
      // Calculate simple sentiment score
      sentimentScore: calculateArticleSentiment(article),
      relevanceScore: calculateRelevanceScore(article, filters.ticker)
    }));
    
    // Sort by relevance and recency
    processedArticles.sort((a, b) => {
      // First by relevance (if ticker specified)
      if (filters.ticker && a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Then by publish date (most recent first)
      return new Date(b.publishedUtc) - new Date(a.publishedUtc);
    });
    
    return {
      articles: processedArticles,
      total: newsResponse.count,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[ERROR] News service failed:', error.message);
    throw error;
  }
}

// Calculate sentiment score for an article
function calculateArticleSentiment(article) {
  if (!article.insights || article.insights.length === 0) return 0;
  
  return article.insights.reduce((acc, insight) => {
    if (insight.sentiment === 'positive') return acc + 1;
    if (insight.sentiment === 'negative') return acc - 1;
    return acc;
  }, 0) / article.insights.length;
}

// Calculate relevance score for ticker-specific searches
function calculateRelevanceScore(article, ticker) {
  if (!ticker) return 1; // Default relevance when no ticker specified
  
  let score = 0;
  const upperTicker = ticker.toUpperCase();
  
  // Check if ticker is in the article's ticker list
  if (article.tickers && article.tickers.includes(upperTicker)) {
    score += 3;
  }
  
  // Check title and description for ticker mentions
  const titleMentions = (article.title || '').toUpperCase().includes(upperTicker);
  const descMentions = (article.description || '').toUpperCase().includes(upperTicker);
  
  if (titleMentions) score += 2;
  if (descMentions) score += 1;
  
  // Check keywords
  if (article.keywords && article.keywords.some(keyword => 
    keyword.toUpperCase().includes(upperTicker))) {
    score += 1;
  }
  
  return score;
}

// Get news sentiment analysis
export async function getNewsSentiment(ticker = null, days = 7) {
  try {
    console.log(`[INFO] Getting news sentiment for ${ticker || 'market'} over ${days} days`);
    
    // Calculate date range
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const filters = {
      ticker: ticker ? ticker.toUpperCase() : undefined,
      limit: 100,
      from: fromDate,
      to: toDate
    };
    
    const newsData = await getMarketNews(filters);
    
    if (!newsData.articles || newsData.articles.length === 0) {
      return {
        sentiment: null,
        message: 'No news articles found for sentiment analysis'
      };
    }
    
    // Calculate sentiment statistics
    const sentimentStats = newsData.articles.reduce((acc, article) => {
      if (article.insights && article.insights.length > 0) {
        article.insights.forEach(insight => {
          if (insight.sentiment === 'positive') acc.positive++;
          else if (insight.sentiment === 'negative') acc.negative++;
          else if (insight.sentiment === 'neutral') acc.neutral++;
          acc.total++;
        });
      }
      
      // Track article-level sentiment
      if (article.sentimentScore > 0.1) acc.positiveArticles++;
      else if (article.sentimentScore < -0.1) acc.negativeArticles++;
      else acc.neutralArticles++;
      
      return acc;
    }, { 
      positive: 0, 
      negative: 0, 
      neutral: 0, 
      total: 0,
      positiveArticles: 0,
      negativeArticles: 0,
      neutralArticles: 0
    });
    
    // Calculate overall sentiment score (-1 to 1)
    const overallScore = sentimentStats.total > 0 ? 
      (sentimentStats.positive - sentimentStats.negative) / sentimentStats.total : 0;
    
    // Calculate article-level sentiment score
    const articleSentimentScore = newsData.articles.length > 0 ?
      (sentimentStats.positiveArticles - sentimentStats.negativeArticles) / newsData.articles.length : 0;
    
    // Determine sentiment category
    let sentimentCategory = 'neutral';
    if (overallScore > 0.1) sentimentCategory = 'positive';
    else if (overallScore < -0.1) sentimentCategory = 'negative';
    
    // Get trending topics
    const trendingTopics = extractTrendingTopics(newsData.articles);
    
    return {
      ticker: ticker || 'MARKET',
      period: `${days} days`,
      sentiment: {
        score: parseFloat(overallScore.toFixed(3)),
        articleScore: parseFloat(articleSentimentScore.toFixed(3)),
        category: sentimentCategory,
        distribution: {
          positive: sentimentStats.positive,
          negative: sentimentStats.negative,
          neutral: sentimentStats.neutral,
          total: sentimentStats.total
        },
        articleDistribution: {
          positive: sentimentStats.positiveArticles,
          negative: sentimentStats.negativeArticles,
          neutral: sentimentStats.neutralArticles,
          total: newsData.articles.length
        }
      },
      trendingTopics,
      articlesAnalyzed: newsData.articles.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[ERROR] News sentiment analysis failed:', error.message);
    throw error;
  }
}

// Extract trending topics from news articles
function extractTrendingTopics(articles) {
  const keywordCounts = {};
  const tickerCounts = {};
  
  articles.forEach(article => {
    // Count keywords
    if (article.keywords) {
      article.keywords.forEach(keyword => {
        const cleanKeyword = keyword.toLowerCase().trim();
        if (cleanKeyword.length > 2) { // Ignore very short keywords
          keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
        }
      });
    }
    
    // Count tickers
    if (article.tickers) {
      article.tickers.forEach(ticker => {
        tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
      });
    }
  });
  
  // Get top trending items
  const topKeywords = Object.entries(keywordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count, percentage: (count / articles.length * 100).toFixed(1) }));
  
  const topTickers = Object.entries(tickerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count, percentage: (count / articles.length * 100).toFixed(1) }));
  
  return {
    keywords: topKeywords,
    tickers: topTickers
  };
}

// Get news by ticker with enhanced filtering
export async function getTickerNews(ticker, options = {}) {
  const {
    days = 7,
    limit = 20,
    includeSentiment = true,
    minRelevanceScore = 1
  } = options;
  
  try {
    console.log(`[INFO] Getting news for ticker: ${ticker} with options:`, options);
    
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const filters = {
      ticker: ticker.toUpperCase(),
      limit: Math.min(limit * 2, 100), // Get extra to filter by relevance
      from: fromDate,
      to: toDate
    };
    
    const newsData = await getMarketNews(filters);
    
    // Filter by relevance score
    let filteredArticles = newsData.articles.filter(article => 
      article.relevanceScore >= minRelevanceScore
    );
    
    // Limit results
    filteredArticles = filteredArticles.slice(0, limit);
    
    // Add sentiment analysis if requested
    let sentimentAnalysis = null;
    if (includeSentiment && filteredArticles.length > 0) {
      sentimentAnalysis = await getNewsSentiment(ticker, days);
    }
    
    return {
      ticker: ticker.toUpperCase(),
      articles: filteredArticles,
      totalFound: newsData.articles.length,
      totalRelevant: filteredArticles.length,
      sentiment: sentimentAnalysis,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[ERROR] Failed to get news for ticker ${ticker}:`, error.message);
    throw error;
  }
}

// Analyze news impact on stock movement
export async function analyzeNewsImpact(ticker, priceData, newsData) {
  try {
    console.log(`[INFO] Analyzing news impact for ${ticker}`);
    
    if (!priceData || !newsData || newsData.length === 0) {
      return { impact: 'insufficient_data', analysis: null };
    }
    
    // Group news by date
    const newsByDate = {};
    newsData.forEach(article => {
      const dateKey = article.publishedUtc.split('T')[0];
      if (!newsByDate[dateKey]) newsByDate[dateKey] = [];
      newsByDate[dateKey].push(article);
    });
    
    // Analyze correlation between news sentiment and price movement
    const correlationData = [];
    
    priceData.forEach(priceBar => {
      const dateKey = new Date(priceBar.t).toISOString().split('T')[0];
      const dayNews = newsByDate[dateKey] || [];
      
      if (dayNews.length > 0) {
        const avgSentiment = dayNews.reduce((sum, article) => 
          sum + article.sentimentScore, 0) / dayNews.length;
        
        const priceChange = ((priceBar.c - priceBar.o) / priceBar.o) * 100;
        
        correlationData.push({
          date: dateKey,
          priceChange,
          sentiment: avgSentiment,
          newsCount: dayNews.length,
          volume: priceBar.v
        });
      }
    });
    
    // Calculate correlation coefficient
    const correlation = calculateCorrelation(
      correlationData.map(d => d.sentiment),
      correlationData.map(d => d.priceChange)
    );
    
    return {
      impact: correlation > 0.3 ? 'strong_positive' : 
              correlation < -0.3 ? 'strong_negative' :
              Math.abs(correlation) > 0.1 ? 'moderate' : 'weak',
      correlation: parseFloat(correlation.toFixed(3)),
      analysis: {
        daysAnalyzed: correlationData.length,
        avgDailySentiment: correlationData.length > 0 ? 
          parseFloat((correlationData.reduce((sum, d) => sum + d.sentiment, 0) / correlationData.length).toFixed(3)) : 0,
        avgDailyPriceChange: correlationData.length > 0 ?
          parseFloat((correlationData.reduce((sum, d) => sum + d.priceChange, 0) / correlationData.length).toFixed(2)) : 0,
        highImpactDays: correlationData.filter(d => 
          Math.abs(d.sentiment) > 0.5 && Math.abs(d.priceChange) > 2
        )
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[ERROR] News impact analysis failed for ${ticker}:`, error.message);
    throw error;
  }
}

// Calculate correlation coefficient
function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}