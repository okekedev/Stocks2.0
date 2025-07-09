// src/App.jsx - Updated with Dividend Calendar
import React from 'react';
import { useNewsData } from './hooks/useNewsData';
import { Header } from './components/Header';
import { FilteringStats } from './components/FilteringStats';
import { NewsTable } from './components/NewsTable';
import { DividendCalendar } from './components/DividendCalendar';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { Footer } from './components/Footer';

export default function App() {
  const { 
    newsData, 
    newsLoading,
    analysisLoading,
    analysisPerformed,
    error, 
    refresh, 
    performAnalysis,
    updateSingleAnalysis,
    persistentAnalyses,
    clearAnalyses,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice
  } = useNewsData();

  const handleAnalysisComplete = (ticker, result) => {
    updateSingleAnalysis(ticker, result);
  };

  const handleAnalyzeAll = async (stocks) => {
    if (stocks && stocks.length > 0) {
      await performAnalysis(stocks);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <Header 
        lastUpdate={newsData?.timestamp}
      />
      
      <div className="container mx-auto px-4 py-6">
        {/* News Loading State */}
        {newsLoading && (
          <div className="flex items-center justify-center py-8 mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
            <span className="text-blue-400">Fetching latest market news...</span>
          </div>
        )}

        {/* AI Analysis Loading State */}
        {analysisLoading && <LoadingSpinner />}
        
        {/* Error State */}
        {error && <ErrorDisplay error={error} onRetry={refresh} />}
        
        {/* Main Content */}
        {newsData && !newsLoading && (
          <>
            {/* Stats Overview with Price Filter */}
            <FilteringStats 
              newsData={newsData} 
              loading={false}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
            />

            {/* Stock Analysis Table */}
            <NewsTable 
              stocks={newsData.stocks}
              allArticles={newsData.articles}
              onAnalyzeAll={handleAnalyzeAll}
              persistentAnalyses={persistentAnalyses}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* ✅ NEW: Dividend Calendar */}
            <DividendCalendar />

            {/* Analysis Complete State */}
            {!analysisLoading && analysisPerformed && (
              <div className="bg-gray-800 rounded-lg p-6 text-center mb-6 mt-8">
                <div className="text-gray-400 mb-2">🤖</div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">AI Analysis Complete</h3>
                <p className="text-gray-400">
                  Analysis results are now available in the stocks table above. Click on any stock to see detailed AI insights.
                </p>
                {Object.keys(persistentAnalyses).length > 0 && (
                  <button
                    onClick={clearAnalyses}
                    className="mt-3 text-sm text-red-400 hover:text-red-300 underline transition-colors"
                  >
                    Clear All Analyses ({Object.keys(persistentAnalyses).length})
                  </button>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Empty State */}
        {newsData && !newsLoading && newsData.stocks.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">No Trading Opportunities</h3>
            <p className="text-gray-400">
              {(minPrice !== '' || maxPrice !== '') 
                ? `No stocks found in price range ${minPrice || '0'} - ${maxPrice || '∞'}. Try adjusting the price filter.`
                : 'No positive sentiment news found for tradeable stocks. Auto-refreshing every 5 minutes.'
              }
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}