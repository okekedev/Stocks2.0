import React, { useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Clock, MessageSquare, X, ChevronUp, ChevronDown, Brain, Zap } from 'lucide-react';
import { StockDetailModal } from './StockDetailModal';

export function NewsTable({ stocks, allArticles }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState('buySignal'); // Default to AI buy signals
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'latestNews' ? 'asc' : 'desc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'buySignal':
        aVal = a.buySignal?.buyPercentage || 0;
        bVal = b.buySignal?.buyPercentage || 0;
        break;
      case 'latestNews':
        aVal = a.latestNews?.minutesAgo || 999999;
        bVal = b.latestNews?.minutesAgo || 999999;
        break;
      case 'ticker':
        aVal = a.ticker;
        bVal = b.ticker;
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'currentPrice':
        aVal = a.currentPrice || 0;
        bVal = b.currentPrice || 0;
        break;
      case 'changePercent':
        aVal = a.changePercent || 0;
        bVal = b.changePercent || 0;
        break;
      case 'newsCount':
        aVal = a.newsCount || 0;
        bVal = b.newsCount || 0;
        break;
      default:
        aVal = a.buySignal?.buyPercentage || 0;
        bVal = b.buySignal?.buyPercentage || 0;
    }
    
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const formatPrice = (price) => price ? `${price.toFixed(2)}` : 'N/A';
  const formatPercent = (percent) => percent ? `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%` : 'N/A';
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const getBuySignalColor = (buyPercentage) => {
    if (!buyPercentage) return 'text-gray-400';
    if (buyPercentage >= 80) return 'text-green-400';
    if (buyPercentage >= 60) return 'text-blue-400';
    if (buyPercentage >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getBuySignalIcon = (buyPercentage) => {
    if (!buyPercentage) return '❓';
    if (buyPercentage >= 80) return '🚀';
    if (buyPercentage >= 60) return '📈';
    if (buyPercentage >= 40) return '⚡';
    return '🤔';
  };

  const SortHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          sortOrder === 'asc' ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Stock Analysis Results</h3>
            <p className="text-sm text-gray-400">{stocks.length} stocks • {stocks.filter(s => s.buySignal).length} AI analyzed</p>
          </div>
          <div className="text-sm text-gray-400">
            Sorted by: <span className="font-medium text-white">
              {sortBy === 'buySignal' ? 'AI Buy Signal' : 
               sortBy === 'latestNews' ? 'Latest News' : 
               sortBy === 'newsCount' ? 'News Count' :
               sortBy === 'changePercent' ? 'Price Change' :
               sortBy === 'currentPrice' ? 'Price' :
               sortBy}
            </span>
            {sortBy === 'latestNews' && sortOrder === 'asc' ? ' (Newest First)' :
             sortOrder === 'desc' ? ' (High to Low)' : ' (Low to High)'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700 border-b border-gray-600">
            <tr>
              <SortHeader field="ticker">Stock</SortHeader>
              <SortHeader field="currentPrice">Price</SortHeader>
              <SortHeader field="newsCount">News</SortHeader>
              <SortHeader field="buySignal">AI Buy Signal</SortHeader>
              <SortHeader field="latestNews">Latest News</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedStocks.map((stock) => (
              <tr 
                key={stock.ticker}
                className="hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedStock(stock)}
              >
                {/* Stock Info */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div>
                      <div className="font-medium text-white">{stock.ticker}</div>
                      <div className="text-sm text-gray-400">{stock.exchange}</div>
                    </div>
                    {stock.buySignal && (
                      <Brain className="w-4 h-4 text-purple-400" title="AI Analyzed" />
                    )}
                  </div>
                </td>

                {/* Price */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-white">{formatPrice(stock.currentPrice)}</div>
                  <div className={`text-sm flex items-center ${stock.changePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.changePercent > 0 ? 
                      <TrendingUp className="w-3 h-3 mr-1" /> : 
                      <TrendingDown className="w-3 h-3 mr-1" />
                    }
                    {formatPercent(stock.changePercent)}
                  </div>
                </td>

                {/* News Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 text-blue-400 mr-1" />
                    <span className="text-white font-medium">{stock.newsCount}</span>
                  </div>
                </td>

                {/* AI Buy Signal */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {stock.buySignal ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getBuySignalIcon(stock.buySignal.buyPercentage)}</span>
                      <div>
                        <div className={`font-bold text-lg ${getBuySignalColor(stock.buySignal.buyPercentage)}`}>
                          {stock.buySignal.buyPercentage}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {stock.buySignal.signal.replace('_', ' ')}
                        </div>
                      </div>
                      {stock.priceAction?.volumeSpike && (
                        <Zap className="w-4 h-4 text-yellow-400" title="Volume Spike" />
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      {stock.latestNews?.minutesAgo > 120 ? 'News too old' : 'Pending analysis'}
                    </div>
                  )}
                </td>

                {/* Latest News */}
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm text-white truncate">
                      {stock.latestNews?.title || 'No recent news'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span className={stock.latestNews?.minutesAgo < 60 ? 'text-green-400' : 
                                       stock.latestNews?.minutesAgo < 240 ? 'text-yellow-400' : 'text-gray-400'}>
                          {stock.latestNews ? formatTime(stock.latestNews.minutesAgo) : 'N/A'}
                        </span>
                      </div>
                      {stock.newsAnalysis && (
                        <div className="text-purple-300">
                          AI: {Math.round(stock.newsAnalysis.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {stocks.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">No stocks found</h3>
          <p className="text-gray-400">Try refreshing or check back later</p>
        </div>
      )}

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