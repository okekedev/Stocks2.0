import React, { useState, useEffect } from 'react';
import { Filter, TrendingUp, Brain, Clock } from 'lucide-react';

export function FilteringStats({ newsData, loading }) {
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format countdown as MM:SS
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        </div>
        <div className="text-xs text-green-300 mt-1">
          Polygon filtered
        </div>
      </div>

      {/* Tradeable Stocks */}
      <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400">Tradeable Stocks</h3>
            <p className="text-2xl font-bold text-blue-400">
              {newsData.stocks?.length || 0}
            </p>
          </div>
        </div>
        <div className="text-xs text-blue-300 mt-1">
          With news + prices
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
        </div>
        <div className="text-xs text-purple-300 mt-1">
          With buy signals
        </div>
      </div>

      {/* Next Sync Countdown */}
      <div className="bg-gray-800 p-4 rounded-lg border border-orange-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-gray-400 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Next Sync
            </h3>
            <p className="text-2xl font-bold text-orange-400">
              {formatCountdown(countdown)}
            </p>
          </div>
        </div>
        <div className="text-xs text-orange-300 mt-1">
          Auto-refresh
        </div>
      </div>
    </div>
  );
}