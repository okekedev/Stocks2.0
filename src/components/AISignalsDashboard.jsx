// src/components/AISignalsDashboard.jsx - Complete component
import React from 'react';
import { TrendingUp, Brain, Zap, AlertTriangle, Clock, Volume2, Target, DollarSign } from 'lucide-react';

export function AISignalsDashboard({ aiSignals = [], loading }) {
  const getSignalColor = (buyPercentage) => {
    if (buyPercentage >= 80) return 'text-green-400 bg-green-400/10 border-green-400/30';
    if (buyPercentage >= 60) return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    if (buyPercentage >= 40) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'strong_buy': return '🚀';
      case 'buy': return '📈';
      case 'hold': return '⏸️';
      default: return '❓';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
          <h2 className="text-xl font-bold text-white">AI Trading Signals</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
          <p className="text-gray-400">Reading articles and analyzing markets...</p>
        </div>
      </div>
    );
  }

  if (!aiSignals || aiSignals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">AI Trading Signals</h2>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">No Strong Signals</h3>
          <p className="text-gray-400">AI found no high-confidence trading opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">AI Trading Signals</h2>
          <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
            {aiSignals.length} SIGNALS
          </span>
        </div>
        <div className="text-sm text-gray-400">
          Live • {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Top Signal Highlight */}
      {aiSignals[0] && (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">👑</span>
              <span className="text-sm text-yellow-400 font-medium">TOP AI PICK</span>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {aiSignals[0].buySignal.buyPercentage}%
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{aiSignals[0].ticker}</div>
              <div className="text-purple-300">{aiSignals[0].buySignal.signal.replace('_', ' ').toUpperCase()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Entry • Target • Stop</div>
              <div className="text-white">
                ${aiSignals[0].buySignal.entryPrice?.toFixed(2)} • 
                ${aiSignals[0].buySignal.targetPrice?.toFixed(2)} • 
                ${aiSignals[0].buySignal.stopLoss?.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">AI Reasoning</div>
              <div className="text-white text-sm">{aiSignals[0].buySignal.reasoning}</div>
            </div>
          </div>
        </div>
      )}

      {/* Signals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {aiSignals.slice(1).map((stock, index) => (
          <div 
            key={stock.ticker}
            className={`border rounded-lg p-4 transition-all hover:scale-[1.02] ${getSignalColor(stock.buySignal.buyPercentage)}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg">{stock.ticker}</span>
                <span className="text-xl">{getSignalIcon(stock.buySignal.signal)}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  #{index + 2}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  {stock.buySignal.buyPercentage}%
                </div>
                <div className="text-xs opacity-75">
                  {stock.buySignal.signal.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Price & Risk Info */}
            <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
              <div>
                <div className="text-gray-400">Current</div>
                <div className="font-medium">${stock.currentPrice?.toFixed(2) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-400">Target</div>
                <div className="font-medium text-green-400">
                  ${stock.buySignal.targetPrice?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Risk</div>
                <div className={`font-medium ${getRiskColor(stock.buySignal.riskLevel)}`}>
                  {stock.buySignal.riskLevel?.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Price Action (if available) */}
            {stock.priceAction && (
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>30m: {stock.priceAction.priceChange > 0 ? '+' : ''}{stock.priceAction.priceChange}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Vol: {stock.priceAction.volumeRatio}x</span>
                  {stock.priceAction.volumeSpike && <Zap className="w-3 h-3 text-yellow-400" />}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="bg-black/20 rounded p-2 mb-3">
              <div className="text-xs text-gray-300 mb-1">AI Analysis:</div>
              <div className="text-sm">{stock.buySignal.reasoning}</div>
            </div>

            {/* Key Factors */}
            <div className="flex flex-wrap gap-1 mb-3">
              {stock.buySignal.keyFactors?.slice(0, 3).map((factor, i) => (
                <span 
                  key={i}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                >
                  {factor.replace(/_/g, ' ')}
                </span>
              ))}
            </div>

            {/* News Summary */}
            {stock.latestNews && (
              <div className="pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400 mb-1">Latest News:</div>
                <div className="text-sm truncate">{stock.latestNews.title}</div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{stock.latestNews.minutesAgo}m ago</span>
                  </div>
                  {stock.newsAnalysis && (
                    <div className="flex items-center space-x-1">
                      <span>Confidence: {Math.round(stock.newsAnalysis.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trading Disclaimer */}
      <div className="mt-6 p-3 bg-red-900/20 border border-red-700/30 rounded text-xs text-red-300">
        ⚠️ <strong>Disclaimer:</strong> AI-generated trading signals for educational purposes only. 
        Not financial advice. Always research and consider your risk tolerance before trading.
      </div>
    </div>
  );
}