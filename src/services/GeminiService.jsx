// src/services/GeminiService.js
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
            maxOutputTokens: 1000,
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

  // Analyze full article content for trading sentiment
  async analyzeFullArticle(article, fullContent) {
    const prompt = `
You are a professional stock trading analyst. Analyze this financial news article for immediate trading signals.

ARTICLE DETAILS:
Ticker(s): ${article.tickers.join(', ')}
Title: ${article.title}
Publisher: ${article.publisher}
Published: ${new Date(article.publishedUtc).toLocaleString()}

FULL ARTICLE CONTENT:
${fullContent.content}

Analyze this article and return ONLY a JSON object with this exact format:
{
  "sentiment": 0.7,
  "confidence": 0.85,
  "tradingSignal": "bullish",
  "keyTopics": ["earnings", "guidance"],
  "urgency": 0.8,
  "priceImpact": "positive",
  "timeHorizon": "immediate",
  "reasoning": "Company exceeded earnings expectations with strong guidance"
}

Where:
- sentiment: -1 (very negative) to 1 (very positive)
- confidence: 0 to 1 (how confident you are in this analysis)
- tradingSignal: "bullish", "bearish", or "neutral"
- keyTopics: array of key topics ["earnings", "fda", "merger", "partnership", etc.]
- urgency: 0 to 1 (how time-sensitive this news is for trading)
- priceImpact: "positive", "negative", or "neutral"
- timeHorizon: "immediate" (minutes/hours), "short" (days), "medium" (weeks), "long" (months+)
- reasoning: brief explanation (max 25 words)

Focus on immediate trading implications, not long-term investment value.
Consider the credibility of the source and specificity of the information.
`;

    try {
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
      
    } catch (error) {
      console.error('[ERROR] Failed to analyze article:', error);
      return {
        sentiment: 0.3,
        confidence: 0.2,
        tradingSignal: 'neutral',
        keyTopics: ['unknown'],
        urgency: 0.3,
        priceImpact: 'neutral',
        timeHorizon: 'medium',
        reasoning: 'AI analysis failed - using conservative estimate'
      };
    }
  }

  // Generate buy signal from news + price action
  async generateBuySignal(newsAnalysis, priceAction, stock) {
    const prompt = `
You are an expert day trader analyzing a potential BUY signal. Combine news sentiment with recent price action to determine buy confidence.

STOCK: ${stock.ticker}
CURRENT PRICE: $${stock.currentPrice}
TODAY'S CHANGE: ${stock.changePercent}%

NEWS ANALYSIS:
- Sentiment: ${newsAnalysis.sentiment} (-1 to 1)
- Trading Signal: ${newsAnalysis.tradingSignal}
- Key Topics: ${newsAnalysis.keyTopics.join(', ')}
- Urgency: ${newsAnalysis.urgency}
- Price Impact: ${newsAnalysis.priceImpact}
- Confidence: ${newsAnalysis.confidence}
- Reasoning: ${newsAnalysis.reasoning}

PRICE ACTION (Last 30 minutes):
- Trend: ${priceAction.trend}
- Price Change: ${priceAction.priceChange}%
- Volume Spike: ${priceAction.volumeSpike ? 'YES' : 'NO'}
- Volume Ratio: ${priceAction.volumeRatio}x normal
- Momentum: ${priceAction.momentum}
- Bars Analyzed: ${priceAction.barsAnalyzed}

Return ONLY a JSON object:
{
  "buyPercentage": 75,
  "signal": "strong_buy",
  "reasoning": "Positive FDA news + 3% price spike + 4x volume confirms bullish momentum",
  "riskLevel": "medium",
  "timeHorizon": "short_term",
  "keyFactors": ["positive_news", "volume_spike", "price_momentum"],
  "entryPrice": 125.50,
  "stopLoss": 120.25,
  "targetPrice": 135.00
}

Where:
- buyPercentage: 0-100 (confidence in buying NOW)
- signal: "strong_buy" (80+), "buy" (60-79), "hold" (40-59), "avoid" (<40)
- reasoning: brief explanation (max 35 words)
- riskLevel: "low", "medium", "high"
- timeHorizon: "immediate" (minutes), "short_term" (hours), "medium_term" (days)
- keyFactors: array of driving factors
- entryPrice: suggested entry price
- stopLoss: suggested stop loss (5-10% below entry)
- targetPrice: suggested target (10-20% above entry)

SCORING EXAMPLES:
- Positive FDA approval + stock up 3% + volume spike = 85-90%
- Strong earnings beat + flat price + normal volume = 45-55%
- Partnership news + stock down 1% = 25-35% (possible overreaction)
- Positive news + stock already up 10% = 20-30% (may be too late)

Key Question: Does the price action CONFIRM the positive news sentiment?
`;

    try {
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanResponse);
      
      // Validate and constrain values
      result.buyPercentage = Math.max(0, Math.min(100, result.buyPercentage));
      result.entryPrice = result.entryPrice || stock.currentPrice;
      result.stopLoss = result.stopLoss || (stock.currentPrice * 0.95);
      result.targetPrice = result.targetPrice || (stock.currentPrice * 1.15);
      
      return result;
      
    } catch (error) {
      console.error('[ERROR] Failed to generate buy signal:', error);
      return {
        buyPercentage: 30,
        signal: 'hold',
        reasoning: 'AI analysis failed - conservative recommendation',
        riskLevel: 'high',
        timeHorizon: 'unknown',
        keyFactors: ['analysis_error'],
        entryPrice: stock.currentPrice,
        stopLoss: stock.currentPrice * 0.95,
        targetPrice: stock.currentPrice * 1.10
      };
    }
  }

  // Batch analyze multiple stocks efficiently
  async batchAnalyzeStocks(stocksWithNews, maxConcurrent = 2) {
    const results = [];
    
    console.log(`[INFO] AI batch analyzing ${stocksWithNews.length} stocks...`);
    
    // Process in small batches to respect rate limits
    for (let i = 0; i < stocksWithNews.length; i += maxConcurrent) {
      const batch = stocksWithNews.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (stock) => {
        try {
          if (stock.newsAnalysis && stock.priceAction) {
            console.log(`[INFO] Generating buy signal for ${stock.ticker}...`);
            
            const buySignal = await this.generateBuySignal(
              stock.newsAnalysis,
              stock.priceAction,
              stock
            );
            
            return {
              ...stock,
              buySignal,
              aiAnalyzed: true
            };
          } else {
            return {
              ...stock,
              buySignal: {
                buyPercentage: 25,
                signal: 'avoid',
                reasoning: 'Insufficient data for analysis',
                riskLevel: 'high',
                timeHorizon: 'none',
                keyFactors: ['insufficient_data']
              },
              aiAnalyzed: false
            };
          }
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          return {
            ...stock,
            buySignal: {
              buyPercentage: 20,
              signal: 'avoid',
              reasoning: 'Analysis failed',
              riskLevel: 'high',
              timeHorizon: 'none',
              keyFactors: ['error']
            },
            aiAnalyzed: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches (Gemini rate limiting)
      if (i + maxConcurrent < stocksWithNews.length) {
        console.log('[INFO] Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Sort by buy percentage (highest first)
    const sortedResults = results.sort((a, b) => 
      (b.buySignal?.buyPercentage || 0) - (a.buySignal?.buyPercentage || 0)
    );
    
    console.log(`[INFO] AI analysis complete: ${sortedResults.length} stocks analyzed`);
    return sortedResults;
  }
}

export const geminiService = new GeminiService();