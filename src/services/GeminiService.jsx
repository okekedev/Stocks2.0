// src/services/GeminiService.js - Enhanced with comprehensive technical analysis
import { technicalAnalysisService } from './TechnicalAnalysisService';

class GeminiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    
    if (!this.apiKey) {
      console.warn('VITE_GEMINI_API_KEY not found - AI analysis will be disabled');
    }
  }

  async makeRequest(prompt) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1500, // Increased for more detailed analysis
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
      
    } catch (error) {
      console.error('[ERROR] Gemini API request failed:', error);
      throw error;
    }
  }

  // Enhanced analysis with comprehensive technical data (always included)
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`📊 Fetching technical indicators for ${stock.ticker}...`);
      const technicalData = await technicalAnalysisService.getAllTechnicalData(stock.ticker);
      
      onProgress?.(`🤖 Analyzing ${stock.ticker} with AI...`);
      
      const prompt = this.buildAnalysisPrompt(stock, technicalData);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanResponse);
      
      return {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Analysis completed',
        analysisTimestamp: new Date().toISOString(),
        technicalData: technicalData
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      throw error; // Let the caller handle the error
    }
  }

  // Build focused analysis prompt (always includes technical data)
  buildAnalysisPrompt(stock, technicalData) {
    const articleText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news';
    
    const prompt = `You are an experienced financial and market expert. Analyze this news and technical data and give a buy signal with your reasoning.

NEWS ARTICLE:
"${articleText}"

STOCK: ${stock.ticker}
PRICE: $${technicalData.currentPrice?.toFixed(2)}

TECHNICAL DATA:
RSI: ${technicalData.rsi?.toFixed(1)}
MACD: ${technicalData.macd?.toFixed(3)} (Signal: ${technicalData.macdSignal?.toFixed(3)})
SMA5: $${technicalData.sma5?.toFixed(2)}
SMA20: $${technicalData.sma20?.toFixed(2)}
Volume Ratio: ${technicalData.volumeRatio?.toFixed(2)}x
Day Change: ${technicalData.dayChange?.toFixed(2)}%

Return JSON:
{
  "buyPercentage": 75,
  "signal": "buy", 
  "reasoning": "Your analysis reasoning"
}

Signals: "strong_buy" (80+), "buy" (60-79), "hold" (40-59), "avoid" (<40)`;

    return prompt;
  }

  // Enhanced batch analysis (always includes technical data)
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 2, 
      onProgress = null,
      onStockComplete = null 
    } = options;
    
    const results = [];
    
    console.log(`[INFO] AI batch analyzing ${stocks.length} stocks with full technical analysis...`);
    onProgress?.(`🤖 Starting comprehensive analysis of ${stocks.length} stocks...`);
    
    for (let i = 0; i < stocks.length; i += maxConcurrent) {
      const batch = stocks.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (stock) => {
        try {
          const progressCallback = (message) => {
            onProgress?.(`[${stock.ticker}] ${message}`);
          };
          
          const buySignal = await this.analyzeStock(stock, progressCallback);
          
          const result = {
            ...stock,
            buySignal,
            aiAnalyzed: true
          };
          
          onStockComplete?.(stock.ticker, result);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: null,
            aiAnalyzed: false,
            error: error.message
          };
          
          onStockComplete?.(stock.ticker, result);
          return result;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (i + maxConcurrent < stocks.length) {
        onProgress?.(`⏳ Waiting before next batch (${i + maxConcurrent}/${stocks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Sort by buy percentage (highest first), filter out failed analyses
    const sortedResults = results
      .filter(stock => stock.buySignal !== null)
      .sort((a, b) => (b.buySignal?.buyPercentage || 0) - (a.buySignal?.buyPercentage || 0));
    
    console.log(`[INFO] AI analysis complete: ${sortedResults.length} stocks successfully analyzed`);
    onProgress?.(`✅ Analysis complete: ${sortedResults.length}/${stocks.length} stocks processed`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();