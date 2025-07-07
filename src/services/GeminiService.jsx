// src/services/GeminiService.js - Updated for Gemini 2.5 Flash with Thinking
import { articleFetcher } from './ArticleFetcher';
import { enhancedTechnicalService } from './EnhancedTechnicalService';

class GeminiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    // ✅ Using standard Gemini 2.5 Flash (stable version)
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
      // ✅ Standard Gemini API request (no thinking config)
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Lower for more consistent JSON output
          topK: 40, 
          topP: 0.9, 
          maxOutputTokens: 2048,
          candidateCount: 1
        }
      };

      console.log(`🧠 [Gemini 2.5] Making standard API request...`);

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // ✅ Enhanced debugging without thinking info
      console.log(`🤖 [Gemini 2.5] API Response received successfully`);
      
      // ✅ Enhanced error checking for 2.5 Flash
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
          throw new Error('Response incomplete - reduce prompt size or increase maxOutputTokens');
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
      if (!part || (!part.text)) {
        // ✅ Handle empty responses more gracefully
        console.warn('[WARN] Gemini 2.5 Flash returned empty response');
        
        // Return a fallback JSON response that matches our expected format
        return JSON.stringify({
          buyPercentage: 50,
          signal: 'hold',
          reasoning: 'Analysis inconclusive - Gemini returned empty response',
          eodMovementPrediction: 0,
          confidence: 0.3,
          patternsFound: [],
          anomalies: ['Empty AI response']
        });
      }

      // ✅ Return the actual text content
      return part.text;
      
    } catch (error) {
      console.error('[ERROR] Gemini 2.5 Flash API request failed:', error);
      throw error;
    }
  }

  // ✅ OPTIMIZED: Focused Intraday Trading Analysis with 2.5 Flash Thinking
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Collecting intraday market data for ${stock.ticker}...`);
      
      // ✅ Step 1: Get focused price/volume data
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
      
      // ✅ Step 3: Build optimized prompt for 2.5 Flash
      onProgress?.(`🛠️ Building intraday analysis prompt...`);
      const prompt = this.buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent);
      
      // ✅ Debug prompt size
      console.log(`📏 [${stock.ticker}] Prompt size: ${prompt.length} characters`);
      if (prompt.length > 30000) {
        console.warn(`⚠️ [${stock.ticker}] Large prompt detected: ${prompt.length} chars`);
      }
      
      // ✅ Step 4: Send to Gemini 2.5 Flash (standard API)
      onProgress?.(`🧠 Analyzing with Gemini 2.5 Flash...`);
      
      const response = await this.makeRequest(prompt);
      
      // ✅ Better response validation
      if (!response || response.trim() === '') {
        throw new Error('Gemini 2.5 Flash returned empty response');
      }
      
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Response:`, cleanResponse.substring(0, 200) + '...');
      
      // ✅ Validate JSON before parsing
      if (!cleanResponse.startsWith('{') || !cleanResponse.endsWith('}')) {
        console.warn(`⚠️ [${stock.ticker}] Invalid JSON format received:`, cleanResponse);
        throw new Error('Invalid JSON format received from AI');
      }
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Intraday pattern analysis completed',
        eodMovement: result.eodMovementPrediction || 0,
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        
        // ✅ Standard 2.5 Flash capabilities
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

  // ✅ OPTIMIZED: Prompt designed for Gemini 2.5 Flash thinking capabilities
  buildIntradayPatternPrompt(stock, rawMarketData, fullArticleContent) {
    let newsText = '';
    
    if (fullArticleContent?.success && fullArticleContent?.content) {
      newsText = fullArticleContent.content.slice(0, 2000); // Limit article content
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
    }
    
    let marketDataSection = '';
    
    if (rawMarketData.error || !rawMarketData.hasData) {
      marketDataSection = `No market data available: ${rawMarketData.error || 'Unknown error'}`;
    } else {
      // ✅ Optimized market data for 2.5 Flash thinking
      const recent1min = rawMarketData.rawTimeframes['1min'].slice(-30); // Last 30 minutes
      const recent5min = rawMarketData.rawTimeframes['5min'].slice(-12); // Last hour in 5min bars
      const recentDaily = rawMarketData.recentDays.slice(-5); // Last 5 days
      
      marketDataSection = `MARKET DATA:
Current Price: ${rawMarketData.currentPrice} (${rawMarketData.todayChangePercent?.toFixed(2) || 0}% today)

Recent 30min (1min bars): ${JSON.stringify(recent1min)}
Recent hour (5min bars): ${JSON.stringify(recent5min)}
Recent 5 days (daily): ${JSON.stringify(recentDaily)}`;
    }

    // ✅ Prompt optimized for Gemini 2.5 Flash thinking capabilities
    const prompt = `You are an expert intraday trader with access to Gemini 2.5 Flash thinking capabilities. Think through this analysis step by step.

STOCK: ${stock.ticker}
CURRENT PRICE: ${rawMarketData.currentPrice || 'N/A'}
TODAY'S CHANGE: ${rawMarketData.todayChangePercent?.toFixed(2) || 0}%

NEWS ANALYSIS:
${newsText}

${marketDataSection}

THINK THROUGH THE FOLLOWING:
1. Analyze the news sentiment and potential market impact
2. Examine price/volume patterns in the recent data
3. Identify any technical patterns or anomalies
4. Consider the end-of-day movement probability
5. Assess overall trading opportunity strength

RESPOND WITH ONLY THIS JSON FORMAT (no markdown, no explanations):
{
  "buyPercentage": 50,
  "signal": "hold",
  "reasoning": "Brief analysis explanation",
  "eodMovementPrediction": 0.0,
  "confidence": 0.5,
  "patternsFound": ["pattern1"],
  "anomalies": ["anomaly1"]
}`;

    return prompt;
  }

  // ✅ Enhanced batch analysis with 2.5 Flash capabilities
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 1,
      onProgress = null,
      onStockComplete = null
    } = options;
    
    const results = [];
    
    console.log(`[INFO] Gemini 2.5 Flash analysis: ${stocks.length} stocks...`);
    onProgress?.(`🎯 AI analysis with Gemini 2.5 Flash for ${stocks.length} stocks...`);
    
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
    
    console.log(`[INFO] Gemini 2.5 Flash analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Analysis complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();