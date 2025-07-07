// src/services/GeminiService.js - Optimized for Intraday Trading Analysis
import { articleFetcher } from './ArticleFetcher';
import { enhancedTechnicalService } from './EnhancedTechnicalService';

class GeminiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
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
            temperature: 0.7,
            topK: 40, 
            topP: 0.9, 
            maxOutputTokens: 8192, // ✅ FIXED: Increased for detailed analysis responses
            candidateCount: 1,
            stopSequences: ["```", "END_ANALYSIS"]
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Enhanced error checking
      console.log('[DEBUG] Full Gemini API response:', JSON.stringify(data, null, 2));
      
      if (!data) {
        throw new Error('Empty response from Gemini API');
      }
      
      if (!data.candidates) {
        throw new Error('No candidates in Gemini API response');
      }
      
      if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
        throw new Error('Candidates array is empty or invalid');
      }
      
      const candidate = data.candidates[0];
      if (!candidate) {
        throw new Error('First candidate is undefined');
      }
      
      if (!candidate.content) {
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response blocked due to safety filters');
        }
        if (candidate.finishReason === 'RECITATION') {
          throw new Error('Response blocked due to recitation concerns');
        }
        if (candidate.finishReason === 'MAX_TOKENS') {
          throw new Error('Response incomplete - prompt too large (reduce data size)');
        }
        if (candidate.finishReason === 'OTHER') {
          throw new Error('Response generation failed for unknown reason');
        }
        throw new Error('No content in candidate response');
      }
      
      if (!candidate.content.parts) {
        throw new Error('No parts in candidate content');
      }
      
      if (!Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
        throw new Error('Parts array is empty or invalid');
      }
      
      const part = candidate.content.parts[0];
      if (!part || !part.text) {
        throw new Error('No text in first part of response');
      }

      return part.text;
      
    } catch (error) {
      console.error('[ERROR] Gemini API request failed:', error);
      throw error;
    }
  }

  // ✅ OPTIMIZED: Focused Intraday Trading Analysis
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Collecting intraday market data for ${stock.ticker}...`);
      
      // ✅ Step 1: Get focused price/volume data (no options complexity)
      console.log(`🔧 [${stock.ticker}] Fetching price/volume data for intraday analysis...`);
      const rawMarketData = await enhancedTechnicalService.analyzeStockForAI(stock.ticker);
      
      if (rawMarketData.error) {
        onProgress?.(`⚠️ Market Data: ${rawMarketData.error}`);
      } else {
        onProgress?.(`✅ Market Data: ${rawMarketData.dataPoints} price/volume data points`);
      }

      // Step 2: Get article content
      let fullArticleContent = null;
      if (stock.latestNews?.articleUrl) {
        try {
          onProgress?.(`📰 Fetching full article...`);
          fullArticleContent = await articleFetcher.fetchArticleContent(stock.latestNews.articleUrl);
          
          if (fullArticleContent?.success) {
            onProgress?.(`✅ Article: ${fullArticleContent.wordCount || 0} words`);
          } else if (fullArticleContent?.fallback) {
            onProgress?.(`⚠️ Article unavailable: ${fullArticleContent.error}`);
          } else {
            onProgress?.(`⚠️ Article fetch failed`);
          }
        } catch (error) {
          onProgress?.(`⚠️ Article error: ${error.message}`);
          fullArticleContent = {
            content: 'Article content could not be fetched',
            title: 'Error',
            success: false,
            fallback: true,
            error: error.message
          };
        }
      } else {
        onProgress?.(`📰 Using news summary only`);
      }
      
      // ✅ Step 3: Build focused intraday trading prompt
      onProgress?.(`🛠️ Building intraday pattern analysis prompt...`);
      const prompt = this.buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent);
      
      // ✅ Step 4: Send to AI for intraday pattern analysis
      onProgress?.(`🧠 Analyzing intraday patterns with Gemini 2.5 Flash...`);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Intraday Analysis Response:`, cleanResponse);
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Intraday pattern analysis completed',
        eodMovement: result.eodMovementPrediction || 0, // ✅ Updated field name
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        
        // ✅ Intraday-focused patterns
        patternsFound: result.patternsFound || [],
        anomalies: result.anomalies || [],
        
        analysisTimestamp: new Date().toISOString(),
        hasRawData: rawMarketData.hasData,
        hasFullArticle: !!(fullArticleContent?.success),
        dataPoints: rawMarketData.dataPoints || 0
      };
      
      onProgress?.(`✅ Complete: ${finalResult.signal.toUpperCase()} (${finalResult.buyPercentage}%)`);
      
      return finalResult;
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      onProgress?.(`❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  // ✅ SIMPLIFIED: Clean and Direct Intraday Analysis Prompt
  buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent) {
    let newsText = '';
    
    if (fullArticleContent?.success && fullArticleContent?.content) {
      newsText = fullArticleContent.content;
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
    }
    
    let marketDataSection = '';
    
    if (rawMarketData.error || !rawMarketData.hasData) {
      marketDataSection = `No market data available: ${rawMarketData.error || 'Unknown error'}`;
    } else {
      marketDataSection = `Market Data:
Current Price: ${rawMarketData.currentPrice} (${rawMarketData.todayChangePercent?.toFixed(2) || 0}% today)

Recent 1-minute bars: ${JSON.stringify(rawMarketData.rawTimeframes['1min'].slice(-60))}
Recent 5-minute bars: ${JSON.stringify(rawMarketData.rawTimeframes['5min'].slice(-24))}
Recent hourly bars: ${JSON.stringify(rawMarketData.rawTimeframes['1hour'].slice(-6))}
Recent daily bars: ${JSON.stringify(rawMarketData.recentDays)}`;
    }

    const prompt = `You are an expert in intraday trading with deep knowledge and understanding of the most complex financial patterns. You will be given recent news from a stock and technical data for a given time period. I would like you to analyze this information and return a json in this format.

Stock: ${stock.ticker}

News:
${newsText}

${marketDataSection}

{
  "buyPercentage": (0-100 based on intraday opportunity strength),
  "signal": ("buy", "sell", "hold"),
  "reasoning": (brief explanation of your analysis),
  "eodMovementPrediction": (predicted % change by end of day),
  "confidence": (0.0-1.0 confidence in your analysis),
  "patternsFound": (array of technical patterns you identified),
  "anomalies": (array of unusual market behaviors you noticed)
}`;

    return prompt;
  }

  // Batch analysis with progress tracking
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 1,
      onProgress = null,
      onStockComplete = null
    } = options;
    
    const results = [];
    
    console.log(`[INFO] AI intraday pattern analysis: ${stocks.length} stocks...`);
    onProgress?.(`🎯 AI intraday analysis for ${stocks.length} stocks...`);
    
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
          const signalText = (buySignal.signal || 'hold').toUpperCase();
          const patterns = buySignal.patternsFound?.length > 0 ? ` | Patterns: ${buySignal.patternsFound.join(', ')}` : '';
          onProgress?.(`✅ [${stock.ticker}] ${signalText} (${buySignal.buyPercentage}%)${patterns}`);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: 'AI intraday analysis failed',
              eodMovement: 0,
              confidence: 0.1,
              patternsFound: [],
              anomalies: []
            },
            aiAnalyzed: false
          };
          
          onStockComplete?.(stock.ticker, result);
          onProgress?.(`❌ [${stock.ticker}] Failed: ${error.message}`);
          return result;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches
      if (i + maxConcurrent < stocks.length) {
        onProgress?.(`⏳ Processing next batch (${i + maxConcurrent + 1}/${stocks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Sort by buy percentage
    const sortedResults = results
      .filter(stock => stock.buySignal !== null)
      .sort((a, b) => (b.buySignal?.buyPercentage || 0) - (a.buySignal?.buyPercentage || 0));
    
    console.log(`[INFO] AI intraday analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Intraday analysis complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();