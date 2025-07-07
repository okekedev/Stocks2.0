// src/components/NewsTable.jsx - Enhanced Modern UI with EOD Forecast
import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  MessageSquare, 
  Brain, 
  Zap, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Activity,
  Target
} from 'lucide-react';
import { AIWorker } from './AIWorker';
import { usePricePolling } from '../hooks/usePricePolling';

export function NewsTable({ stocks, allArticles, onAnalyzeAll }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState('buySignal');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stockAnalyses, setStockAnalyses] = useState({});
  const [analyzingStocks, setAnalyzingStocks] = useState(new Set());
  const [priceAnimations, setPriceAnimations] = useState(new Map());
  
  // Use ref to track previous prices to avoid infinite loop
  const previousPricesRef = useRef(new Map());

  // Price polling for updates (every 1 minute)
  const { priceData, isPolling, connectionStatus, refresh, getTimeSinceUpdate } = usePricePolling(stocks, 60000);

  // Track price changes for animations - Updated for polling
  useEffect(() => {
    const newAnimations = new Map();
    
    priceData.forEach((newPrice, ticker) => {
      const previousPrice = previousPricesRef.current.get(ticker);
      
      // Only animate if we have a previous price and it's actually different
      if (previousPrice && newPrice.currentPrice && 
          Math.abs(previousPrice - newPrice.currentPrice) > 0.01) {
        const animation = newPrice.currentPrice > previousPrice ? 'price-up' : 'price-down';
        newAnimations.set(ticker, animation);
        
        // Clear animation after 2 seconds (longer for polling)
        setTimeout(() => {
          setPriceAnimations(prev => {
            const updated = new Map(prev);
            updated.delete(ticker);
            return updated;
          });
        }, 2000);
      }
      
      // Update previous price
      if (newPrice.currentPrice) {
        previousPricesRef.current.set(ticker, newPrice.currentPrice);
      }
    });
    
    // Only update animations if there are new ones
    if (newAnimations.size > 0) {
      setPriceAnimations(newAnimations);
    }
  }, [priceData]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'latestNews' ? 'asc' : 'desc');
    }
  };

  const handleAIAnalyzeClick = (stock) => {
    // Don't open modal if already analyzing this stock
    if (analyzingStocks.has(stock.ticker)) {
      return;
    }
    
    // Close any existing modal first
    setSelectedStock(null);
    
    // Small delay to ensure clean state, then open modal and start analysis
    setTimeout(() => {
      setSelectedStock(stock);
      // Analysis will start automatically when AIWorker mounts
    }, 100);
  };

  const closeTerminal = () => {
    setSelectedStock(null);
  };

  const handleWorkerStart = (ticker) => {
    setAnalyzingStocks(prev => new Set([...prev, ticker]));
  };

  const handleWorkerComplete = (ticker, result) => {
    setStockAnalyses(prev => ({
      ...prev,
      [ticker]: {
        ...result,
        savedLogs: result.savedLogs || [],
        completedAt: new Date().toISOString()
      }
    }));
    
    setAnalyzingStocks(prev => {
      const newSet = new Set(prev);
      newSet.delete(ticker);
      return newSet;
    });
  };

  // Enhanced stock data with real-time price data
  const getEnhancedStock = (stock) => {
    const savedAnalysis = stockAnalyses[stock.ticker];
    const realtimeData = priceData.get(stock.ticker);
    
    return {
      ...stock,
      // Use real-time price data if available
      currentPrice: realtimeData?.currentPrice || stock.currentPrice,
      changePercent: realtimeData?.changePercent || stock.changePercent,
      lastUpdated: realtimeData?.lastUpdated,
      // AI analysis data
      buySignal: savedAnalysis || stock.buySignal,
      isAnalyzing: analyzingStocks.has(stock.ticker),
      hasCustomAnalysis: !!savedAnalysis,
      hasSavedLogs: !!(savedAnalysis?.savedLogs?.length > 0),
      // Animation state
      priceAnimation: priceAnimations.get(stock.ticker)
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

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '';
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    if (secondsAgo < 5) return 'Live';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo}m ago`;
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'updating':
        return <WifiOff className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `Price Data (${getTimeSinceUpdate()})`;
      case 'updating':
        return 'Updating Prices...';
      case 'error':
        return 'Update Failed';
      default:
        return 'Disconnected';
    }
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
      className={`px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {sortBy === field && (
          <div className={`p-1 rounded ${sortOrder === 'asc' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
            {sortOrder === 'asc' ? 
              <ChevronUp className="w-3 h-3 text-blue-400" /> : 
              <ChevronDown className="w-3 h-3 text-purple-400" />
            }
          </div>
        )}
      </div>
    </th>
  );

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-6 border-b border-gray-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  AI Stock Analysis
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  {/* Price polling status indicator */}
                  <div className="flex items-center space-x-2">
                    {getConnectionIcon()}
                    <span className="text-sm text-gray-300 font-medium">
                      {getConnectionText()}
                    </span>
                    {connectionStatus === 'error' && (
                      <button 
                        onClick={refresh}
                        className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                  <div className="w-px h-4 bg-gray-500"></div>
                  <div className="text-sm text-gray-400">
                    Price Updates Every Minute
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex items-center space-x-4">
              {analyzingStocks.size > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                  <span className="text-purple-400 font-medium">
                    {analyzingStocks.size} Analyzing...
                  </span>
                </div>
              )}
              
              <button
                onClick={() => {
                  const unanalyzedStocks = stocks.filter(stock => 
                    !stockAnalyses[stock.ticker] && 
                    !analyzingStocks.has(stock.ticker) &&
                    stock.latestNews?.minutesAgo < 120 && 
                    stock.currentPrice
                  );
                  
                  if (unanalyzedStocks.length > 0 && onAnalyzeAll) {
                    onAnalyzeAll(unanalyzedStocks);
                  }
                }}
                disabled={analyzingStocks.size > 0}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-800 disabled:to-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Brain className="w-5 h-5" />
                <span>Analyze All</span>
                <Target className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50">
              <tr>
                <SortHeader field="ticker">Stock</SortHeader>
                <SortHeader field="currentPrice">Live Price</SortHeader>
                <SortHeader field="newsCount">News</SortHeader>
                <SortHeader field="buySignal">AI Signal</SortHeader>
                <SortHeader field="latestNews">Latest News</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {sortedStocks.map((stock, index) => (
                <tr 
                  key={stock.ticker}
                  className={`transition-all duration-300 ${
                    selectedStock?.ticker === stock.ticker 
                      ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-l-4 border-purple-500 shadow-lg' 
                      : 'hover:bg-gray-700/50 hover:shadow-md'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Enhanced Stock Info */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-white">{stock.ticker}</div>
                        {stock.companyName && (
                          <div className="text-sm text-gray-400 truncate max-w-32">{stock.companyName}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {stock.isAnalyzing && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />
                        )}
                        {stock.hasCustomAnalysis && (
                          <div className="p-1 bg-green-500/20 rounded-full">
                            <CheckCircle className="w-4 h-4 text-green-400" title="AI Analyzed" />
                          </div>
                        )}
                        {stock.hasSavedLogs && (
                          <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" title="Has saved analysis" />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Enhanced Real-Time Price */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="space-y-2">
                      {/* Price with enhanced animation */}
                      <div className={`text-white font-bold text-lg transition-all duration-500 ${
                        stock.priceAnimation === 'price-up' ? 'text-green-400 scale-110 drop-shadow-lg' : 
                        stock.priceAnimation === 'price-down' ? 'text-red-400 scale-110 drop-shadow-lg' : 
                        'text-white'
                      }`}>
                        ${formatPrice(stock.currentPrice)}
                      </div>
                      
                      {/* Enhanced change percentage */}
                      <div className={`text-sm flex items-center font-semibold ${
                        stock.changePercent > 0 ? 'text-green-400' : 
                        stock.changePercent < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stock.changePercent > 0 ? 
                          <TrendingUp className="w-4 h-4 mr-1" /> : 
                          <TrendingDown className="w-4 h-4 mr-1" />
                        }
                        <span>{formatPercent(stock.changePercent)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Enhanced News Count */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-2 bg-blue-500/10 rounded-full px-3 py-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-bold">{stock.newsCount}</span>
                      </div>
                    </div>
                  </td>

                  {/* ✅ UPDATED: Enhanced AI Signal with EOD Forecast & Lightning Bolt */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    {stock.buySignal ? (
                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-700/30 transition-all duration-300">
                        <span className="text-3xl">{getBuySignalIcon(stock.buySignal.buyPercentage)}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className={`font-bold text-xl ${getBuySignalColor(stock.buySignal.buyPercentage)}`}>
                              {stock.buySignal.buyPercentage}%
                            </div>
                            {/* ✅ EOD Forecast Display */}
                            {stock.buySignal.eodForecast && (
                              <div className="text-sm">
                                <span className="text-gray-400">EOD:</span>
                                <span className={`ml-1 font-semibold ${
                                  stock.buySignal.eodForecast > stock.currentPrice ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  ${stock.buySignal.eodForecast.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            {stock.buySignal.signal.replace('_', ' ')}
                          </div>
                        </div>
                        {stock.hasCustomAnalysis && (
                          <div className="flex items-center space-x-2">
                            {/* ✅ Lightning bolt for re-analysis (removed text button) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAIAnalyzeClick(stock);
                              }}
                              disabled={stock.isAnalyzing}
                              className="p-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 hover:text-purple-300 rounded-lg transition-all duration-300 disabled:opacity-50 group"
                              title="Re-analyze with AI"
                            >
                              <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="flex items-center space-x-3 p-3 rounded-xl bg-gray-700/20 hover:bg-purple-900/20 transition-all duration-300 cursor-pointer group"
                        onClick={() => handleAIAnalyzeClick(stock)}
                      >
                        <Brain className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                        <div className="text-gray-400 group-hover:text-purple-400 transition-colors">
                          {stock.isAnalyzing ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                              <span className="text-purple-400 font-medium">Analyzing...</span>
                            </div>
                          ) : (
                            <span className="font-medium">Click to Analyze</span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Enhanced Latest News */}
                  <td className="px-6 py-5">
                    <div className="max-w-xs">
                      <div className="text-sm text-white font-medium mb-1 truncate">
                        {stock.latestNews?.title || 'No recent news'}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs font-medium ${
                            stock.latestNews?.minutesAgo < 60 ? 'text-green-400' : 
                            stock.latestNews?.minutesAgo < 240 ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {stock.latestNews ? formatTime(stock.latestNews.minutesAgo) : 'N/A'}
                          </span>
                        </div>
                        {selectedStock?.ticker === stock.ticker && (
                          <div className="flex items-center space-x-1 text-purple-300 text-xs bg-purple-900/30 rounded-full px-2 py-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <span>Active</span>
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

        {/* Enhanced Empty State */}
        {stocks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">No stocks found</h3>
            <p className="text-gray-400">Try refreshing or check back later</p>
          </div>
        )}
      </div>

      {/* Enhanced AI Worker Modal with Auto-Start */}
      {selectedStock && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStock(null)} // ✅ Click outside to close
        >
          <AIWorker
            stock={selectedStock}
            autoStart={true} // ✅ Auto-start analysis when modal opens
            isActive={true}
            onAnalysisStart={handleWorkerStart}
            onAnalysisComplete={handleWorkerComplete}
            onClose={() => setSelectedStock(null)} // ✅ X button close
            savedLogs={stockAnalyses[selectedStock.ticker]?.savedLogs || null}
            savedResult={stockAnalyses[selectedStock.ticker] || null}
          />
        </div>
      )}
    </>
  );
}