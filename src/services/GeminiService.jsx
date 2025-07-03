// src/services/GeminiService.js - Complete file with comprehensive debugging
import { articleFetcher } from './ArticleFetcher';
import { technicalService } from './TechnicalService';

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
            maxOutputTokens: 600,
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

  // Market expert analysis - get ALL data first, then send one prompt
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔄 Collecting all data for ${stock.ticker}...`);
      
      // Step 1: Get raw technical data (no interpretation)
      console.log(`🔧 [${stock.ticker}] Fetching technical data...`);
      const technicalData = await technicalService.analyzeStock(stock.ticker);
      
      console.log(`🔧 [${stock.ticker}] Technical data result:`, {
        hasError: !!technicalData.error,
        errorMessage: technicalData.error,
        hasTechnicalData: !!technicalData.technicalData,
        barsAnalyzed: technicalData.barsAnalyzed,
        currentPrice: technicalData.currentPrice,
        keys: Object.keys(technicalData)
      });
      
      if (technicalData.error) {
        onProgress?.(`⚠️ Technical: ${technicalData.error}`);
      } else if (technicalData.barsAnalyzed === 0) {
        onProgress?.(`⚠️ Technical: No historical data (likely new IPO)`);
      } else {
        onProgress?.(`✅ Technical: ${technicalData.barsAnalyzed || 0} bars analyzed`);
      }

      // Step 2: Get full article content if available
      let fullArticleContent = null;
      if (stock.latestNews?.articleUrl) {
        try {
          onProgress?.(`📰 Fetching full article...`);
          fullArticleContent = await articleFetcher.fetchArticleContent(stock.latestNews.articleUrl);
          if (fullArticleContent?.success) {
            onProgress?.(`✅ Article: ${fullArticleContent.wordCount || 0} words`);
          } else {
            onProgress?.(`⚠️ Article fetch failed`);
          }
        } catch (error) {
          onProgress?.(`⚠️ Article error: ${error.message}`);
        }
      } else {
        onProgress?.(`📰 Using news summary only`);
      }
      
      // Step 3: Build complete prompt with all data
      onProgress?.(`🛠️ Building comprehensive analysis prompt...`);
      const prompt = this.buildMarketExpertPrompt(stock, technicalData, fullArticleContent);
      
      // Step 4: Send ONE complete request to AI
      onProgress?.(`🧠 Sending to AI for market expert analysis...`);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log(`🤖 [${stock.ticker}] AI Response:`, cleanResponse);
      
      const result = JSON.parse(cleanResponse);
      
      const finalResult = {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Analysis completed',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        analysisTimestamp: new Date().toISOString(),
        hasTechnicalData: !technicalData.error && technicalData.barsAnalyzed > 0,
        hasFullArticle: !!(fullArticleContent?.success),
        technicalBars: technicalData.barsAnalyzed || 0
      };
      
      onProgress?.(`✅ Complete: ${finalResult.signal.toUpperCase()} (${finalResult.buyPercentage}%)`);
      
      return finalResult;
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      onProgress?.(`❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  // Simple market expert prompt with comprehensive debugging
  buildMarketExpertPrompt(stock, technicalData, fullArticleContent) {
    console.log('\n🔍 ===========================================');
    console.log('🔍 DEBUGGING PROMPT CONSTRUCTION');
    console.log('🔍 ===========================================');
    
    // Debug: News text selection
    const newsText = fullArticleContent?.success && fullArticleContent?.content 
      ? fullArticleContent.content 
      : (stock.latestNews?.description || stock.latestNews?.title || 'No recent news');
    
    console.log('📰 NEWS TEXT SOURCE:');
    console.log(`   Full article available: ${!!(fullArticleContent?.success)}`);
    console.log(`   Full article length: ${fullArticleContent?.content?.length || 0} chars`);
    console.log(`   Fallback to description: ${!!(stock.latestNews?.description)}`);
    console.log(`   Fallback to title: ${!!(stock.latestNews?.title)}`);
    console.log(`   Final news text length: ${newsText.length} chars`);
    console.log(`   News preview: "${newsText.substring(0, 100)}..."`);

    // Debug: Price data
    const currentPrice = stock.currentPrice || technicalData.currentPrice;
    const changePercent = stock.changePercent || 0;
    
    console.log('\n💰 PRICE DATA:');
    console.log(`   Stock current price: ${stock.currentPrice}`);
    console.log(`   Technical current price: ${technicalData.currentPrice}`);
    console.log(`   Final current price: ${currentPrice}`);
    console.log(`   Change percent: ${changePercent}%`);
    console.log(`   News age: ${stock.latestNews?.minutesAgo || 'unknown'} minutes`);
    
    // Debug: Technical data construction
    let technicalSection = '';
    console.log('\n📊 TECHNICAL DATA ANALYSIS:');
    console.log(`   Technical data has error: ${!!technicalData.error}`);
    console.log(`   Technical data exists: ${!!technicalData.technicalData}`);
    
    if (technicalData.error) {
      console.log(`   ❌ Error: ${technicalData.error}`);
      technicalSection = 'TECHNICAL DATA: Not available';
    } else if (!technicalData.technicalData) {
      console.log(`   ❌ No technicalData object found`);
      console.log(`   Available keys:`, Object.keys(technicalData));
      technicalSection = 'TECHNICAL DATA: Not available - no data structure returned';
    } else {
      const t = technicalData.technicalData;
      console.log(`   ✅ Technical data object found`);
      console.log(`   Available technical keys:`, Object.keys(t));
      
      // Debug each technical metric
      console.log('\n   📈 TECHNICAL METRICS:');
      console.log(`      VWAP: ${t.priceVsVwap}`);
      console.log(`      Momentum:`, t.momentum);
      console.log(`      Volume:`, t.volume);
      console.log(`      Breakout:`, t.breakout);
      console.log(`      Levels:`, t.levels);
      
      // Check if we have any real data
      const hasRealData = t.priceVsVwap !== null && t.priceVsVwap !== 0 ||
                         t.momentum !== null ||
                         t.volume !== null ||
                         t.breakout !== null ||
                         t.levels !== null;
      
      if (!hasRealData) {
        console.log(`   ⚠️ All technical metrics are null/zero - likely new IPO with no history`);
        technicalSection = `
TECHNICAL DATA: Limited (New IPO - insufficient historical data)
• Bars analyzed: ${technicalData.barsAnalyzed || 0}
• Note: Stock may be too new for meaningful technical analysis`;
      } else {
        technicalSection = `
INTRADAY TECHNICAL DATA (last 4 hours):
• Price vs VWAP: ${t.priceVsVwap ? t.priceVsVwap.toFixed(2) + '%' : 'N/A'}
• Momentum: ${t.momentum ? `${t.momentum.direction} ${t.momentum.percentChange.toFixed(2)}% (strength: ${t.momentum.strength.toFixed(2)})` : 'N/A'}
• Volume: ${t.volume ? `${t.volume.ratio}x average (${t.volume.volumeSpike ? 'SPIKE' : t.volume.isAboveAverage ? 'above avg' : 'normal'})` : 'N/A'}
• Breakout: ${t.breakout ? `${t.breakout.hasBreakout ? t.breakout.direction + ' ' + t.breakout.strength.toFixed(2) + '%' : 'none'}` : 'N/A'}
• Support/Resistance: ${t.levels ? `${t.levels.support} / ${t.levels.resistance} (current: ${t.levels.currentPrice})` : 'N/A'}`;
      }
    }
    
    console.log('\n🔧 TECHNICAL SECTION PREVIEW:');
    console.log(technicalSection);

    const prompt = `You are a professional market expert and intraday trader. Thoroughly analyze the content and data provided to you below to determine your intraday trading signal for this stock.

STOCK: ${stock.ticker}
CURRENT PRICE: $${currentPrice?.toFixed(2) || 'N/A'}
TODAY'S CHANGE: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%
NEWS AGE: ${stock.latestNews?.minutesAgo || 'unknown'} minutes ago

LATEST NEWS:
${newsText}

${technicalSection}

Perform a thorough analysis of the news content and technical data. What is your intraday trading signal for this stock? What is your detailed reasoning?

Return only JSON:
{
  "buyPercentage": 75,
  "signal": "buy",
  "reasoning": "Your brief market expert reasoning (max 20 words)",
  "confidence": 0.8
}

Signal options: strong_buy (80+%), buy (60-79%), hold (40-59%), avoid (0-39%)`;

    // Debug: Final prompt
    console.log('\n📝 FINAL PROMPT PREVIEW:');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));
    console.log(`\n📊 PROMPT STATS:`);
    console.log(`   Total length: ${prompt.length} characters`);
    console.log(`   News portion: ${newsText.length} characters`);
    console.log(`   Technical portion: ${technicalSection.length} characters`);
    console.log('🔍 ===========================================\n');

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
    
    console.log(`[INFO] Market expert batch analysis: ${stocks.length} stocks...`);
    onProgress?.(`🎯 Market expert analyzing ${stocks.length} stocks...`);
    
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
          onProgress?.(`✅ [${stock.ticker}] ${signalText} (${buySignal.buyPercentage}%) - ${buySignal.reasoning}`);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: 'Analysis failed - technical issues',
              confidence: 0.1
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
    
    console.log(`[INFO] Market expert analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Analysis complete: ${sortedResults.length}/${stocks.length} successful`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();