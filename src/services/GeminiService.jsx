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
            temperature: 0.1,
            topK: 40, 
            topP: 0.9, 
            maxOutputTokens: 8192, // ✅ INCREASED - Allow longer responses
            candidateCount: 1
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // ✅ DETAILED DEBUGGING - Log the full response structure
      console.log('🔍 [FULL DEBUG] Gemini API Response:', JSON.stringify(data, null, 2));
      
      // Enhanced error checking with fallback handling
      console.log('[DEBUG] Gemini API response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        firstCandidateStructure: data.candidates?.[0] ? Object.keys(data.candidates[0]) : 'none',
        firstCandidateFinishReason: data.candidates?.[0]?.finishReason || 'none',
        hasContent: !!data.candidates?.[0]?.content,
        contentStructure: data.candidates?.[0]?.content ? Object.keys(data.candidates[0].content) : 'none'
      });
      
      if (!data) {
        throw new Error('Empty response from Gemini API');
      }
      
      if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
        console.error('[ERROR] Invalid candidates structure:', data);
        throw new Error(`No valid candidates in API response. Full response: ${JSON.stringify(data)}`);
      }
      
      const candidate = data.candidates[0];
      if (!candidate) {
        throw new Error('First candidate is undefined');
      }
      
      // ✅ MORE DETAILED FINISH REASON CHECKING
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn(`[WARN] Unusual finish reason: ${candidate.finishReason}`, candidate);
        
        switch (candidate.finishReason) {
          case 'SAFETY':
            throw new Error(`Content blocked by safety filters. Candidate: ${JSON.stringify(candidate)}`);
          case 'RECITATION':
            throw new Error(`Content blocked due to recitation concerns. Candidate: ${JSON.stringify(candidate)}`);
          case 'MAX_TOKENS':
            throw new Error(`Response too long (hit maxOutputTokens limit). Candidate: ${JSON.stringify(candidate)}`);
          case 'OTHER':
            throw new Error(`Response generation failed for unknown reason. Candidate: ${JSON.stringify(candidate)}`);
          default:
            console.warn(`[WARN] Unknown finish reason: ${candidate.finishReason}`);
        }
      }
      
      // Handle missing content structure
      if (!candidate.content) {
        console.error('[ERROR] No content in candidate:', candidate);
        throw new Error(`No content in response. Full candidate: ${JSON.stringify(candidate)}`);
      }
      
      if (!candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
        console.error('[ERROR] Invalid parts structure:', candidate.content);
        throw new Error(`No valid parts in candidate content. Content: ${JSON.stringify(candidate.content)}`);
      }
      
      const part = candidate.content.parts[0];
      if (!part || typeof part.text !== 'string') {
        console.error('[ERROR] Invalid part structure:', part);
        throw new Error(`No valid text in response part. Part: ${JSON.stringify(part)}`);
      }

      console.log(`✅ [SUCCESS] Received response: ${part.text.substring(0, 100)}...`);
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
      onProgress?.(`🛠️ Building analysis prompt...`);
      const prompt = this.buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent);
      
      // Check prompt size to avoid token limits
      console.log(`📏 [${stock.ticker}] Prompt size: ${prompt.length} characters`);
      if (prompt.length > 12000) {
        console.warn(`[WARN] Large prompt for ${stock.ticker}: ${prompt.length} chars`);
        onProgress?.(`⚠️ Large prompt detected (${Math.round(prompt.length/1000)}k chars)`);
      }
      
      // ✅ Step 4: Send to AI - No fallback, let errors bubble up
      onProgress?.(`🧠 Analyzing patterns with Gemini AI...`);
      
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Response:`, cleanResponse);
      
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
        dataPoints: rawMarketData.dataPoints || 0,
        technicalBars: rawMarketData.dataPoints || 0
      };
      
      onProgress?.(`✅ Complete: ${finalResult.signal.toUpperCase()} (${finalResult.buyPercentage}%)`);
      
      return finalResult;
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      onProgress?.(`❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  // ✅ OPTIMIZED: Compact and Safety-Filter Friendly Prompt
  buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent) {
    // Use shorter news content to reduce token usage
    let newsText = '';
    
    if (fullArticleContent?.success && fullArticleContent?.content) {
      // Limit article content to prevent token overflow
      newsText = fullArticleContent.content.substring(0, 1500) + (fullArticleContent.content.length > 1500 ? '...' : '');
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
    }
    
    // Simplified market data (reduce JSON size)
    let marketDataSection = '';
    
    if (rawMarketData.error || !rawMarketData.hasData) {
      marketDataSection = `Market data unavailable: ${rawMarketData.error || 'No data'}`;
    } else {
      // Use only the most recent critical data points
      const recent1min = rawMarketData.rawTimeframes['1min'].slice(-20); // Last 20 minutes
      const recent5min = rawMarketData.rawTimeframes['5min'].slice(-12); // Last hour
      const recentDaily = rawMarketData.recentDays.slice(-5); // Last 5 days
      
      marketDataSection = `Current: $${rawMarketData.currentPrice} (${rawMarketData.todayChangePercent?.toFixed(2) || 0}% today)
Recent 1min: ${JSON.stringify(recent1min)}
Recent 5min: ${JSON.stringify(recent5min)}
Recent daily: ${JSON.stringify(recentDaily)}`;
    }

    // Simplified, direct prompt to avoid safety filters
    const prompt = `Analyze this stock for intraday trading opportunity. Return only valid JSON.

STOCK: ${stock.ticker}

NEWS: ${newsText}

MARKET DATA: ${marketDataSection}

Return JSON format:
{
  "buyPercentage": [number 0-100],
  "signal": ["buy"|"sell"|"hold"],
  "reasoning": "[brief analysis]",
  "eodMovementPrediction": [number percentage],
  "confidence": [number 0.0-1.0],
  "patternsFound": ["pattern1", "pattern2"],
  "anomalies": ["anomaly1", "anomaly2"]
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