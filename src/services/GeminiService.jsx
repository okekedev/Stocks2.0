// src/services/GeminiService.js - FIXED: Updated for New Data Structure
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

  // ✅ CLEARER: 8-Hour Forward Prediction Analysis
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Starting 8-hour prediction analysis for ${stock.ticker}...`);
      
      // ✅ Step 1: Get recent market data (last 4 hours for context)
      console.log(`🔧 [${stock.ticker}] Fetching recent market data for 8-hour prediction...`);
      const rawMarketData = await enhancedTechnicalService.analyzeStockForAI(stock.ticker);
      
      if (rawMarketData.error) {
        onProgress?.(`⚠️ Market Data: ${rawMarketData.error}`);
      } else {
        onProgress?.(`✅ Market Data: ${rawMarketData.dataPoints} recent data points`);
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
      
      // ✅ Step 3: Build 8-hour prediction prompt
      onProgress?.(`🛠️ Building 8-hour prediction prompt...`);
      const prompt = this.build8HourPredictionPrompt(stock, rawMarketData, fullArticleContent);
      
      // Check prompt size to avoid token limits
      console.log(`📏 [${stock.ticker}] Prompt size: ${prompt.length} characters`);
      if (prompt.length > 12000) {
        console.warn(`[WARN] Large prompt for ${stock.ticker}: ${prompt.length} chars`);
        onProgress?.(`⚠️ Large prompt detected (${Math.round(prompt.length/1000)}k chars)`);
      }
      
      // ✅ Step 4: Send to AI for 8-hour prediction
      onProgress?.(`🧠 Generating 8-hour price prediction with Gemini AI...`);
      
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Response:`, cleanResponse);
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || '8-hour prediction analysis completed',
        next8Hours: result.next8HoursPrediction || 0, // ✅ Clear field name
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        
        // Pattern analysis
        patternsFound: result.patternsFound || [],
        anomalies: result.anomalies || [],
        
        analysisTimestamp: new Date().toISOString(),
        hasRawData: rawMarketData.hasData,
        hasFullArticle: !!(fullArticleContent?.success),
        dataPoints: rawMarketData.dataPoints || 0,
        technicalBars: rawMarketData.dataPoints || 0,
        predictionWindow: '8 hours' // ✅ Clear indicator
      };
      
      onProgress?.(`✅ Complete: ${finalResult.signal.toUpperCase()} (${finalResult.buyPercentage}%) | 8H: ${finalResult.next8Hours > 0 ? '+' : ''}${finalResult.next8Hours.toFixed(1)}%`);
      
      return finalResult;
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      onProgress?.(`❌ 8-hour prediction failed: ${error.message}`);
      throw error;
    }
  }

  // ✅ FIXED: 8-Hour Prediction Prompt with Correct Data Structure
  build8HourPredictionPrompt(stock, rawMarketData, fullArticleContent) {
    // Use shorter news content to reduce token usage
    let newsText = '';
    
    if (fullArticleContent?.success && fullArticleContent?.content) {
      // Limit article content to prevent token overflow
      newsText = fullArticleContent.content.substring(0, 1500) + (fullArticleContent.content.length > 1500 ? '...' : '');
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
    }
    
    // ✅ FIXED: Handle the new data structure properly
    let marketDataSection = '';
    
    if (rawMarketData.error || !rawMarketData.hasData) {
      marketDataSection = `Market data unavailable: ${rawMarketData.error || 'No data'}`;
    } else {
      // ✅ FIXED: Use the correct data structure from EnhancedTechnicalService
      const timeframes = rawMarketData.rawTimeframes || {};
      
      // Safely get recent data with proper null checks
      const recent1min = (timeframes['1min'] && Array.isArray(timeframes['1min'])) 
        ? timeframes['1min'].slice(-20) 
        : [];
      
      const recent5min = (timeframes['5min'] && Array.isArray(timeframes['5min'])) 
        ? timeframes['5min'].slice(-12) 
        : [];
      
      const recent15min = (timeframes['15min'] && Array.isArray(timeframes['15min'])) 
        ? timeframes['15min'].slice(-5) 
        : [];
      
      // ✅ FIXED: Build market data section with what we actually have
      let dataLines = [];
      
      // Current price and momentum
      if (rawMarketData.currentPrice) {
        const hourlyMomentum = rawMarketData.hourlyMomentum ? ` (1H: ${rawMarketData.hourlyMomentum.toFixed(2)}%)` : '';
        const fourHourMomentum = rawMarketData.fourHourMomentum ? ` (4H: ${rawMarketData.fourHourMomentum.toFixed(2)}%)` : '';
        dataLines.push(`Current: $${rawMarketData.currentPrice}${hourlyMomentum}${fourHourMomentum}`);
      }
      
      // Market session info
      if (rawMarketData.marketSession) {
        dataLines.push(`Session: ${rawMarketData.marketSession.session} (${rawMarketData.marketSession.description || 'active'})`);
      }
      
      // Data quality info
      if (rawMarketData.dataQuality) {
        const dq = rawMarketData.dataQuality;
        dataLines.push(`Data Quality: ${dq.quality} (${dq.totalMinuteBars} bars, latest ${dq.latestDataAge}m ago)`);
        
        if (dq.hasExtendedHoursData) {
          dataLines.push(`Extended Hours: ${dq.extendedHoursBars} bars, Avg Vol: ${dq.avgExtendedHoursVolume}`);
        }
      }
      
      // Recent price action (only if we have data)
      if (recent1min.length > 0) {
        const recentPrices = recent1min.slice(-10).map(bar => `${bar.close}`).join(',');
        dataLines.push(`Recent 10min prices: ${recentPrices}`);
      }
      
      if (recent5min.length > 0) {
        dataLines.push(`5min bars (last ${recent5min.length}): OHLCV data available`);
      }
      
      if (recent15min.length > 0) {
        dataLines.push(`15min bars (last ${recent15min.length}): OHLCV data available`);
      }
      
      // Fallback if no detailed data
      if (recent1min.length === 0 && recent5min.length === 0 && recent15min.length === 0) {
        dataLines.push('Limited price history - using current price data only');
      }
      
      marketDataSection = dataLines.join('\n');
    }

    // ✅ CLEARER: Direct 8-hour prediction prompt
    const prompt = `Analyze this stock and predict its price movement over the next 8 hours. Return only valid JSON.

STOCK: ${stock.ticker}

NEWS: ${newsText}

MARKET DATA:
${marketDataSection}

Predict the stock's price movement over the next 8 hours based on:
1. Recent price patterns and volume
2. News sentiment and market reactions
3. Technical indicators and momentum
4. Current market session (regular/after-hours/premarket)

Return JSON format:
{
  "buyPercentage": [number 0-100],
  "signal": ["buy"|"sell"|"hold"],
  "reasoning": "[brief analysis explaining the 8-hour prediction]",
  "next8HoursPrediction": [number percentage change expected],
  "confidence": [number 0.0-1.0],
  "patternsFound": ["pattern1", "pattern2"],
  "anomalies": ["anomaly1", "anomaly2"]
}`;

    return prompt;
  }

  // Batch analysis with progress tracking
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 3, // ✅ Conservative to avoid rate limits
      onProgress = null,
      onStockComplete = null
    } = options;
    
    const results = [];
    
    console.log(`[INFO] Starting 8-hour predictions: ${stocks.length} stocks...`);
    onProgress?.(`🎯 Generating 8-hour predictions for ${stocks.length} stocks...`);
    
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
          const prediction = buySignal.next8Hours > 0 ? `+${buySignal.next8Hours.toFixed(1)}%` : `${buySignal.next8Hours.toFixed(1)}%`;
          onProgress?.(`✅ [${stock.ticker}] ${signalText} (${buySignal.buyPercentage}%) | 8H: ${prediction}`);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: '8-hour prediction analysis failed',
              next8Hours: 0,
              confidence: 0.1,
              patternsFound: [],
              anomalies: [],
              predictionWindow: '8 hours'
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
    
    console.log(`[INFO] 8-hour predictions complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 8-hour predictions complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();