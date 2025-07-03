import React, { useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Clock, MessageSquare, X } from 'lucide-react';
import { StockDetailModal } from './StockDetailModal';

export function NewsTable({ stocks, allArticles }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState('avgImpact');
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedStocks = [...stocks].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Enhanced formatters that handle missing data gracefully
  const formatPrice = (price) => {
    if (price && !isNaN(price) && price > 0) {
      return `$${parseFloat(price).toFixed(2)}`;
    }
    return 'N/A';
  };

  const formatPercent = (percent) => {
    if (percent && !isNaN(percent)) {
      return `${percent > 0 ? '+' : ''}${parseFloat(percent).toFixed(2)}%`;
    }
    return 'N/A';
  };

  const formatVolume = (volume) => {
    if (volume && !isNaN(volume) && volume > 0) {
      const vol = parseFloat(volume);
      if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
      if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
      return vol.toString();
    }
    return 'N/A';
  };

  const formatTime = (minutes) => {
    if (!minutes || isNaN(minutes)) return 'N/A';
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

  // Debug logging to see what fields are available
  React.useEffect(() => {
    if (stocks.length > 0) {
      console.log('Available stock fields:', Object.keys(stocks[0]));
    }
  }, [stocks]);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
        <h3 className="text-lg font-semibold text-white">Stocks with Recent News</h3>
        <p className="text-sm text-gray-400">{stocks.length} stocks found</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Volume
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                News
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Sentiment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Impact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Latest News
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedStocks.map((stock) => (
              <tr 
                key={stock.ticker}
                className="hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedStock(stock)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-white">{stock.ticker}</div>
                  <div className="text-sm text-gray-400">{stock.exchange || 'Unknown'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-white">{formatPrice(stock.currentPrice || stock.price)}</div>
                  <div className={`text-sm ${
                    (stock.changePercent || 0) > 0 ? 'text-green-400' : 
                    (stock.changePercent || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {formatPercent(stock.changePercent)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-white">
                  {formatVolume(stock.volume)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 text-blue-400 mr-1" />
                    <span className="text-white font-medium">{stock.newsCount || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-medium ${getSentimentColor(stock.avgSentiment)}`}>
                    {(stock.avgSentiment || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-medium ${getImpactColor(stock.avgImpact)}`}>
                    {(stock.avgImpact || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm text-white truncate">
                      {stock.latestNews?.title || 'No recent news'}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {stock.latestNews ? formatTime(stock.latestNews.minutesAgo) : 'N/A'}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal 
          stock={selectedStock} 
          onClose={() => setSelectedStock(null)} 
        />
      )}
    </div>
  );
}