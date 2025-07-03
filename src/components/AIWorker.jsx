// src/components/AIWorker.jsx - Fixed with proper close handler
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Terminal, CheckCircle, X } from 'lucide-react';
import { geminiService } from '../services/GeminiService';

export function AIWorker({ 
  stock, 
  onAnalysisComplete, 
  onAnalysisStart,
  onClose,
  autoStart = false, // ✅ New prop to auto-start analysis
  isActive = false,
  savedLogs = null,
  savedResult = null
}) {
  const [logs, setLogs] = useState(savedLogs || []);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(!!savedResult);
  const [result, setResult] = useState(savedResult);
  const logsEndRef = useRef(null);

  // Auto-start analysis when component mounts (if enabled)
  useEffect(() => {
    if (autoStart && !analyzing && !complete && !savedResult) {
      console.log(`[AIWorker] Auto-starting analysis for ${stock.ticker}`);
      // Small delay to let the UI settle
      setTimeout(() => {
        performRealAIAnalysis();
      }, 500);
    }
  }, [autoStart, stock.ticker, analyzing, complete, savedResult]);

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

  // Real AI analysis using Gemini
  const performRealAIAnalysis = async () => {
    if (analyzing) return;
    
    setAnalyzing(true);
    setComplete(false);
    setLogs([]); // Clear previous logs
    onAnalysisStart?.(stock.ticker);

    const allLogs = [];

    try {
      const log1 = addLog(`🤖 Starting real AI analysis for ${stock.ticker}...`, 'system');
      allLogs.push(log1);
      
      const log2 = addLog(`📊 Price: $${stock.currentPrice?.toFixed(2)} (${stock.changePercent > 0 ? '+' : ''}${stock.changePercent?.toFixed(2)}%)`, 'info');
      allLogs.push(log2);
      
      const log3 = addLog(`📰 Analyzing ${stock.newsCount} news articles...`, 'info');
      allLogs.push(log3);
      
      const log4 = addLog(`🧠 Sending to Gemini AI...`, 'system');
      allLogs.push(log4);

      // Call real Gemini API
      const aiResult = await geminiService.analyzeStock(stock);
      
      const log5 = addLog(`✅ AI analysis complete`, 'success');
      allLogs.push(log5);
      
      const log6 = addLog(`🎯 Signal: ${aiResult.signal.toUpperCase()} (${aiResult.buyPercentage}%)`, 'result');
      allLogs.push(log6);
      
      const log7 = addLog(`💭 ${aiResult.reasoning}`, 'reasoning');
      allLogs.push(log7);
      
      const log8 = addLog(`⚠️ Risk Level: ${aiResult.riskLevel.toUpperCase()}`, 'info');
      allLogs.push(log8);

      // Add saved logs to result
      const finalResult = {
        ...aiResult,
        savedLogs: allLogs
      };

      setComplete(true);
      setResult(finalResult);
      onAnalysisComplete?.(stock.ticker, finalResult);

    } catch (error) {
      const errorLog = addLog(`❌ Analysis failed: ${error.message}`, 'error');
      allLogs.push(errorLog);
      
      // Return fallback result
      const fallbackResult = {
        buyPercentage: 30,
        signal: 'hold',
        reasoning: 'AI service unavailable',
        riskLevel: 'high',
        confidence: 0.2,
        savedLogs: allLogs
      };
      
      setResult(fallbackResult);
      onAnalysisComplete?.(stock.ticker, fallbackResult);
    } finally {
      setAnalyzing(false);
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-300';
      case 'result': return 'text-purple-300';
      case 'reasoning': return 'text-yellow-300';
      case 'system': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  // ✅ Proper close handler
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="bg-gray-900 border border-gray-600 rounded-lg shadow-2xl"
      style={{ 
        width: '600px',
        maxHeight: '80vh',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-600">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">{stock.ticker} AI Analysis</span>
          {analyzing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>}
          {complete && <CheckCircle className="w-4 h-4 text-green-400" />}
          {savedLogs && (
            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">SAVED</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!analyzing && !complete && !autoStart && (
            <button
              onClick={performRealAIAnalysis}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded flex items-center space-x-1"
            >
              <Brain className="w-4 h-4" />
              <span>Analyze with AI</span>
            </button>
          )}
          
          {(complete || (!analyzing && autoStart)) && (
            <button
              onClick={performRealAIAnalysis}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded flex items-center space-x-1"
            >
              <Brain className="w-4 h-4" />
              <span>Re-analyze</span>
            </button>
          )}

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="bg-black p-4 h-80 overflow-y-auto">
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
            <span>AI Analysis in Progress...</span>
          </div>
        )}
        
        {logs.length === 0 && !analyzing && !autoStart && (
          <div className="text-gray-400 text-sm text-center py-8">
            Click "Analyze with AI" to start real-time analysis using Google Gemini.
          </div>
        )}

        {logs.length === 0 && !analyzing && autoStart && (
          <div className="text-purple-400 text-sm text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto mb-2"></div>
            Initializing AI analysis...
          </div>
        )}
        
        <div ref={logsEndRef} />
      </div>

      {/* Summary */}
      {complete && result && (
        <div className="p-4 bg-gray-800 border-t border-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">AI Signal</div>
              <div className={`text-lg font-bold ${
                result.buyPercentage >= 70 ? 'text-green-400' : 
                result.buyPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {result.buyPercentage}% {result.signal.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Risk • Confidence</div>
              <div className="text-sm">
                <span className={`font-medium ${
                  result.riskLevel === 'low' ? 'text-green-400' : 
                  result.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {result.riskLevel.toUpperCase()}
                </span>
                <span className="text-gray-400 mx-1">•</span>
                <span className="text-blue-400">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Analysis Time: {new Date(result.analysisTimestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}