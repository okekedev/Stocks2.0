// src/components/Header.jsx - Clean Header (No Price Filter)
import React from 'react';
import { TrendingUp, Clock, Zap } from 'lucide-react';

export function Header({ lastUpdate }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 shadow-2xl">
      {/* Main Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Branding */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                StockAI Pro
              </h1>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-gray-400">Real-time Market Intelligence</span>
                <span className="text-gray-500">•</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Last Update Only */}
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">Developed by: Christian Okeke</span>
            </div>
            
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800/50 border-t border-gray-700/50 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-gray-400">News refresh every 5 minutes - Prices update every minute</span>
            </div>
            
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Market Data Provider: Polygon.io</span>
            <span>•</span>
            <span>AI Engine: Gemini</span>
          </div>
        </div>
      </div>
    </header>
  );
}