import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export function StockDetailModal({ stock, onClose }) {
  // Helper functions (moved from NewsTable or redefined)
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.2) return 'text-green-400';
    if (sentiment < -0.2) return 'text-red-400';
    return 'text-gray-400';
  };

  const getImpactColor = (impact) => {
    if (impact > 0.6) return 'text-orange-400';
    if (impact > 0.4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 border-b border-gray-600 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{stock.ticker}</h2>
            <p className="text-gray-400">{stock.newsCount} recent articles</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Stock Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-400">Current Price</div>
              <div className="text-lg font-semibold text-white">
                {stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Change</div>
              <div className={`text-lg font-semibold ${stock.changePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.changePercent ? `${stock.changePercent > 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Avg Sentiment</div>
              <div className="text-lg font-semibold text-white">{stock.avgSentiment.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Avg Impact</div>
              <div className="text-lg font-semibold text-white">{stock.avgImpact.toFixed(2)}</div>
            </div>
          </div>

          {/* News Articles */}
          <h3 className="text-lg font-semibold text-white mb-4">Recent News Articles</h3>
          <div className="space-y-4">
            {stock.articles.map((article) => (
              <div key={article.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-2">{article.title}</h4>
                    {article.description && (
                      <p className="text-sm text-gray-300 mb-2">{article.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>{article.publisher}</span>
                      <span>{formatTime(article.minutesAgo)}</span>
                      <span className={getSentimentColor(article.sentimentScore)}>
                        Sentiment: {article.sentimentScore.toFixed(2)}
                      </span>
                      <span className={getImpactColor(article.impactScore)}>
                        Impact: {article.impactScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <a
                    href={article.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}