// src/services/GeminiService.js - Enhanced with AI Pattern Recognition
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
            temperature: 0.7, // ✅ Higher for pattern recognition creativity
            topK: 40, 
            topP: 0.9, 
            maxOutputTokens: 1000, // ✅ More tokens for complex pattern analysis
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

  // ✅ ENHANCED: AI Pattern Recognition Analysis
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Collecting comprehensive market data for ${stock.ticker}...`);
      
      // ✅ Step 1: Get RAW multi-timeframe market data
      console.log(`🔧 [${stock.ticker}] Fetching raw market data for AI pattern recognition...`);
      const rawMarketData = await enhancedTechnicalService.analyzeStockForAI(stock.ticker);
      
      if (rawMarketData.error) {
        onProgress?.(`⚠️ Market Data: ${rawMarketData.error}`);
      } else {
        onProgress?.(`✅ Market Data: ${rawMarketData.dataPoints} data points across multiple timeframes`);
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
      
      // ✅ Step 3: Build AI pattern recognition prompt
      onProgress?.(`🛠️ Building AI pattern recognition prompt...`);
      const prompt = this.buildAIPatternPrompt(stock, rawMarketData, fullArticleContent);
      
      // ✅ Step 4: Send to AI for pattern analysis
      onProgress?.(`🧠 Analyzing patterns with Gemini 2.5 Flash...`);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Pattern Analysis Response:`, cleanResponse);
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Pattern analysis completed',
        eodMovement: result.eodMovement || 0,
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        
        // ✅ NEW: AI-discovered patterns
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

  // ✅ NEW: AI Pattern Recognition Prompt - Let AI find patterns in raw data
  buildAIPatternPrompt(stock, rawMarketData, fullArticleContent) {
    let newsText = '';
    let newsQuality = 'SUMMARY_ONLY';
    
    if (fullArticleContent?.success && fullArticleContent?.content && fullArticleContent.content.length > 100) {
      newsText = fullArticleContent.content;
      newsQuality = 'FULL_ARTICLE';
    } else if (fullArticleContent?.fallback) {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No detailed news available';
      newsQuality = 'FALLBACK_SUMMARY';
    } else {
      newsText = stock.latestNews?.description || stock.latestNews?.title || 'No recent news available';
      newsQuality = 'SUMMARY_ONLY';
    }
    
    // ✅ Prepare raw data for AI pattern recognition
    let marketDataSection = '';
    
    if (rawMarketData.error || !rawMarketData.hasData) {
      marketDataSection = `MARKET_DATA: null
DATA_STATUS: ${rawMarketData.error || 'No data available'}
PATTERN_ANALYSIS: Not possible - insufficient market data`;
    } else {
      // ✅ Send ACTUAL raw data to AI for pattern recognition
      marketDataSection = `RAW_MARKET_DATA:
{
  "currentPrice": ${rawMarketData.currentPrice},
  "todayChangePercent": ${rawMarketData.todayChangePercent?.toFixed(2) || 0},
  "dataQuality": ${JSON.stringify(rawMarketData.dataQuality, null, 2)},
  
  "recent1minBars": ${JSON.stringify(rawMarketData.rawTimeframes['1min'].slice(-60), null, 2)},
  "recent5minBars": ${JSON.stringify(rawMarketData.rawTimeframes['5min'].slice(-24), null, 2)},
  "recent1hourBars": ${JSON.stringify(rawMarketData.rawTimeframes['1hour'].slice(-6), null, 2)},
  "recentDailyBars": ${JSON.stringify(rawMarketData.recentDays, null, 2)},
  "optionsActivity": ${JSON.stringify(rawMarketData.optionsActivity, null, 2)}
}

DATA_POINTS: ${rawMarketData.dataPoints} total market data points
TIMEFRAMES: 1min (${rawMarketData.dataQuality.minuteBars}), 5min (${rawMarketData.dataQuality.fiveMinBars}), 1hour (${rawMarketData.dataQuality.hourlyBars}), daily (${rawMarketData.dataQuality.dailyBars})`;
    }

    const prompt = `You are an AI pattern recognition expert analyzing ${stock.ticker} for intraday trading opportunities.

STOCK: ${stock.ticker}
NEWS_CATALYST (${newsQuality}):
${newsText}

${marketDataSection}

ADVANCED PATTERN ANALYSIS INSTRUCTIONS:
As an AI with superior pattern recognition capabilities, analyze the RAW market data above to discover:

1. **HIDDEN PATTERNS**: Look for subtle patterns in the price/volume data that humans might miss
2. **CROSS-TIMEFRAME ANALYSIS**: Find correlations between 1min, 5min, hourly, and daily patterns  
3. **VOLUME ANOMALIES**: Detect unusual volume patterns that signal institutional activity
4. **MICRO-TRENDS**: Identify emerging short-term trends in the recent minute-by-minute data
5. **NEWS-PRICE CORRELATION**: How is the price action responding to the news catalyst?

Your pattern recognition capabilities should identify:
- Support/resistance levels from actual price touches
- Volume spikes and their timing relative to price moves
- Momentum shifts between timeframes
- Unusual trading patterns (gaps, reversals, breakouts)
- Price action patterns (flags, pennants, wedges) across timeframes

Return ONLY this JSON:
{
  "buyPercentage": 65,
  "signal": "buy",
  "reasoning": "Specific pattern-based analysis (max 30 words)",
  "eodMovement": 2.8,
  "confidence": 0.8,
  "patternsFound": ["breakout above resistance", "volume spike confirmation"],
  "anomalies": ["unusual pre-market volume", "gap up on news"]
}

SCORING INSTRUCTIONS:
- Use the RAW data patterns to determine scores, not just news sentiment
- buyPercentage: Base on strength of technical patterns + news alignment
- eodMovement: Predict based on pattern completion targets and momentum
- confidence: Higher when multiple timeframes confirm the same pattern
- patternsFound: List 1-3 specific patterns you detected in the data
- anomalies: Note any unusual data points that influence your analysis

IMPORTANT: Each stock will have unique patterns - use your AI pattern recognition to find what humans cannot see in the raw data.`;

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
    
    console.log(`[INFO] AI pattern recognition batch analysis: ${stocks.length} stocks...`);
    onProgress?.(`🎯 AI pattern analysis for ${stocks.length} stocks...`);
    
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
              reasoning: 'AI pattern analysis failed',
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
    
    console.log(`[INFO] AI pattern analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Pattern analysis complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();