// src/components/Footer.jsx - Modern Professional Footer
import React from 'react';
import { 
  TrendingUp, 
  Shield, 
  Database, 
  Brain, 
  AlertTriangle, 
  ExternalLink,
  Github,
  Twitter,
  Mail,
  Heart,
  Zap,
  Globe
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700/50 mt-12">
      {/* Main Footer Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">StockAI Pro</h3>
                  <p className="text-xs text-gray-400">Market Intelligence</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Advanced AI-powered stock analysis platform providing real-time market insights 
                and trading signals for informed investment decisions.
              </p>
              <div className="flex items-center space-x-3">
                <button className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
                  <Github className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
                <button className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
                  <Twitter className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                </button>
                <button className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
                  <Mail className="w-4 h-4 text-gray-400 hover:text-green-400" />
                </button>
              </div>
            </div>

            {/* Technology Stack */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                Technology
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <Database className="w-3 h-3 text-blue-400" />
                  <span>Polygon.io API</span>
                  <ExternalLink className="w-3 h-3" />
                </li>
                <li className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>Google Gemini AI</span>
                  <ExternalLink className="w-3 h-3" />
                </li>
                <li className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <Globe className="w-3 h-3 text-green-400" />
                  <span>Real-time WebSocket</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>React + Vite</span>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">
                  → AI Trading Signals
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  → Real-time Price Updates
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  → Sentiment Analysis
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  → Market News Integration
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  → Advanced Filtering
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  → Portfolio Analytics
                </li>
              </ul>
            </div>

            {/* Status & Info */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-green-400" />
                System Status
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-400">API Status</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-400">AI Engine</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-400">Data Feed</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Section */}
      <div className="bg-red-900/20 border-t border-red-700/30 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300 leading-relaxed">
              <strong className="text-red-200">Investment Disclaimer:</strong> This platform provides AI-generated 
              analysis for educational and informational purposes only. All trading signals, predictions, and 
              recommendations are not financial advice. Stock trading involves substantial risk of loss. 
              Past performance does not guarantee future results. Always conduct your own research and 
              consider consulting with a qualified financial advisor before making investment decisions.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-900/80 border-t border-gray-700/30 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>© {currentYear} StockAI Pro. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Market data delayed 15 minutes</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Built with React & AI</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <button className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                API Documentation
              </button>
              <div className="flex items-center space-x-1 text-gray-400">
                <span>Made with</span>
                <Heart className="w-3 h-3 text-red-400" />
                <span>for traders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}