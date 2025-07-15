// src/components/NewsTable.jsx - Updated with Dropdown for Article Summaries
import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Brain,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Wifi,
  WifiOff,
  AlertCircle,
  Activity,
  Target,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { AIWorker } from "./AIWorker";
import { usePricePolling } from "../hooks/usePricePolling";

export function NewsTable({
  stocks,
  allArticles,
  onAnalyzeAll,
  persistentAnalyses = {},
  onAnalysisComplete,
}) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [sortBy, setSortBy] = useState("buySignal");
  const [sortOrder, setSortOrder] = useState("desc");
  const [analyzingStocks, setAnalyzingStocks] = useState(new Set());
  const [priceAnimations, setPriceAnimations] = useState(new Map());
  const [expandedRows, setExpandedRows] = useState(new Set()); // New state for expanded rows

  // Use ref to track previous prices to avoid infinite loop
  const previousPricesRef = useRef(new Map());

  // Price polling for updates (every 1 minute)
  const {
    priceData,
    isPolling,
    connectionStatus,
    refresh,
    getTimeSinceUpdate,
  } = usePricePolling(stocks, 60000);

  // Track price changes for animations - Updated for polling
  useEffect(() => {
    const newAnimations = new Map();

    priceData.forEach((newPrice, ticker) => {
      const previousPrice = previousPricesRef.current.get(ticker);

      // Only animate if we have a previous price and it's actually different
      if (
        previousPrice &&
        newPrice.currentPrice &&
        Math.abs(previousPrice - newPrice.currentPrice) > 0.01
      ) {
        const animation =
          newPrice.currentPrice > previousPrice ? "price-up" : "price-down";
        newAnimations.set(ticker, animation);

        // Clear animation after 2 seconds (longer for polling)
        setTimeout(() => {
          setPriceAnimations((prev) => {
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
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "latestNews" ? "asc" : "desc");
    }
  };

  // Toggle row expansion
  const toggleRow = (ticker) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticker)) {
        newSet.delete(ticker);
      } else {
        newSet.add(ticker);
      }
      return newSet;
    });
  };

  // Smart click handler that doesn't auto-start for existing analyses
  const handleAIAnalyzeClick = (stock) => {
    // Close any existing modal first
    setSelectedStock(null);

    // Small delay to ensure clean state, then open modal
    setTimeout(() => {
      setSelectedStock(stock);
      // AIWorker will decide whether to auto-start based on existing analysis
    }, 100);
  };

  const closeTerminal = () => {
    setSelectedStock(null);
  };

  const handleWorkerStart = (ticker) => {
    setAnalyzingStocks((prev) => new Set([...prev, ticker]));
  };

  // Don't automatically close modal after analysis completes
  const handleWorkerComplete = (ticker, result) => {
    // Update persistent analyses through a callback to useNewsData
    if (onAnalysisComplete) {
      onAnalysisComplete(ticker, result);
    }

    setAnalyzingStocks((prev) => {
      const newSet = new Set(prev);
      newSet.delete(ticker);
      return newSet;
    });

    // MODAL STAYS OPEN - Let user read results and manually close
  };

  // Enhanced stock data with real-time price data
  const getEnhancedStock = (stock) => {
    const savedAnalysis = persistentAnalyses[stock.ticker]; // Use persistent analyses
    const realtimeData = priceData.get(stock.ticker);

    return {
      ...stock,
      // Use real-time price data if available
      currentPrice: realtimeData?.currentPrice || stock.currentPrice,
      changePercent: realtimeData?.changePercent || stock.changePercent,
      lastUpdated: realtimeData?.lastUpdated,
      // AI analysis data - prioritize persistent over stock.buySignal
      buySignal: savedAnalysis || stock.buySignal,
      isAnalyzing: analyzingStocks.has(stock.ticker),
      hasCustomAnalysis: !!savedAnalysis,
      hasSavedLogs: !!(savedAnalysis?.savedLogs?.length > 0),
      // Animation state
      priceAnimation: priceAnimations.get(stock.ticker),
    };
  };

  const sortedStocks = stocks.map(getEnhancedStock).sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case "buySignal":
        aVal = a.buySignal?.buyPercentage || 0;
        bVal = b.buySignal?.buyPercentage || 0;
        break;
      case "latestNews":
        aVal = a.latestNews?.minutesAgo || 999999;
        bVal = b.latestNews?.minutesAgo || 999999;
        break;
      case "ticker":
        aVal = a.ticker;
        bVal = b.ticker;
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      case "currentPrice":
        aVal = a.currentPrice || 0;
        bVal = b.currentPrice || 0;
        break;
      default:
        return 0;
    }

    if (sortBy === "ticker") return 0;
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatPercent = (value) => {
    const formatted = Math.abs(value).toFixed(2);
    return `${value >= 0 ? "+" : "-"}${formatted}%`;
  };

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  return (
    <>
      {/* Enhanced Header with Real-time Updates */}
      <div className="bg-gray-900 rounded-t-xl px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h2 className="text-xl font-bold text-white">Market Movers</h2>

            {/* Real-time Connection Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`flex items-center ${
                    connectionStatus === "connected"
                      ? "text-green-400"
                      : connectionStatus === "error"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {connectionStatus === "connected" ? (
                    <Wifi className="w-4 h-4" />
                  ) : connectionStatus === "error" ? (
                    <WifiOff className="w-4 h-4" />
                  ) : (
                    <Activity className="w-4 h-4 animate-pulse" />
                  )}
                  <span className="text-sm font-medium ml-1">
                    {connectionStatus === "connected"
                      ? "Live"
                      : connectionStatus === "error"
                      ? "Offline"
                      : "Updating..."}
                  </span>
                </div>

                {/* Last Update Timer */}
                <div className="flex items-center text-gray-400 text-sm">
                  {isPolling && connectionStatus === "connected" && (
                    <span>Updated {getTimeSinceUpdate()}</span>
                  )}
                </div>
                <div className="w-px h-4 bg-gray-500"></div>
                <div className="text-sm text-gray-400">
                  Price Updates Every Minute
                </div>
                {/* Show persistent analysis count */}
                {Object.keys(persistentAnalyses).length > 0 && (
                  <>
                    <div className="w-px h-4 bg-gray-500"></div>
                    <div className="text-sm text-purple-300">
                      {Object.keys(persistentAnalyses).length} Analyzed
                    </div>
                  </>
                )}
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
                const unanalyzedStocks = stocks.filter(
                  (stock) =>
                    !persistentAnalyses[stock.ticker] && // Use persistent analyses
                    !analyzingStocks.has(stock.ticker) &&
                    stock.latestNews?.minutesAgo < 120 &&
                    stock.currentPrice &&
                    stock.dominantSentiment === "positive" // Only positive sentiment for AI analysis
                );

                if (unanalyzedStocks.length > 0 && onAnalyzeAll) {
                  onAnalyzeAll(unanalyzedStocks);
                }
              }}
              disabled={stocks.every(
                (stock) =>
                  persistentAnalyses[stock.ticker] ||
                  analyzingStocks.has(stock.ticker) ||
                  stock.latestNews?.minutesAgo >= 120 ||
                  !stock.currentPrice ||
                  stock.dominantSentiment !== "positive"
              )}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-lg disabled:shadow-none"
            >
              <Brain className="w-4 h-4" />
              <span className="font-medium">
                Analyze All (
                {
                  stocks.filter(
                    (stock) =>
                      !persistentAnalyses[stock.ticker] &&
                      !analyzingStocks.has(stock.ticker) &&
                      stock.latestNews?.minutesAgo < 120 &&
                      stock.currentPrice &&
                      stock.dominantSentiment === "positive"
                  ).length
                }
                )
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-gray-900 rounded-b-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-800 to-gray-900">
                <th
                  onClick={() => handleSort("ticker")}
                  className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock</span>
                    {sortBy === "ticker" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("currentPrice")}
                  className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Price</span>
                    {sortBy === "currentPrice" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-300 uppercase tracking-wider">
                  News
                </th>
                <th
                  onClick={() => handleSort("buySignal")}
                  className="px-6 py-4 text-center text-xs font-bold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>AI Signal</span>
                    {sortBy === "buySignal" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("latestNews")}
                  className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Latest News</span>
                    {sortBy === "latestNews" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedStocks.map((stock) => (
                <React.Fragment key={stock.ticker}>
                  <tr
                    className={`hover:bg-gray-800/50 transition-all duration-200 ${
                      stock.priceAnimation === "price-up"
                        ? "animate-flash-green"
                        : stock.priceAnimation === "price-down"
                        ? "animate-flash-red"
                        : ""
                    } cursor-pointer ${
                      stock.dominantSentiment === "negative"
                        ? "bg-red-900/5 hover:bg-red-900/10"
                        : stock.dominantSentiment === "neutral"
                        ? "bg-gray-800/20 hover:bg-gray-800/40"
                        : ""
                    }`}
                    onClick={() => toggleRow(stock.ticker)}
                  >
                    {/* Enhanced Stock Info with Sentiment */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-white">
                            {stock.ticker}
                          </span>
                          {/* Sentiment Indicator */}
                          {stock.dominantSentiment && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                stock.dominantSentiment === "positive"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : stock.dominantSentiment === "negative"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                              }`}
                            >
                              {stock.dominantSentiment === "positive"
                                ? "↑"
                                : stock.dominantSentiment === "negative"
                                ? "↓"
                                : "→"}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(stock.ticker);
                            }}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            {expandedRows.has(stock.ticker) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <span className="text-sm text-gray-400 hidden sm:inline">
                          {stock.companyName}
                        </span>
                      </div>
                    </td>

                    {/* Enhanced Price Display with Sentiment Awareness */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div
                          className={`text-lg font-bold text-white ${
                            stock.priceAnimation === "price-up"
                              ? "text-green-400"
                              : stock.priceAnimation === "price-down"
                              ? "text-red-400"
                              : ""
                          }`}
                        >
                          {formatPrice(stock.currentPrice)}
                        </div>
                        <div
                          className={`flex items-center text-sm font-medium ${
                            stock.changePercent >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {stock.changePercent > 0 ? (
                            <TrendingUp className="w-4 h-4 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-1" />
                          )}
                          <span>{formatPercent(stock.changePercent)}</span>
                        </div>
                        {/* Sentiment Context */}
                        {stock.dominantSentiment === "negative" &&
                          stock.changePercent > 0 && (
                            <div className="text-xs text-orange-400 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              <span>Bearish news</span>
                            </div>
                          )}
                        {stock.dominantSentiment === "positive" &&
                          stock.changePercent < -1 && (
                            <div className="text-xs text-yellow-400 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              <span>Dip opportunity?</span>
                            </div>
                          )}
                      </div>
                    </td>

                    {/* Enhanced News Count with Sentiment Breakdown */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col items-center space-y-1">
                        <div className="flex items-center space-x-2 bg-blue-500/10 rounded-full px-3 py-2">
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-bold">
                            {stock.newsCount}
                          </span>
                        </div>
                        {/* Sentiment Breakdown */}
                        {stock.sentimentBreakdown && (
                          <div className="flex items-center space-x-1 text-xs">
                            {stock.sentimentBreakdown.positive > 0 && (
                              <span className="text-green-400">
                                +{stock.sentimentBreakdown.positive}
                              </span>
                            )}
                            {stock.sentimentBreakdown.negative > 0 && (
                              <span className="text-red-400">
                                -{stock.sentimentBreakdown.negative}
                              </span>
                            )}
                            {stock.sentimentBreakdown.neutral > 0 && (
                              <span className="text-gray-400">
                                ={stock.sentimentBreakdown.neutral}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Enhanced AI Signal Display - Only for Positive Sentiment */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      {stock.dominantSentiment === "positive" ? (
                        stock.buySignal ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIAnalyzeClick(stock);
                            }}
                            className="cursor-pointer group"
                          >
                            <div
                              className={`flex flex-col items-center space-y-2 px-4 py-2 rounded-lg transition-all ${
                                stock.buySignal.buyPercentage >= 70
                                  ? "bg-gradient-to-r from-green-900/40 to-green-800/40 group-hover:from-green-900/60 group-hover:to-green-800/60"
                                  : stock.buySignal.buyPercentage >= 40
                                  ? "bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 group-hover:from-yellow-900/60 group-hover:to-yellow-800/60"
                                  : "bg-gradient-to-r from-red-900/40 to-red-800/40 group-hover:from-red-900/60 group-hover:to-red-800/60"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <Target
                                  className={`w-4 h-4 ${
                                    stock.buySignal.buyPercentage >= 70
                                      ? "text-green-400"
                                      : stock.buySignal.buyPercentage >= 40
                                      ? "text-yellow-400"
                                      : "text-red-400"
                                  }`}
                                />
                                <span
                                  className={`text-lg font-bold ${
                                    stock.buySignal.buyPercentage >= 70
                                      ? "text-green-400"
                                      : stock.buySignal.buyPercentage >= 40
                                      ? "text-yellow-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {stock.buySignal.buyPercentage}%
                                </span>
                              </div>
                              <span
                                className={`text-xs font-medium ${
                                  stock.buySignal.buyPercentage >= 70
                                    ? "text-green-300"
                                    : stock.buySignal.buyPercentage >= 40
                                    ? "text-yellow-300"
                                    : "text-red-300"
                                }`}
                              >
                                8hr:{" "}
                                {stock.buySignal.targetPrice8h
                                  ? `${stock.buySignal.targetPrice8h}`
                                  : "N/A"}
                              </span>
                              {stock.hasSavedLogs && (
                                <CheckCircle className="w-3 h-3 text-purple-400" />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIAnalyzeClick(stock);
                            }}
                            className="cursor-pointer group"
                          >
                            <div className="flex items-center justify-center px-4 py-3 bg-gray-800/50 rounded-lg hover:bg-purple-900/30 transition-all group-hover:scale-105">
                              <Brain className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors mr-2" />
                              {stock.isAnalyzing ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                                  <span className="text-purple-400 font-medium">
                                    Analyzing...
                                  </span>
                                </div>
                              ) : (
                                <span className="font-medium">
                                  Click to Analyze
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center">
                          <div
                            className={`text-xs px-3 py-2 rounded-lg font-medium ${
                              stock.dominantSentiment === "negative"
                                ? "bg-red-900/20 text-red-400 border border-red-500/20"
                                : "bg-gray-700/20 text-gray-400 border border-gray-600/20"
                            }`}
                          >
                            {stock.dominantSentiment === "negative"
                              ? "Bearish Sentiment"
                              : "Neutral Sentiment"}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Enhanced Latest News */}
                    <td className="px-6 py-5">
                      <div className="max-w-xs">
                        <div className="text-sm text-white font-medium mb-1 truncate">
                          {stock.latestNews?.title || "No recent news"}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span
                              className={`text-xs font-medium ${
                                stock.latestNews?.minutesAgo < 60
                                  ? "text-green-400"
                                  : stock.latestNews?.minutesAgo < 240
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {stock.latestNews
                                ? formatTime(stock.latestNews.minutesAgo)
                                : "N/A"}
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

                  {/* Expanded Row - News Details */}
                  {expandedRows.has(stock.ticker) &&
                    stock.articles &&
                    stock.articles.length > 0 && (
                      <tr className="bg-gray-800/30">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {stock.articles.map((article, index) => (
                              <div
                                key={article.id || index}
                                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <Newspaper className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                                      <h4 className="text-white font-medium text-sm leading-tight">
                                        {article.title}
                                      </h4>
                                    </div>

                                    {article.description && (
                                      <p className="text-gray-400 text-sm leading-relaxed pl-6">
                                        {article.description}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-4 mt-3 pl-6">
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {formatTime(article.minutesAgo)}
                                        </span>
                                      </div>

                                      {article.sentiment && (
                                        <div
                                          className={`text-xs px-2 py-1 rounded-full ${
                                            article.sentiment === "positive"
                                              ? "bg-green-900/30 text-green-400"
                                              : article.sentiment === "negative"
                                              ? "bg-red-900/30 text-red-400"
                                              : "bg-gray-700/30 text-gray-400"
                                          }`}
                                        >
                                          {article.sentiment}
                                        </div>
                                      )}

                                      <a
                                        href={article.articleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                                      >
                                        <span>Read full article</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                </React.Fragment>
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
            <h3 className="text-xl font-bold text-gray-300 mb-2">
              No stocks found
            </h3>
            <p className="text-gray-400">Try refreshing or check back later</p>
          </div>
        )}
      </div>

      {/* AI Worker Modal */}
      {selectedStock && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStock(null)}
        >
          <AIWorker
            stock={selectedStock}
            autoStart={true}
            isActive={true}
            onAnalysisStart={handleWorkerStart}
            onAnalysisComplete={handleWorkerComplete}
            onClose={() => setSelectedStock(null)}
            savedLogs={
              persistentAnalyses[selectedStock.ticker]?.savedLogs || null
            }
            savedResult={persistentAnalyses[selectedStock.ticker] || null}
          />
        </div>
      )}
    </>
  );
}
