// src/components/Header.jsx
import React from 'react';
import { Newspaper, Brain, Clock, CheckSquare } from 'lucide-react';

export function Header({ 
  onFetchNews, 
  onPerformAnalysis, 
  loadingNews, 
  loadingAnalysis, 
  lastUpdate, 
  totalStocks, 
  totalArticles,
  selectedCount,
  hasNewsData,
  analysisComplete
}) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Brain className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Stock Trading Signals</h1>
            <p className="text-sm text-gray-400">Two-step analysis: News → AI Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Stats */}
          <div className="text-right">
            <div className="text-sm text-gray-400 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last Update: {formatTime(lastUpdate)}
            </div>
            <div className="text-xs text-gray-500">
              {totalStocks} stocks • {totalArticles} articles
              {selectedCount > 0 && ` • ${selectedCount} selected`}
            </div>
          </div>
          
          {/* Step 1: Get News Button */}
          <button
            onClick={onFetchNews}
            disabled={loadingNews || loadingAnalysis}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              loadingNews 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Newspaper className={`w-4 h-4 mr-2 ${loadingNews ? 'animate-spin' : ''}`} />
            {loadingNews ? 'Fetching...' : 'Get News'}
          </button>

          {/* Step 2: Perform Analysis Button */}
          <button
            onClick={onPerformAnalysis}
            disabled={!hasNewsData || loadingNews || loadingAnalysis || selectedCount === 0}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              !hasNewsData || selectedCount === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : loadingAnalysis 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : analysisComplete
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <Brain className={`w-4 h-4 mr-2 ${loadingAnalysis ? 'animate-spin' : ''}`} />
            {loadingAnalysis ? 'Analyzing...' : 
             analysisComplete ? 'Re-analyze' : 
             'Perform AI Analysis'}
          </button>

          {/* Selection indicator */}
          {hasNewsData && (
            <div className="text-sm text-gray-400 flex items-center">
              <CheckSquare className="w-4 h-4 mr-1" />
              {selectedCount}/{totalStocks}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}