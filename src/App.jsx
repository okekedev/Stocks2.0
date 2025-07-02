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