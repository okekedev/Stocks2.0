// src/components/FilteringStats.jsx - Enhanced with Articles Dropdown
import React, { useState, useEffect, useRef } from "react";
import {
  Filter,
  TrendingUp,
  Brain,
  Clock,
  Newspaper,
  BarChart3,
  Zap,
  Target,
  Activity,
  RefreshCw,
  DollarSign,
  X,
  ExternalLink,
  Search,
} from "lucide-react";

export function FilteringStats({
  newsData,
  loading,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sentimentFilter,
  setSentimentFilter,
}) {
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [showArticlesDropdown, setShowArticlesDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowArticlesDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get progress percentage for countdown
  const getCountdownProgress = (seconds) => {
    return ((300 - seconds) / 300) * 100;
  };

  // Get status color based on countdown
  const getCountdownColor = (seconds) => {
    if (seconds > 240) return "text-green-400"; // Green for fresh
    if (seconds > 120) return "text-yellow-400"; // Yellow for medium
    return "text-orange-400"; // Orange for stale
  };

  // Format time ago
  const formatTimeAgo = (minutes) => {
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading || !newsData) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-700 rounded-xl"></div>
                <div className="w-8 h-4 bg-gray-700 rounded"></div>
              </div>
              <div className="w-24 h-8 bg-gray-700 rounded mb-2"></div>
              <div className="w-32 h-4 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    stocks = [],
    allStocks = [],
    totalArticles = 0,
    recentArticles = 0,
    articles = [],
    sentimentFilter: currentFilter = "positive",
  } = newsData;
  const aiAnalyzedCount = stocks.filter((s) => s.buySignal).length;

  // Get sentiment label for display
  const getSentimentLabel = () => {
    switch (currentFilter) {
      case "positive":
        return "Positive";
      case "negative":
        return "Negative";
      case "neutral":
        return "Neutral";
      case "all":
        return "All";
      default:
        return "Positive";
    }
  };

  // Filter articles based on search
  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.ticker &&
        article.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    {
      icon: Newspaper,
      label: "Total Articles",
      value: totalArticles.toLocaleString(),
      subtitle: "Last 4 hours",
      trend: "up",
      change: `+${recentArticles}`,
      gradient: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400",
      isClickable: true,
      onClick: () => setShowArticlesDropdown(!showArticlesDropdown),
    },
    {
      icon: TrendingUp,
      label: `${getSentimentLabel()} Stocks`,
      value: stocks.length,
      subtitle: `From ${allStocks.length} total`,
      trend: stocks.length > 0 ? "up" : "neutral",
      change:
        stocks.length > 0
          ? `${((stocks.length / allStocks.length) * 100).toFixed(0)}%`
          : "0%",
      gradient:
        currentFilter === "negative"
          ? "from-red-500 to-rose-500"
          : currentFilter === "neutral"
          ? "from-gray-500 to-slate-500"
          : currentFilter === "all"
          ? "from-indigo-500 to-purple-500"
          : "from-green-500 to-emerald-500",
      iconColor:
        currentFilter === "negative"
          ? "text-red-400"
          : currentFilter === "neutral"
          ? "text-gray-400"
          : currentFilter === "all"
          ? "text-indigo-400"
          : "text-green-400",
    },
    {
      icon: Brain,
      label: "AI Analyzed",
      value: aiAnalyzedCount,
      subtitle: "Stocks analyzed",
      trend: aiAnalyzedCount > 0 ? "up" : "neutral",
      change:
        aiAnalyzedCount > 0
          ? `${((aiAnalyzedCount / stocks.length) * 100).toFixed(0)}%`
          : "0%",
      gradient: "from-purple-500 to-pink-500",
      iconColor: "text-purple-400",
    },
    {
      icon: RefreshCw,
      label: "Next Update",
      value: formatCountdown(countdown),
      subtitle: "Auto-refresh",
      isCountdown: true,
      progress: getCountdownProgress(countdown),
      gradient: "from-orange-500 to-red-500",
      iconColor: getCountdownColor(countdown),
    },
  ];

  return (
    <div className="mb-8 relative">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className={`group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 overflow-hidden ${
                stat.isClickable ? "cursor-pointer" : ""
              }`}
              onClick={stat.onClick}
            >
              {/* Background Gradient Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}
              ></div>

              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${
                      stat.gradient
                    } rounded-xl flex items-center justify-center shadow-lg ${
                      stat.isClickable
                        ? "group-hover:scale-110 transition-transform"
                        : ""
                    }`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.change && (
                    <div
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stat.trend === "up"
                          ? "bg-green-900/50 text-green-400"
                          : stat.trend === "down"
                          ? "bg-red-900/50 text-red-400"
                          : "bg-gray-700/50 text-gray-400"
                      }`}
                    >
                      {stat.change}
                    </div>
                  )}
                </div>

                {/* Main Value */}
                <div className="mb-3">
                  <div
                    className={`text-3xl font-bold text-white mb-1 ${
                      stat.isCountdown ? getCountdownColor(countdown) : ""
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.subtitle}</div>
                </div>

                {/* Progress Bar for Countdown */}
                {stat.isCountdown && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${stat.gradient} transition-all duration-1000`}
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Label */}
                <div className="text-sm font-medium text-gray-300 flex items-center">
                  {stat.label}
                  {stat.label === "AI Analyzed" && aiAnalyzedCount === 0 && (
                    <Target className="w-3 h-3 ml-1 text-purple-400" />
                  )}
                  {stat.isClickable && (
                    <span className="ml-1 text-xs text-gray-500">
                      (Click to view)
                    </span>
                  )}
                </div>
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          );
        })}
      </div>

      {/* Articles Dropdown */}
      {showArticlesDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-0 left-0 right-0 z-50 mt-2 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl p-6 border-b border-gray-700/50 rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Newspaper className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">All Articles</h3>
                <span className="text-sm text-gray-400">
                  ({filteredArticles.length} articles)
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowArticlesDropdown(false);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title or ticker..."
                className="w-full bg-gray-800/50 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* Articles List */}
          <div className="max-h-[500px] overflow-y-auto p-4">
            <div className="space-y-3">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No articles found</p>
                </div>
              ) : (
                filteredArticles.map((article, index) => (
                  <div
                    key={article.id || index}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {article.ticker && (
                            <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                              {article.ticker}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(article.minutesAgo)}
                          </span>
                          {article.sentiment && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                article.sentiment === "positive"
                                  ? "bg-green-500/20 text-green-400"
                                  : article.sentiment === "negative"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-gray-600/20 text-gray-400"
                              }`}
                            >
                              {article.sentiment}
                            </span>
                          )}
                        </div>

                        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {article.title}
                        </h4>

                        {article.description && (
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {article.description}
                          </p>
                        )}

                        <a
                          href={article.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>Read full article</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="mt-6 bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Market Status:</span>
              <span className="text-sm font-medium text-green-400">Active</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Sentiment:</span>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="bg-gray-700/80 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-blue-400 outline-none transition-all cursor-pointer hover:bg-gray-700"
              >
                <option value="positive">Positive Only</option>
                <option value="negative">Negative Only</option>
                <option value="neutral">Neutral Only</option>
                <option value="all">All Sentiments</option>
              </select>
            </div>
          </div>

          {/* Price Filter */}
          <div className="flex items-center space-x-3 bg-gray-700/50 rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-300">Price Range:</span>
            </div>
            <div className="flex items-center space-x-2">
              <style>{`
                /* Remove spinner arrows from number inputs */
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                input[type="number"] {
                  -moz-appearance: textfield;
                }
              `}</style>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-16 bg-gray-600/80 text-white text-sm rounded px-2 py-1 border border-gray-500 focus:border-emerald-400 outline-none transition-all"
                min="0"
                step="0.01"
                placeholder="Min"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20 bg-gray-600/80 text-white text-sm rounded px-2 py-1 border border-gray-500 focus:border-emerald-400 outline-none transition-all"
                min="0"
                step="1"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
