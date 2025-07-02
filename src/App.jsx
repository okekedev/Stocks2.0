// =============================================================================
// RESTRUCTURED APP: Pure React + News-First Approach
// =============================================================================

// src/App.jsx - Main Application
import React, { useState } from 'react';
import { useNewsData } from './hooks/useNewsData';
import { Header } from './components/Header';
import { NewsTable } from './components/NewsTable';
import { TableFilters } from './components/TableFilters';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay.jsx';

export default function App() {
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minVolume: '',
    minNewsCount: 1,
    minSentiment: -1,
    minImpactScore: 0,
    search: ''
  });

  // Main data hook - gets all news and extracts stocks
  const { newsData, loading, error, refresh } = useNewsData();

  // Apply filters to stocks
  const filteredStocks = newsData?.stocks ? 
    applyFilters(newsData.stocks, filters) : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        onRefresh={refresh}
        loading={loading}
        lastUpdate={newsData?.timestamp}
        totalStocks={newsData?.stocks?.length || 0}
        totalArticles={newsData?.totalArticles || 0}
      />
      
      <div className="container mx-auto px-4 py-6">
        {/* Summary Stats */}
        {newsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400">Total Articles</h3>
              <p className="text-2xl font-bold text-blue-400">{newsData.totalArticles}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400">Stocks with News</h3>
              <p className="text-2xl font-bold text-green-400">{newsData.robinhoodStocks}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400">After Filters</h3>
              <p className="text-2xl font-bold text-yellow-400">{filteredStocks.length}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400">Avg Articles/Stock</h3>
              <p className="text-2xl font-bold text-purple-400">
                {newsData.robinhoodStocks > 0 ? 
                  Math.round(newsData.totalArticles / newsData.robinhoodStocks * 10) / 10 : 0}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <TableFilters 
          filters={filters} 
          onChange={setFilters}
          stockCount={filteredStocks.length}
        />

        {/* Content */}
        {loading && <LoadingSpinner />}
        {error && <ErrorDisplay error={error} onRetry={refresh} />}
        {newsData && !loading && (
          <NewsTable 
            stocks={filteredStocks}
            allArticles={newsData.articles}
          />
        )}
      </div>
    </div>
  );
}

// Apply filters to stocks array
function applyFilters(stocks, filters) {
  return stocks.filter(stock => {
    // Price filters
    if (filters.minPrice && (!stock.currentPrice || stock.currentPrice < parseFloat(filters.minPrice))) return false;
    if (filters.maxPrice && (!stock.currentPrice || stock.currentPrice > parseFloat(filters.maxPrice))) return false;
    
    // Volume filters  
    if (filters.minVolume && (!stock.volume || stock.volume < parseFloat(filters.minVolume) * 1000)) return false;
    
    // News filters
    if (filters.minNewsCount && stock.newsCount < parseInt(filters.minNewsCount)) return false;
    if (filters.minSentiment && stock.avgSentiment < parseFloat(filters.minSentiment)) return false;
    if (filters.minImpactScore && stock.avgImpact < parseFloat(filters.minImpactScore)) return false;
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesTicker = stock.ticker.toLowerCase().includes(searchTerm);
      const matchesNews = stock.latestNews?.title.toLowerCase().includes(searchTerm);
      if (!matchesTicker && !matchesNews) return false;
    }
    
    return true;
  });
}

// =============================================================================
// hooks/useNewsData.js - Main Data Hook
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { polygonService } from '../services/polygonService';
import { newsProcessor } from '../services/newsProcessor';

export function useNewsData(refreshInterval = 5 * 60 * 1000) { // 5 minutes
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNewsData = useCallback(async () => {
    try {
      console.log('[INFO] Fetching latest market news...');
      setError(null);
      
      // Step 1: Get all recent market news (4-hour window)
      const rawNews = await polygonService.getAllMarketNews(4);
      
      if (!rawNews?.results?.length) {
        setNewsData({
          articles: [],
          stocks: [],
          totalArticles: 0,
          robinhoodStocks: 0,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`[INFO] Processing ${rawNews.results.length} articles...`);
      
      // Step 2: Process news and extract Robinhood stocks
      const processedData = newsProcessor.processNewsForStocks(rawNews.results);
      
      // Step 3: Get market data for stocks with news
      if (processedData.stocks.length > 0) {
        console.log(`[INFO] Getting market data for ${processedData.stocks.length} stocks...`);
        const tickers = processedData.stocks.map(s => s.ticker);
        const marketData = await polygonService.getMarketData(tickers);
        
        // Merge market data with news data
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
      
      // Sort by impact and news count
      processedData.stocks.sort((a, b) => {
        if (Math.abs(a.avgImpact - b.avgImpact) > 0.1) {
          return b.avgImpact - a.avgImpact;
        }
        return b.newsCount - a.newsCount;
      });

      setNewsData({
        ...processedData,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[INFO] Data updated: ${processedData.stocks.length} stocks with news`);
      
    } catch (err) {
      console.error('[ERROR] Failed to fetch news data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and setup interval
  useEffect(() => {
    fetchNewsData();
    
    const interval = setInterval(() => {
      console.log('[INFO] Auto-refreshing news data...');
      fetchNewsData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchNewsData, refreshInterval]);

  return {
    newsData,
    loading,
    error,
    refresh: fetchNewsData
  };
}

// =============================================================================
// services/polygonService.js - Direct API Calls
// =============================================================================

class PolygonService {
  constructor() {
    // API key stored in environment variable
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    
    if (!this.apiKey) {
      console.warn('[WARN] VITE_POLYGON_API_KEY not found in environment');
    }
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = new URL(endpoint, this.baseUrl);
      
      // Add API key and params
      url.searchParams.set('apikey', this.apiKey);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });

      console.log(`[INFO] Polygon API: ${endpoint}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[INFO] Polygon response: ${data.status}, count: ${data.count || 0}`);
      
      return data;
    } catch (error) {
      console.error(`[ERROR] Polygon API request failed:`, error);
      throw error;
    }
  }

  // Get all recent market news
  async getAllMarketNews(hours = 4) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();
    
    return this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate,
      'published_utc.lte': toDate
    });
  }

  // Get market snapshots for multiple tickers
  async getMarketData(tickers) {
    try {
      const batchSize = 250; // Polygon limit
      const allSnapshots = [];
      
      // Process in batches
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        
        const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
          tickers: batch.join(',')
        });
        
        if (response.tickers) {
          allSnapshots.push(...response.tickers);
        }
        
        // Small delay between batches
        if (i + batchSize < tickers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return allSnapshots;
    } catch (error) {
      console.error('[ERROR] Failed to get market data:', error);
      return [];
    }
  }
}

export const polygonService = new PolygonService();

// =============================================================================
// services/newsProcessor.js - Client-side News Processing
// =============================================================================

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