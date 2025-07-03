// src/components/NewsTable.jsx - Updated with persistent logs and better positioning
import React, { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Clock, MessageSquare, Brain, Zap, ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import { AIWorker } from './AIWorker';

export function NewsTable({ stocks, allArticles }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState('buySignal');
  const [sortOrder, setSortOrder] = useState('desc');
  const [hoveredStock, setHoveredStock] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [stockAnalyses, setStockAnalyses] = useState({}); // Store complete analysis results with logs
  const [analyzingStocks, setAnalyzingStocks] = useState(new Set());
  const hoverTimeoutRef = useRef(null);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'latestNews' ? 'asc' : 'desc');
    }
  };

  // Enhanced hover handler with position tracking
  const handleStockHover = (stock, event) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Get mouse position relative to viewport
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.right + 10, // Position to the right of the row
      y: rect.top + (rect.height / 2) // Center vertically on the row
    });
    
    setHoveredStock(stock.ticker);
  };

  const handleStockLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStock(null);
    }, 150); // Slightly longer delay for better UX
  };

  const handleTerminalHover = () => {
    // Keep terminal open when hovering over it
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleTerminalLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredStock(null);
    }, 100);
  };

  // AI Worker callbacks with persistent log storage
  const handleWorkerStart = (ticker) => {
    setAnalyzingStocks(prev => new Set([...prev, ticker]));
  };

  const handleWorkerComplete = (ticker, result) => {
    // Store the complete result including logs for persistence
    setStockAnalyses(prev => ({
      ...prev,
      [ticker]: {
        ...result,
        savedLogs: result.savedLogs || [], // Ensure logs are saved
        completedAt: new Date().toISOString()
      }
    }));
    
    setAnalyzingStocks(prev => {
      const newSet = new Set(prev);
      newSet.delete(ticker);
      return newSet;
    });
  };

  // Enhanced stock data with persistent AI analysis
  const getEnhancedStock = (stock) => {
    const savedAnalysis = stockAnalyses[stock.ticker];
    return {
      ...stock,
      buySignal: savedAnalysis || stock.buySignal,
      isAnalyzing: analyzingStocks.has(stock.ticker),
      hasCustomAnalysis: !!savedAnalysis,
      hasSavedLogs: !!(savedAnalysis?.savedLogs?.length > 0)
    };
  };

  const sortedStocks = stocks.map(getEnhancedStock).sort((a, b) => {
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
    <>
      <div className="bg-gray-800 rounded-lg overflow-hidden relative">
        {/* Table Header */}
        <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">AI Stock Analysis</h3>
              <p className="text-sm text-gray-400">
                {stocks.length} stocks • {Object.keys(stockAnalyses).length} AI analyzed • 
                <span className="text-purple-400 ml-1">Hover for AI terminal</span>
              </p>
            </div>
            <div className="text-sm text-gray-400">
              Live Analysis: <span className="font-medium text-white">{analyzingStocks.size} running</span>
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
                <SortHeader field="buySignal">AI Signal</SortHeader>
                <SortHeader field="latestNews">Latest News</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedStocks.map((stock) => (
                <tr 
                  key={stock.ticker}
                  className="hover:bg-gray-700 cursor-pointer transition-colors"
                  onMouseEnter={(e) => handleStockHover(stock, e)}
                  onMouseLeave={handleStockLeave}
                >
                  {/* Stock Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="font-medium text-white">{stock.ticker}</div>
                        <div className="text-sm text-gray-400">{stock.exchange}</div>
                      </div>
                      {stock.isAnalyzing && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400" />
                      )}
                      {stock.hasCustomAnalysis && (
                        <CheckCircle className="w-4 h-4 text-green-400" title="AI Analyzed" />
                      )}
                      {stock.hasSavedLogs && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full" title="Has saved analysis" />
                      )}
                      {stock.buySignal && !stock.hasCustomAnalysis && (
                        <Brain className="w-4 h-4 text-purple-400" title="Pre-analyzed" />
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
                        {stock.hasCustomAnalysis && (
                          <Zap className="w-4 h-4 text-purple-400" title="Live AI Analysis" />
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        {stock.isAnalyzing ? (
                          <span className="text-purple-400">Analyzing...</span>
                        ) : (
                          <span>Hover to analyze</span>
                        )}
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
                        {stock.hasCustomAnalysis && (
                          <div className="text-purple-300 text-xs">
                            🤖 Live AI
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
      </div>

      {/* Fixed Position AI Worker Terminal */}
      {hoveredStock && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
          onMouseEnter={handleTerminalHover}
          onMouseLeave={handleTerminalLeave}
        >
          <AIWorker
            stock={sortedStocks.find(s => s.ticker === hoveredStock)}
            isActive={true}
            onAnalysisStart={handleWorkerStart}
            onAnalysisComplete={handleWorkerComplete}
            savedLogs={stockAnalyses[hoveredStock]?.savedLogs || null}
            savedResult={stockAnalyses[hoveredStock] || null}
          />
        </div>
      )}
    </>
  );
}