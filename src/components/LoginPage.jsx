// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Brain, 
  Zap, 
  Shield,
  ArrowRight,
  Building2
} from 'lucide-react';

export function LoginPage({ onLogin, isLoading = false }) {
  const [animationPhase, setAnimationPhase] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const floatingElements = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.5,
    size: 20 + (i % 3) * 15,
    duration: 15 + (i % 4) * 5
  }));

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/30" />
        
        {/* Floating Elements */}
        {floatingElements.map((element) => (
          <div
            key={element.id}
            className="absolute opacity-10"
            style={{
              left: `${10 + (element.id * 8) % 80}%`,
              top: `${10 + (element.id * 13) % 80}%`,
              animationDelay: `${element.delay}s`,
              animationDuration: `${element.duration}s`
            }}
          >
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"
              style={{
                width: `${element.size}px`,
                height: `${element.size}px`,
                animation: `float ${element.duration}s ease-in-out infinite ${element.delay}s`
              }}
            />
          </div>
        ))}

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 144 }, (_, i) => (
              <div 
                key={i} 
                className="border border-gray-600 animate-pulse"
                style={{ animationDelay: `${(i * 0.1) % 3}s` }}
              />
            ))}
          </div>
        </div>

        {/* Moving Gradients */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div 
            className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full blur-3xl animate-spin"
            style={{ animationDuration: '20s', top: '10%', left: '10%' }}
          />
          <div 
            className="absolute w-96 h-96 bg-gradient-to-r from-purple-500/10 to-transparent rounded-full blur-3xl animate-spin"
            style={{ animationDuration: '25s', top: '60%', right: '10%', animationDirection: 'reverse' }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Stocks<span className="text-blue-400">2</span>
          </h1>
          
          <p className="text-gray-400 text-lg">
            AI-Powered Market Analysis
          </p>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 transition-all duration-1000 ${animationPhase === 0 ? 'ring-2 ring-blue-400/50 bg-gray-800/70' : ''}`}>
            <Brain className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-sm text-white font-medium">AI Predictions</div>
            <div className="text-xs text-gray-400">8-Hour Forecasts</div>
          </div>
          
          <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 transition-all duration-1000 ${animationPhase === 1 ? 'ring-2 ring-purple-400/50 bg-gray-800/70' : ''}`}>
            <BarChart3 className="w-6 h-6 text-purple-400 mb-2" />
            <div className="text-sm text-white font-medium">Real-Time Data</div>
            <div className="text-xs text-gray-400">Live Prices</div>
          </div>
          
          <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 transition-all duration-1000 ${animationPhase === 2 ? 'ring-2 ring-green-400/50 bg-gray-800/70' : ''}`}>
            <Zap className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-sm text-white font-medium">Smart News</div>
            <div className="text-xs text-gray-400">Sentiment Analysis</div>
          </div>
          
          <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 transition-all duration-1000 ${animationPhase === 3 ? 'ring-2 ring-yellow-400/50 bg-gray-800/70' : ''}`}>
            <Shield className="w-6 h-6 text-yellow-400 mb-2" />
            <div className="text-sm text-white font-medium">Secure Access</div>
            <div className="text-xs text-gray-400">Azure AD</div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400">
              Sign in with your organization account to access advanced market insights
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                <span>Sign in with Microsoft</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-300">Secure Access</div>
                <div className="text-xs text-gray-500 mt-1">
                  Authentication powered by Microsoft Azure AD. Your credentials are never stored on our servers.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Professional market analysis platform</p>
          <p className="mt-1">© 2025 Stocks2. All rights reserved.</p>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}