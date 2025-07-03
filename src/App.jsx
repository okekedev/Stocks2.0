// src/App.jsx - Clean Version with No Duplications
import React from 'react';
import { useNewsData } from './hooks/NewsData';
import { Header } from './components/Header';
import { FilteringStats } from './components/FilteringStats';
import { AISignalsDashboard } from './components/AISignalsDashboard';
import { NewsTable } from './components/NewsTable';
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
    aiAnalysisEnabled, 
    setAiAnalysisEnabled,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice
  } = useNewsData();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Clean Header - Only branding and last update */}
      <Header 
        lastUpdate={newsData?.timestamp}
      />
      
      <div className="container mx-auto px-4 py-6">
        {/* Simple News Loading State */}
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
            {/* Stats Overview with Price Filter - All in one place */}
            <FilteringStats 
              newsData={newsData} 
              loading={false}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
            />

            {/* AI Trading Signals - Only show if we have signals */}
            {newsData.aiSignals && newsData.aiSignals.length > 0 && (
              <AISignalsDashboard 
                aiSignals={newsData.aiSignals} 
                loading={analysisLoading} 
              />
            )}

            {/* All Stocks Table with AIWorker on hover */}
            <NewsTable 
              stocks={newsData.stocks}
              allArticles={newsData.articles}
            />

            {/* Analysis Complete - No Signals State */}
            {!analysisLoading && analysisPerformed && newsData.aiSignals && newsData.aiSignals.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-6 text-center mb-6">
                <div className="text-gray-400 mb-2">🤖</div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">AI Analysis Complete</h3>
                <p className="text-gray-400">
                  No high-confidence trading signals found. Check the stocks table above for all available data.
                </p>
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