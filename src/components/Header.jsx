import React from 'react';
import { RefreshCw, TrendingUp, Clock } from 'lucide-react';

export function Header({ onRefresh, loading, lastUpdate, totalStocks, totalArticles }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <TrendingUp className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Live Stock News Monitor</h1>
            <p className="text-sm text-gray-400">Real-time news-driven stock discovery</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-sm text-gray-400 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last Update: {formatTime(lastUpdate)}
            </div>
            <div className="text-xs text-gray-500">
              {totalStocks} stocks • {totalArticles} articles
            </div>
          </div>
          
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              loading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
}