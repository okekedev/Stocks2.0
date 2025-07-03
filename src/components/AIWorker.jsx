// src/components/AIWorker.jsx - Improved version
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Terminal, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function AIWorker({ 
  stock, 
  onAnalysisComplete, 
  onAnalysisStart,
  isActive = false,
  savedLogs = null, // New prop for persistent logs
  savedResult = null // New prop for persistent results
}) {
  const [logs, setLogs] = useState(savedLogs || []);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(!!savedResult);
  const [result, setResult] = useState(savedResult);
  const logsEndRef = useRef(null);

  // Load saved logs when component mounts
  useEffect(() => {
    if (savedLogs && savedLogs.length > 0) {
      setLogs(savedLogs);
      setComplete(!!savedResult);
      setResult(savedResult);
    }
  }, [savedLogs, savedResult]);

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { 
      id: Date.now() + Math.random(),
      timestamp, 
      message, 
      type
    };
    setLogs(prev => [...prev, newLog]);
    return newLog;
  };

  const generateAIAnalysis = async () => {
    if (analyzing) return;
    
    setAnalyzing(true);
    setComplete(false);
    setLogs([]); // Clear previous logs for fresh analysis
    onAnalysisStart?.(stock.ticker);

    const allLogs = []; // Track all logs for saving

    try {
      // Quick AI analysis simulation
      const log1 = addLog(`Analyzing ${stock.ticker}...`, 'system');
      allLogs.push(log1);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate realistic factors
      const volumeSpike = Math.random() > 0.6;
      const momentum = (Math.random() - 0.5) * 4; // -2% to +2%
      const newsRecency = stock.latestNews?.minutesAgo || 120;
      const priceMove = stock.changePercent || 0;
      
      // Calculate confidence score
      let confidence = 45 + Math.random() * 40; // Base 45-85%
      
      // News timing boost
      if (newsRecency < 30) confidence += 8;
      else if (newsRecency < 60) confidence += 5;
      
      // Price action boost
      if (priceMove > 2) confidence += 10;
      else if (priceMove > 0.5) confidence += 5;
      else if (priceMove < -2) confidence -= 10;
      
      // Volume boost
      if (volumeSpike) confidence += 8;
      
      confidence = Math.min(90, Math.max(25, confidence));
      const buyPercentage = Math.round(confidence);

      const signal = buyPercentage >= 75 ? 'strong_buy' : 
                   buyPercentage >= 60 ? 'buy' : 
                   buyPercentage >= 45 ? 'hold' : 'avoid';

      // Generate key insights
      const insights = [];
      
      if (newsRecency < 60) {
        insights.push(`📰 Fresh news (${newsRecency}m ago) - high impact potential`);
      }
      
      if (priceMove > 1) {
        insights.push(`📈 Positive momentum: +${priceMove.toFixed(1)}% today`);
      } else if (priceMove < -1) {
        insights.push(`📉 Negative momentum: ${priceMove.toFixed(1)}% today`);
      }
      
      if (volumeSpike) {
        insights.push(`🔥 Volume spike detected - institutional interest`);
      }
      
      if (stock.newsCount > 2) {
        insights.push(`🗞️ Multiple stories (${stock.newsCount}) - sustained attention`);
      }

      // Risk assessment
      const riskLevel = buyPercentage >= 70 ? 'low' : 
                       buyPercentage >= 50 ? 'medium' : 'high';

      // Display insights
      for (const insight of insights) {
        const log = addLog(insight, 'insight');
        allLogs.push(log);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate reasoning
      const reasoning = generateReasoning(signal, volumeSpike, momentum, newsRecency, priceMove);
      
      const log2 = addLog(`🎯 Signal: ${signal.toUpperCase().replace('_', ' ')} (${buyPercentage}%)`, 'result');
      allLogs.push(log2);
      const log3 = addLog(`💭 ${reasoning}`, 'reasoning');
      allLogs.push(log3);
      
      if (buyPercentage >= 60) {
        const entryPrice = stock.currentPrice * (0.998 + Math.random() * 0.004);
        const targetPrice = entryPrice * (1.05 + Math.random() * 0.10);
        const expectedReturn = ((targetPrice - entryPrice) / entryPrice * 100).toFixed(1);
        const log4 = addLog(`🎯 Target: $${targetPrice.toFixed(2)} (+${expectedReturn}%)`, 'target');
        allLogs.push(log4);
      }

      const aiResult = {
        buyPercentage,
        signal,
        reasoning,
        riskLevel,
        timeHorizon: 'short_term',
        keyFactors: insights.map(i => i.split(' - ')[0]),
        entryPrice: stock.currentPrice * (0.998 + Math.random() * 0.004),
        targetPrice: stock.currentPrice * (1.05 + Math.random() * 0.10),
        stopLoss: stock.currentPrice * (0.94 + Math.random() * 0.04),
        confidence: buyPercentage / 100,
        analysisTimestamp: new Date().toISOString(),
        savedLogs: allLogs // Save logs with the result
      };

      await new Promise(resolve => setTimeout(resolve, 400));
      const log5 = addLog(`✅ Analysis complete`, 'success');
      allLogs.push(log5);
      
      setComplete(true);
      setResult(aiResult);
      onAnalysisComplete?.(stock.ticker, aiResult);

    } catch (error) {
      const errorLog = addLog(`❌ Analysis failed: ${error.message}`, 'error');
      allLogs.push(errorLog);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateReasoning = (signal, volumeSpike, momentum, newsRecency, priceMove) => {
    if (signal === 'strong_buy') {
      if (volumeSpike && priceMove > 1) {
        return `Strong bullish confluence: positive news + volume spike + price momentum`;
      } else if (newsRecency < 30) {
        return `Breaking news catalyst with strong technical setup`;
      } else {
        return `Multiple positive factors align for high-confidence entry`;
      }
    } else if (signal === 'buy') {
      if (priceMove > 0 && newsRecency < 60) {
        return `Positive sentiment with confirming price action`;
      } else {
        return `Good setup but waiting for stronger momentum confirmation`;
      }
    } else if (signal === 'hold') {
      return `Mixed signals - positive news offset by ${momentum < 0 ? 'weak momentum' : 'risk factors'}`;
    } else {
      return `Risk too high - negative momentum despite positive sentiment`;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'insight': return 'text-blue-300';
      case 'result': return 'text-purple-300';
      case 'reasoning': return 'text-yellow-300';
      case 'target': return 'text-green-300';
      case 'system': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  if (!isActive) {
    return (
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-2xl min-w-[500px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">{stock.ticker} AI Analysis</span>
          </div>
          <button
            onClick={generateAIAnalysis}
            disabled={analyzing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm px-3 py-1 rounded flex items-center space-x-1 transition-colors"
          >
            <Brain className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        </div>
        
        <div className="bg-black rounded border border-gray-700 p-3 h-48 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Brain className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click to see AI reasoning</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-2xl min-w-[600px] max-w-[600px]"
      style={{ 
        position: 'fixed', // Changed from absolute to fixed to prevent page scroll
        zIndex: 1000,
        transform: 'translateY(-50%)', // Center vertically relative to hover point
        maxHeight: '80vh', // Prevent terminal from being too tall
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">{stock.ticker} AI Analysis</span>
          {analyzing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>}
          {complete && <CheckCircle className="w-4 h-4 text-green-400" />}
          {savedLogs && (
            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">SAVED</span>
          )}
        </div>
        
        {!analyzing && !complete && (
          <button
            onClick={generateAIAnalysis}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded flex items-center space-x-1"
          >
            <Brain className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        )}
        
        {complete && !analyzing && (
          <button
            onClick={generateAIAnalysis}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded flex items-center space-x-1"
          >
            <Brain className="w-4 h-4" />
            <span>Re-analyze</span>
          </button>
        )}
      </div>

      {/* Bigger Terminal Output */}
      <div className="bg-black rounded border border-gray-700 p-4 h-80 overflow-y-auto">
        <div className="text-green-400 text-sm mb-3 font-mono">
          AI-TRADER v2.0 › {stock.ticker} ${stock.currentPrice?.toFixed(2)}
        </div>
        
        {logs.map((log) => (
          <div key={log.id} className="mb-2">
            <div className={`${getLogColor(log.type)} text-sm leading-relaxed`}>
              <span className="text-gray-500 text-xs mr-2">{log.timestamp}</span>
              {log.message}
            </div>
          </div>
        ))}
        
        {analyzing && (
          <div className="flex items-center space-x-2 text-blue-400 text-sm">
            <span className="animate-pulse">▋</span>
            <span>Processing...</span>
          </div>
        )}
        
        {logs.length === 0 && !analyzing && (
          <div className="text-gray-400 text-sm text-center py-8">
            No analysis performed yet. Click "Analyze" to start.
          </div>
        )}
        
        <div ref={logsEndRef} />
      </div>

      {/* Enhanced Summary */}
      {complete && result && (
        <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-gray-400">AI Signal</div>
              <div className={`text-lg font-bold ${
                result.buyPercentage >= 70 ? 'text-green-400' : 
                result.buyPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {result.buyPercentage}% {result.signal.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Risk Level</div>
              <div className={`text-sm font-medium ${
                result.riskLevel === 'low' ? 'text-green-400' : 
                result.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {result.riskLevel.toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 mb-1">Analysis Time:</div>
          <div className="text-xs text-gray-300">
            {new Date(result.analysisTimestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}