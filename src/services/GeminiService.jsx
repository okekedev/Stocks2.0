// src/services/GeminiService.js - Pure Mathematical Data Approach
import { articleFetcher } from './ArticleFetcher';
import { intradayTechnicalService } from './IntradayTechnicalService';

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
            maxOutputTokens: 800,
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

  // Pure data analysis - let AI do all correlation
  async analyzeStock(stock, onProgress = null) {
    try {
      onProgress?.(`🔢 Collecting pure mathematical data for ${stock.ticker}...`);
      
      // Step 1: Get full article content
      let fullArticleContent = null;
      if (stock.latestNews?.articleUrl) {
        try {
          onProgress?.(`📰 Fetching article content...`);
          fullArticleContent = await articleFetcher.fetchArticleContent(stock.latestNews.articleUrl);
          onProgress?.(`✅ Article: ${fullArticleContent.wordCount || 0} words`);
        } catch (error) {
          onProgress?.(`⚠️ Using news summary`);
        }
      }
      
      // Step 2: Get pure technical numbers (no interpretation)
      onProgress?.(`📊 Calculating raw technical data...`);
      const newsTimestamp = stock.latestNews?.publishedUtc || new Date().toISOString();
      const technicalData = await intradayTechnicalService.getNewsEventAnalysis(
        stock.ticker, 
        newsTimestamp, 
        2
      );
      
      // Step 3: Send raw data + news to AI for correlation
      onProgress?.(`🤖 Sending pure data to AI for analysis...`);
      const prompt = this.buildPureDataPrompt(stock, technicalData, fullArticleContent);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanResponse);
      
      return {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Analysis completed',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        riskLevel: result.riskLevel || 'medium',
        analysisTimestamp: new Date().toISOString(),
        technicalData: technicalData,
        hasFullArticle: !!(fullArticleContent?.success)
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      throw error;
    }
  }

  // Pure data prompt - no pre-analysis, just raw numbers + news
  buildPureDataPrompt(stock, technicalData, fullArticleContent) {
    const articleText = fullArticleContent?.success && fullArticleContent?.content 
      ? fullArticleContent.content 
      : (stock.latestNews?.description || stock.latestNews?.title || 'No news');

    const t = technicalData.technical;
    
    const prompt = `TRADING ANALYSIS: Correlate news with technical data to generate trading signal.

TICKER: ${stock.ticker}
NEWS PUBLISHED: ${stock.latestNews?.minutesAgo || 'unknown'} minutes ago

NEWS CONTENT:
"${articleText}"

RAW TECHNICAL DATA (4-hour window around news):

PRICE:
current_price: ${t.priceAction.currentPrice}
price_range: ${t.priceAction.priceRange}
volatility: ${t.priceAction.volatility}
momentum: ${t.priceAction.momentum}
recent_momentum_30min: ${t.priceAction.recentMomentum}
position_in_range: ${t.priceAction.percentOfRange}

MOVING_AVERAGES:
sma_5: ${t.sma.sma5}
sma_10: ${t.sma.sma10}
sma_20: ${t.sma.sma20}
sma_30: ${t.sma.sma30}
ema_5: ${t.ema.ema5}
ema_10: ${t.ema.ema10}
ema_20: ${t.ema.ema20}

MOMENTUM:
rsi_14: ${t.rsi.rsi14}
rsi_7: ${t.rsi.rsi7}
macd: ${t.macd.macd}
macd_signal: ${t.macd.signal}
macd_histogram: ${t.macd.histogram}

BOLLINGER:
bb_upper: ${t.bollinger.upper}
bb_middle: ${t.bollinger.middle}
bb_lower: ${t.bollinger.lower}
bb_bandwidth: ${t.bollinger.bandwidth}
bb_percent_b: ${t.bollinger.percentB}

VOLUME:
avg_volume: ${t.volume.averageVolume}
volume_stddev: ${t.volume.volumeStdDev}
volume_ratio: ${t.volume.volumeRatio}
vwap_current: ${t.volume.vwapCurrent}
vwap_average: ${t.volume.vwapAverage}

MICROSTRUCTURE:
avg_transactions: ${t.microstructure.averageTransactions}
avg_bar_size: ${t.microstructure.averageBarSize}
total_gaps: ${t.microstructure.gapAnalysis.totalGaps}
largest_gap: ${t.microstructure.gapAnalysis.largestGap}
gaps_up: ${t.microstructure.gapAnalysis.gapsUp}
gaps_down: ${t.microstructure.gapAnalysis.gapsDown}

PRICE_ARRAYS (last 20 data points):
prices: [${technicalData.timeSeries.prices.slice(-20).join(', ')}]
volumes: [${technicalData.timeSeries.volumes.slice(-20).join(', ')}]
minutes_from_news: [${technicalData.timeSeries.timestamps.slice(-20).join(', ')}]

Analyze the correlation between news content and technical data. Generate trading signal.

Return JSON only:
{
  "buyPercentage": 75,
  "signal": "buy", 
  "reasoning": "Brief analysis (max 15 words)",
  "confidence": 0.8,
  "riskLevel": "medium"
}

Signals: strong_buy (80+), buy (60-79), hold (40-59), avoid (0-39)`;

    return prompt;
  }

  // Simple batch analysis
  async batchAnalyzeStocks(stocks, options = {}) {
    const { 
      maxConcurrent = 1,
      onProgress = null,
      onStockComplete = null
    } = options;
    
    const results = [];
    
    console.log(`[INFO] Pure data batch analysis: ${stocks.length} stocks...`);
    onProgress?.(`🔢 Analyzing ${stocks.length} stocks with pure mathematical approach...`);
    
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
          onProgress?.(`✅ [${stock.ticker}] ${buySignal.signal.toUpperCase()} (${buySignal.buyPercentage}%)`);
          return result;
          
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          
          const result = {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: 'Analysis failed',
              riskLevel: 'high',
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
      
      if (i + maxConcurrent < stocks.length) {
        onProgress?.(`⏳ Processing next batch (${i + maxConcurrent}/${stocks.length})...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay for intensive analysis
      }
    }
    
    const sortedResults = results
      .filter(stock => stock.buySignal !== null)
      .sort((a, b) => (b.buySignal?.buyPercentage || 0) - (a.buySignal?.buyPercentage || 0));
    
    console.log(`[INFO] Pure data analysis complete: ${sortedResults.length} analyzed`);
    onProgress?.(`🎯 Analysis complete: ${sortedResults.length}/${stocks.length} processed`);
    
    return sortedResults;
  }
}

export const geminiService = new GeminiService();