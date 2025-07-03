import React, { useState } from 'react';
import { useNewsData } from './hooks/NewsData'; // Fixed import path
import { Header } from './components/Header';
import { NewsTable } from './components/NewsTable';
import { TableFilters } from './components/TableFilters';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function App() {
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minVolume: '',
    minNewsCount: 1,
    minSentiment: 0.1, // Default to positive sentiment (changed from -1)
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
    // Price filters - only filter stocks that actually have price data
    if (filters.minPrice !== '') {
      const minPrice = parseFloat(filters.minPrice);
      const stockPrice = parseFloat(stock.currentPrice || stock.price);
      
      // If stock has no price data, don't filter it out based on price
      // Only filter out stocks that have price data AND are below the minimum
      if (!isNaN(stockPrice) && stockPrice < minPrice) return false;
    }
    
    if (filters.maxPrice !== '') {
      const maxPrice = parseFloat(filters.maxPrice);
      const stockPrice = parseFloat(stock.currentPrice || stock.price);
      
      // If stock has no price data, don't filter it out based on price
      // Only filter out stocks that have price data AND are above the maximum
      if (!isNaN(stockPrice) && stockPrice > maxPrice) return false;
    }
    
    // Volume filters - only filter stocks that actually have volume data > 0
    if (filters.minVolume !== '') {
      const minVolume = parseFloat(filters.minVolume);
      const stockVolume = parseFloat(stock.volume);
      
      // If stock has no meaningful volume data (0 or NaN), don't filter it out
      // Only filter out stocks that have volume data AND are below the minimum
      if (!isNaN(stockVolume) && stockVolume > 0 && stockVolume < minVolume) return false;
    }
    
    // News filters - these work fine since they don't depend on market data
    if (filters.minNewsCount && stock.newsCount < parseInt(filters.minNewsCount)) return false;
    if (filters.minSentiment > -1 && stock.avgSentiment < parseFloat(filters.minSentiment)) return false;
    if (filters.minImpactScore > 0 && stock.avgImpact < parseFloat(filters.minImpactScore)) return false;
    
    // Search filter
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase().trim();
      const matchesTicker = stock.ticker.toLowerCase().includes(searchTerm);
      const matchesNews = stock.latestNews?.title.toLowerCase().includes(searchTerm);
      const matchesDescription = stock.articles?.some(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        (article.description && article.description.toLowerCase().includes(searchTerm))
      );
      if (!matchesTicker && !matchesNews && !matchesDescription) return false;
    }
    
    return true;
  });
}