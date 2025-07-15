// src/components/FilteringStats.jsx - Enhanced Modern Stats Dashboard
import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export function FilteringStats({
  newsData,
  loading,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
}) {
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

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
  } = newsData;
  const aiAnalyzedCount = stocks.filter((s) => s.buySignal).length;

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
    },
    {
      icon: TrendingUp,
      label: "Positive Stocks",
      value: stocks.length,
      subtitle: `From ${allStocks.length} total`,
      trend: stocks.length > 0 ? "up" : "neutral",
      change:
        stocks.length > 0
          ? `${((stocks.length / allStocks.length) * 100).toFixed(0)}%`
          : "0%",
      gradient: "from-green-500 to-emerald-500",
      iconColor: "text-green-400",
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
    <div className="mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 overflow-hidden"
            >
              {/* Background Gradient Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}
              ></div>

              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}
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
                </div>
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          );
        })}
      </div>

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
              <span className="text-sm text-gray-300">Filters:</span>
              <span className="text-sm text-blue-400">
                Positive Sentiment Only
              </span>
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
