// src/components/FilteringStats.jsx - Enhanced Modern Stats Dashboard
import React, { useState, useEffect } from 'react';
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
  DollarSign
} from 'lucide-react';

export function FilteringStats({ newsData, loading, minPrice, setMinPrice, maxPrice, setMaxPrice }) {
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

  // Get progress percentage for countdown
  const getCountdownProgress = (seconds) => {
    return ((300 - seconds) / 300) * 100;
  };

  // Get status color based on countdown
  const getCountdownColor = (seconds) => {
    if (seconds > 240) return 'text-green-400'; // Green for fresh
    if (seconds > 120) return 'text-yellow-400'; // Yellow for medium
    return 'text-orange-400'; // Orange for stale
  };

  if (loading || !newsData) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-700 rounded-xl"></div>
                <div className="w-8 h-4 bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="w-16 h-8 bg-gray-700 rounded"></div>
                <div className="w-24 h-3 bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const aiAnalyzedCount = newsData.stocks?.filter(s => s.buySignal).length || 0;

  const stats = [
    {
      label: 'Via News API',
      value: newsData.totalArticles || 0,
      subtitle: 'Positive Articles',
      icon: Newspaper,
      color: 'emerald',
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-500/10 to-green-600/10',
      borderColor: 'border-emerald-500/30',
      trend: 'up'
    },
    {
      label: 'With positive news',
      value: newsData.stocks?.length || 0,
      subtitle: 'Stocks on Robinhood',
      icon: BarChart3,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-600/10',
      borderColor: 'border-blue-500/30',
      trend: 'up'
    },
    {
      label: 'Analyzed by AI',
      value: aiAnalyzedCount,
      subtitle: 'Stock(s)',
      icon: Brain,
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
      bgGradient: 'from-purple-500/10 to-violet-600/10',
      borderColor: 'border-purple-500/30',
      change: 'Ready',
      trend: 'neutral'
    },
    {
      value: formatCountdown(countdown),
      subtitle: 'News refresh timer',
      icon: Clock,
      color: 'orange',
      gradient: 'from-orange-500 to-amber-600',
      bgGradient: 'from-orange-500/10 to-amber-600/10',
      borderColor: 'border-orange-500/30',
      progress: getCountdownProgress(countdown),
      isCountdown: true
    }
  ];

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-400" />
            Market Overview
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time analysis of market opportunities</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          
          return (
            <div 
              key={stat.label}
              className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border ${stat.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-2xl group overflow-hidden`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  {stat.change && !stat.isCountdown && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      stat.trend === 'up' ? 'bg-green-900/50 text-green-400' :
                      stat.trend === 'down' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-700/50 text-gray-400'
                    }`}>
                      {stat.change}
                    </div>
                  )}
                </div>

                {/* Main Value */}
                <div className="mb-3">
                  <div className={`text-3xl font-bold text-white mb-1 ${stat.isCountdown ? getCountdownColor(countdown) : ''}`}>
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
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                  
                    </div>
                  </div>
                )}

                {/* Label */}
                <div className="text-sm font-medium text-gray-300 flex items-center">
                  {stat.label}
                  {stat.label === 'AI Analyzed' && aiAnalyzedCount === 0 && (
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
        <div className="flex items-center justify-between">
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
              <span className="text-sm text-blue-400">Positive Sentiment Only</span>
            </div>
          </div>
          
          {/* Price Filter */}
          <div className="flex items-center space-x-3 bg-gray-700/50 rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-300">Price Range:</span>
            </div>
            <div className="flex items-center space-x-2">
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