// src/services/GeminiService.js - Enhanced for 8-Hour Forward Predictions with Time Context
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
            maxOutputTokens: 8192,
            candidateCount: 1
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
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
      
      // Enhanced finish reason checking
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

  // ✅ OPTIMIZED: 4H History → 8H Forward Prediction Analysis
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Analyzing ${stock.ticker} for 4H→8H prediction...`);
      
      // ✅ Step 1: Get optimized 4H market data for 8H prediction
      console.log(`🔧 [${stock.ticker}] Fetching focused 4H data for 8H prediction...`);
      const marketAnalysis = await enhancedTechnicalService.analyzeStockForAI(stock.ticker);
      
      if (marketAnalysis.error) {
        onProgress?.(`⚠️ Market Data: ${marketAnalysis.error}`);
      } else {
        const dataAge = marketAnalysis.latestDataAge || 'unknown';
        const session = marketAnalysis.marketSession?.currentSession || 'unknown';
        onProgress?.(`✅ Market Data: ${marketAnalysis.dataPoints} points, ${dataAge}m old (${session})`);
      }

      // Step 2: Get article content
      let fullArticleContent = null;
      if (stock.latestNews?.articleUrl) {
        try {
          onProgress?.(`📰 Fetching full article content...`);
          fullArticleContent = await articleFetcher.fetchArticleContent(stock.latestNews.articleUrl);
          
          if (fullArticleContent?.success) {
            onProgress?.(`✅ Article: ${fullArticleContent.wordCount || 0} words analyzed`);
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
      
      // ✅ Step 3: Build optimized 4H→8H prediction prompt
      onProgress?.(`🛠️ Building focused 4H→8H analysis prompt...`);
      const prompt = this.build4HTo8HPrompt(stock, marketAnalysis, fullArticleContent);
      
      // Check prompt size
      console.log(`📏 [${stock.ticker}] Prompt size: ${prompt.length} characters`);
      if (prompt.length > 15000) {
        console.warn(`[WARN] Large prompt for ${stock.ticker}: ${prompt.length} chars`);
        onProgress?.(`⚠️ Large prompt detected (${Math.round(prompt.length/1000)}k chars)`);
      }
      
      // ✅ Step 4: Send to AI for optimized 4H→8H prediction
      onProgress?.(`🧠 Generating focused 4H→8H prediction with Gemini AI...`);
      
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Response:`, cleanResponse);
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || '4H→8H analysis completed',
        next8Hours: result.next8Hours || 0, // ✅ 8-hour prediction
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        
        // ✅ Enhanced prediction details
        targetTimeframe: '8 hours',
        predictionType: '4H→8H',
        keyFactors: result.keyFactors || [],
        riskLevel: result.riskLevel || 'medium',
        marketContext: result.marketContext || 'regular_session',
        
        // Analysis metadata
        analysisTimestamp: new Date().toISOString(),
        hasMarketData: marketAnalysis.hasData,
        hasFullArticle: !!(fullArticleContent?.success),
        dataPoints: marketAnalysis.dataPoints || 0,
        marketSession: marketAnalysis.marketSession?.currentSession || 'unknown',
        dataAge: marketAnalysis.latestDataAge || null,
        analysisType: '4H→8H'
      };
      
      const predictionText = finalResult.next8Hours > 0 ? `+${finalResult.next8Hours.toFixed(1)}%` : `${finalResult.next8Hours.toFixed(1)}%`;
      onProgress?.(`✅ Complete: ${finalResult.signal.toUpperCase()} (${finalResult.buyPercentage}%) | 8h: ${predictionText}`);
      
      return finalResult;
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      onProgress?.(`❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  // ✅ OPTIMIZED: 4H→8H prompt for focused analysis
  build4HTo8HPrompt(stock, marketAnalysis, fullArticleContent) {
    // Prepare news content (limit size)
    let newsText = '';
    
    if (fullArticleContent?.success && fullArticleContent?.content) {
      newsText = fullArticleContent.content.substring(0, 1500) + (fullArticleContent.content.length > 1500 ? '...' : '');
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
    }
    
    // ✅ Prepare focused 4H market data for 8H prediction
    let marketDataSection = '';
    let timeContextSection = '';
    
    if (marketAnalysis.error || !marketAnalysis.hasData) {
      marketDataSection = `Market data unavailable: ${marketAnalysis.error || 'No data'}`;
    } else {
      // Include focused time context for AI
      const timeContext = marketAnalysis.timeContext;
      timeContextSection = `
CURRENT TIME CONTEXT:
- Current UTC Time: ${new Date(timeContext.currentUtcTime).toISOString()}
- Current Eastern Time: ${timeContext.currentEasternTime}
- Market Session: ${timeContext.currentSession}
- Current Price: ${marketAnalysis.currentPrice || 'N/A'}
- 4H Momentum: ${marketAnalysis.fourHourMomentum?.toFixed(2) || 0}%
- Data Age: ${marketAnalysis.latestDataAge || 'unknown'} minutes
- 8H Prediction Window Ends: ${timeContext.predictionWindowEnd}
- Hours Until Next Session: ${timeContext.hoursUntilNextSession || 'N/A'}`;

      // ✅ FOCUSED: Include only recent 4H data (much smaller)
      const recent1min = marketAnalysis.rawTimeframes['1min'].slice(-60); // Last 1 hour of 1min
      const recent5min = marketAnalysis.rawTimeframes['5min'].slice(-48);  // All 4H of 5min
      const recent15min = marketAnalysis.rawTimeframes['15min'].slice(-16); // All 4H of 15min
      
      marketDataSection = `FOCUSED 4H MARKET DATA (Recent Activity):
1-minute bars (last 1H): ${JSON.stringify(recent1min)}
5-minute bars (4H): ${JSON.stringify(recent5min)}
15-minute bars (4H): ${JSON.stringify(recent15min)}
Data Quality: ${marketAnalysis.dataQuality?.quality || 'unknown'} (${marketAnalysis.dataQuality?.completeness || 0}% complete)`;
    }

    // ✅ OPTIMIZED: Focused prompt for 4H→8H analysis
    const prompt = `You are an expert day trader analyzing ${stock.ticker} using FOCUSED 4-HOUR HISTORY to predict the NEXT 8 HOURS.

${timeContextSection}

NEWS CATALYST: ${newsText}

${marketDataSection}

ANALYSIS APPROACH: Use the last 4 hours of data to predict the next 8 hours of trading.

Key Focus Areas:
1. Recent 4H momentum and trend direction
2. Current market session context and upcoming sessions  
3. News catalyst timing and market reaction potential
4. Volume patterns and session-specific behavior
5. Support/resistance levels from recent 4H action

Return JSON format:
{
  "buyPercentage": [0-100 confidence in upward movement],
  "signal": ["strong_buy"|"buy"|"hold"|"sell"|"strong_sell"],
  "reasoning": "[brief analysis focusing on 4H→8H outlook]",
  "next8Hours": [predicted percentage change in next 8 hours],
  "confidence": [0.0-1.0 confidence in prediction],
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": ["low"|"medium"|"high"],
  "marketContext": ["premarket"|"regular"|"afterhours"|"transition"]
}

Focus on ACTIONABLE 8-HOUR PREDICTION using recent 4-hour patterns. Consider session transitions and news timing.`;

    return prompt;
  }

  // ✅ UPDATED: Batch analysis with 8-hour forward prediction
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 1,
      onProgress = null,
      onStockComplete = null
    } = options;
    
    const results = [];
    
    console.log(`[INFO] AI 4H→8H analysis: ${stocks.length} stocks...`);
    onProgress?.(`🎯 Starting focused 4H→8H predictions for ${stocks.length} stocks...`);
    
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
          const prediction8h = buySignal.next8Hours > 0 ? `+${buySignal.next8Hours.toFixed(1)}%` : `${buySignal.next8Hours.toFixed(1)}%`;
          const timeframe = buySignal.targetTimeframe || '8h';
          const factors = buySignal.keyFactors?.length > 0 ? ` | Key: ${buySignal.keyFactors.slice(0, 2).join(', ')}` : '';
          
          onProgress?.(`✅ [${stock.ticker}] ${signalText} (${buySignal.buyPercentage}%) | ${timeframe}: ${prediction8h}${factors}`);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: '4H→8H analysis failed',
              next8Hours: 0,
              confidence: 0.1,
              targetTimeframe: '8 hours',
              predictionType: '4H→8H',
              keyFactors: [],
              riskLevel: 'high'
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
    
    console.log(`[INFO] 4H→8H analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Focused 4H→8H predictions complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();