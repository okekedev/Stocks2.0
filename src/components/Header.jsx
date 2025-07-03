// src/components/Header.jsx
import React from 'react';
import { Brain, Clock, DollarSign, Filter } from 'lucide-react';

export function Header({ 
  lastUpdate, 
  totalStocks, 
  totalArticles,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice
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
            <p className="text-sm text-gray-400">Auto-refreshing every 5 minutes • Smart caching</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Price Filters */}
          <div className="flex items-center space-x-3 bg-gray-700 rounded-lg px-4 py-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-16 bg-gray-600 text-white text-sm rounded px-2 py-1 border border-gray-500 focus:border-green-400 outline-none"
                min="0"
                step="0.01"
                placeholder="Min"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20 bg-gray-600 text-white text-sm rounded px-2 py-1 border border-gray-500 focus:border-green-400 outline-none"
                min="0"
                step="1"
                placeholder="Max"
              />
            </div>
            <Filter className="w-4 h-4 text-green-400" />
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className="text-sm text-gray-400 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last Update: {formatTime(lastUpdate)}
            </div>
            <div className="text-xs text-gray-500">
              {totalStocks} stocks • {totalArticles} articles
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}