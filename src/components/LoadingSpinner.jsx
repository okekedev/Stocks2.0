// src/components/LoadingSpinner.jsx
import React from 'react';
import { Brain, Newspaper, TrendingUp } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Animated Icons */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="animate-bounce">
          <Newspaper className="w-8 h-8 text-blue-400" />
        </div>
        <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>
          <Brain className="w-8 h-8 text-purple-400" />
        </div>
        <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
          <TrendingUp className="w-8 h-8 text-green-400" />
        </div>
      </div>
      
      {/* Main Spinner */}
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-purple-400 opacity-20"></div>
      </div>
      
      {/* Loading Text */}
      <div className="mt-6 text-center">
        <h3 className="text-lg font-medium text-white mb-2">AI Analysis in Progress</h3>
        <div className="text-gray-400 space-y-1">
          <p>📰 Fetching positive sentiment news...</p>
          <p>🤖 Reading full article content...</p>
          <p>📊 Analyzing 30-minute price action...</p>
          <p>🎯 Generating trading signals...</p>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="mt-6 w-64 bg-gray-700 rounded-full h-2">
        <div className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
      </div>
    </div>
  );
}