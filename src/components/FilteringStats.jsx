import React from 'react';
import { Filter, TrendingUp, Brain, CheckCircle } from 'lucide-react';

export function FilteringStats({ newsData, loading }) {
  if (loading || !newsData) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const aiAnalyzedCount = newsData.stocks?.filter(s => s.buySignal).length || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Positive Articles */}
      <div className="bg-gray-800 p-4 rounded-lg border border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400 flex items-center">
              <Filter className="w-4 h-4 mr-1" />
              Positive Articles
            </h3>
            <p className="text-2xl font-bold text-green-400">
              {newsData.totalArticles || 0}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
        </div>
        <div className="text-xs text-green-300 mt-1">
          Robinhood exchanges only
        </div>
      </div>

      {/* Tradeable Stocks */}
      <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400">Tradeable Stocks</h3>
            <p className="text-2xl font-bold text-blue-400">
              {newsData.robinhoodStocks || 0}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
        </div>
        <div className="text-xs text-blue-300 mt-1">
          With positive news
        </div>
      </div>

      {/* AI Analyzed */}
      <div className="bg-gray-800 p-4 rounded-lg border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400">AI Analyzed</h3>
            <p className="text-2xl font-bold text-purple-400">
              {aiAnalyzedCount}
            </p>
          </div>
          <Brain className="w-8 h-8 text-purple-400 opacity-50" />
        </div>
        <div className="text-xs text-purple-300 mt-1">
          Full content analysis
        </div>
      </div>

      {/* Buy Signals */}
      <div className="bg-gray-800 p-4 rounded-lg border border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400">Trading Signals</h3>
            <p className="text-2xl font-bold text-yellow-400">
              {newsData.aiSignals?.length || 0}
            </p>
          </div>
          <div className="text-2xl">🎯</div>
        </div>
        <div className="text-xs text-yellow-300 mt-1">
          40%+ confidence
        </div>
      </div>
    </div>
  );
}