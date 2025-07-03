import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Clock, MessageSquare, Brain, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { StockChart } from './StockChart';
import { polygonService } from '../services/PolygonService';
import { geminiService } from '../services/GeminiService';

export function NewsTableWithCharts({ stocks, allArticles }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState('buySignal');
  const [sortOrder, setSortOrder] = useState('desc');
  const [hoveredStock, setHoveredStock] = useState(null);
  const [chartData, setChartData] = useState({});
  const [loadingChart, setLoadingChart] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'latestNews' ? 'asc' : 'desc');
    }
  };

  // Enhanced hover handler - fetches chart data
  const handleStockHover = async (stock) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredStock(stock.ticker);

    // Delay chart data fetching slightly to avoid excessive API calls
    hoverTimeoutRef.current = setTimeout(async () => {
      if (!chartData[stock.ticker] && !loadingChart) {
        setLoadingChart(stock.ticker);
        
        try {
          // Calculate time range: 1 hour before news to current time
          const newsTime = new Date(stock.latestNews?.publishedUtc || Date.now());
          const startTime = new Date(newsTime.getTime() - 60 * 60 * 1000); // 1 hour before news
          const endTime = new Date(); // Current time
          
          console.log(`[INFO] 📊 Fetching chart data for ${stock.ticker}`);
          
          // Fetch minute-by-minute data
          const minuteData = await polygonService.getDetailedMinuteData(
            stock.ticker, 
            startTime, 
            endTime
          );

          if (minuteData && minuteData.length > 0) {
            const chartDataPackage = {
              ticker: stock.ticker,
              newsTime: newsTime,
              data: minuteData,
              summary: {
                dataPoints: minuteData.length,
                timespan: `${Math.round((endTime - startTime) / (1000 * 60))} minutes`,
                priceMove: minuteData.length > 0 ? 
                  ((minuteData[minuteData.length - 1].close - minuteData[0].open) / minuteData[0].open) * 100 : 0
              }
            };

            setChartData(prev => ({
              ...prev,
              [stock.ticker]: chartDataPackage
            }));
          }
        } catch (error) {
          console.error(`[ERROR] Failed to fetch chart data for ${stock.ticker}:`, error);
        } finally {
          setLoadingChart(null);
        }
      }
    }, 300);
  };

  const handleStockLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    setTimeout(() => {
      setHoveredStock(null);
    }, 100);
  };

  const handleChartHover = (ticker) => {
    setHoveredStock(ticker);
  };

  // AI Analysis trigger (separate from hover)
  const handleAIAnalysis = async (stock) => {
    if (!chartData[stock.ticker]) {
      console.log('[WARNING] No chart data available for AI analysis');
      return;
    }

    setAnalyzingAI(stock.ticker);
    
    try {
      console.log(`[INFO] 🤖 AI analyzing ${stock.ticker}...`);
      
      // Use your existing GeminiService directly - let AI do everything!
      const buySignal = await geminiService.generateBuySignalWithChart(
        stock,
        chartData[stock.ticker]
      );

      // Update the stock with AI results
      const updatedStocks = stocks.map(s => 
        s.ticker === stock.ticker 
          ? { ...s, buySignal, aiAnalyzed: true, analysisTimestamp: new Date().toISOString() }
          : s
      );

      // You would update your main state here
      console.log(`[SUCCESS] AI analysis complete for ${stock.ticker}:`, buySignal);
      
    } catch (error) {
      console.error(`[ERROR] AI analysis failed for ${stock.ticker}:`, error);
    } finally {
      setAnalyzingAI(null);
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
    <div className="bg-gray-800 rounded-lg overflow-hidden relative">
      {/* Table Header */}
      <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Stock Analysis Results</h3>
            <p className="text-sm text-gray-400">
              {stocks.length} stocks • {stocks.filter(s => s.buySignal).length} AI analyzed • 
              <span className="text-purple-400 ml-1">Hover for charts • Click AI for analysis</span>
            </p>
          </div>
          <div className="text-sm text-gray-400">
            Chart Data: <span className="font-medium text-white">{Object.keys(chartData).length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
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
                className="hover:bg-gray-700 cursor-pointer transition-colors relative"
                onClick={() => setSelectedStock(stock)}
                onMouseEnter={() => handleStockHover(stock)}
                onMouseLeave={handleStockLeave}
              >
                {/* Stock Info */}
                <td className="px-6 py-4 whitespace-nowrap relative">
                  <div className="flex items-center space-x-2">
                    <div>
                      <div className="font-medium text-white">{stock.ticker}</div>
                      <div className="text-sm text-gray-400">{stock.exchange}</div>
                    </div>
                    {stock.buySignal && (
                      <Brain className="w-4 h-4 text-purple-400" title="AI Analyzed" />
                    )}
                    {chartData[stock.ticker] && (
                      <div className="w-2 h-2 bg-green-400 rounded-full" title="Chart data loaded" />
                    )}
                  </div>

                  {/* Hover Chart */}
                  {hoveredStock === stock.ticker && (
                    <div 
                      className="absolute left-full top-0 z-50 ml-2"
                      onMouseEnter={() => handleChartHover(stock.ticker)}
                      onMouseLeave={handleStockLeave}
                    >
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-2xl min-w-[400px]">
                        {loadingChart === stock.ticker ? (
                          <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                            <span className="ml-2 text-gray-400">Loading chart...</span>
                          </div>
                        ) : chartData[stock.ticker] ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white font-medium">{stock.ticker} - 1 Hour Chart</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAIAnalysis(stock);
                                }}
                                disabled={analyzingAI === stock.ticker}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded flex items-center space-x-1"
                              >
                                <Brain className="w-3 h-3" />
                                <span>{analyzingAI === stock.ticker ? 'Analyzing...' : 'AI Analyze'}</span>
                              </button>
                            </div>
                            
                            <StockChart 
                              data={chartData[stock.ticker]} 
                              height={200}
                              showNewsLine={true}
                            />
                            
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                              <div>
                                <span className="text-gray-400">Price Move:</span>
                                <span className={`ml-1 font-medium ${chartData[stock.ticker].summary.priceMove > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(chartData[stock.ticker].summary.priceMove)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Data Points:</span>
                                <span className="ml-1 text-white">{chartData[stock.ticker].summary.dataPoints}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-48 text-gray-400">
                            <div className="text-center">
                              <div className="text-2xl mb-2">📊</div>
                              <p>Chart data not available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                      {analyzingAI === stock.ticker && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      {chartData[stock.ticker] ? 
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAIAnalysis(stock);
                          }}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Click AI Analyze
                        </button>
                        : 'Need chart data'
                      }
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
                      {stock.aiAnalyzed && (
                        <div className="text-purple-300 text-xs">
                          🤖 AI Complete
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
  );
}