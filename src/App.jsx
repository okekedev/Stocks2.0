// src/App.jsx
import React from 'react';
import { useNewsData } from './hooks/NewsData';
import { Header } from './components/Header';
import { FilteringStats } from './components/FilteringStats';
import { AISignalsDashboard } from './components/AISignalsDashboard';
import { NewsTable } from './components/NewsTable';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';

export default function App() {
  const { 
    newsData, 
    loading, 
    error, 
    refresh, 
    aiAnalysisEnabled, 
    setAiAnalysisEnabled 
  } = useNewsData();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        onRefresh={refresh}
        loading={loading}
        lastUpdate={newsData?.timestamp}
        totalStocks={newsData?.stocks?.length || 0}
        totalArticles={newsData?.totalArticles || 0}
        aiEnabled={aiAnalysisEnabled}
        onToggleAI={setAiAnalysisEnabled}
      />
      
      <div className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && <LoadingSpinner />}
        
        {/* Error State */}
        {error && <ErrorDisplay error={error} onRetry={refresh} />}
        
        {/* Main Content */}
        {newsData && !loading && (
          <>
            {/* Stats Overview */}
            <FilteringStats newsData={newsData} loading={loading} />

            {/* AI Trading Signals - Only show if we have signals */}
            {newsData.aiSignals && newsData.aiSignals.length > 0 && (
              <AISignalsDashboard 
                aiSignals={newsData.aiSignals} 
                loading={loading} 
              />
            )}

            {/* All Stocks Table */}
            <NewsTable 
              stocks={newsData.stocks}
              allArticles={newsData.articles}
            />
            
            {/* No Signals State */}
            {aiAnalysisEnabled && (!newsData.aiSignals || newsData.aiSignals.length === 0) && (
              <div className="bg-gray-800 rounded-lg p-6 text-center mb-6">
                <div className="text-gray-400 mb-2">🤖</div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">AI Analysis Complete</h3>
                <p className="text-gray-400">
                  No high-confidence trading signals found. Check the stocks table below for all available data.
                </p>
              </div>
            )}
          </>
        )}
        
        {/* Empty State */}
        {newsData && !loading && newsData.stocks.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">No Trading Opportunities</h3>
            <p className="text-gray-400">
              No positive sentiment news found for Robinhood-tradeable stocks. Try again later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}