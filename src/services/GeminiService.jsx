// src/services/GeminiService.js - Simplified for testing
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

  // Simplified analysis - just article text and basic stock info
  async analyzeStock(stock) {
    const newsText = stock.latestNews?.description || stock.latestNews?.title || 'No news available';
    const currentPrice = stock.currentPrice || 100;
    const changePercent = stock.changePercent || 0;
    
    const prompt = `
You are a professional stock trading analyst. Analyze this stock for immediate trading signals.

STOCK: ${stock.ticker}
CURRENT PRICE: $${currentPrice.toFixed(2)}
TODAY'S CHANGE: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%
NEWS COUNT: ${stock.newsCount}

LATEST NEWS:
${newsText}

Based on this information, return ONLY a JSON object with this format:
{
  "buyPercentage": 65,
  "signal": "buy",
  "reasoning": "Positive earnings news with momentum",
  "riskLevel": "medium",
  "confidence": 0.75
}

Where:
- buyPercentage: 0-100 (confidence in buying NOW)
- signal: "strong_buy" (80+), "buy" (60-79), "hold" (40-59), "avoid" (<40)
- reasoning: brief explanation (max 20 words)
- riskLevel: "low", "medium", "high"
- confidence: 0-1 decimal

Consider:
- Is the news positive or negative?
- Is the stock price moving in the right direction?
- How recent is the news?
- Overall market sentiment
`;

    try {
      console.log(`[INFO] Analyzing ${stock.ticker} with Gemini...`);
      const response = await this.makeRequest(prompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanResponse);
      
      // Validate and add defaults
      return {
        buyPercentage: Math.max(0, Math.min(100, result.buyPercentage || 50)),
        signal: result.signal || 'hold',
        reasoning: result.reasoning || 'Analysis completed',
        riskLevel: result.riskLevel || 'medium',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        entryPrice: currentPrice,
        targetPrice: currentPrice * 1.1,
        stopLoss: currentPrice * 0.95,
        analysisTimestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
      return {
        buyPercentage: 30,
        signal: 'hold',
        reasoning: 'AI analysis failed - conservative estimate',
        riskLevel: 'high',
        confidence: 0.2,
        entryPrice: currentPrice,
        targetPrice: currentPrice * 1.05,
        stopLoss: currentPrice * 0.95,
        analysisTimestamp: new Date().toISOString()
      };
    }
  }

  // Simple batch analysis
  async batchAnalyzeStocks(stocks, maxConcurrent = 2) {
    const results = [];
    
    console.log(`[INFO] AI batch analyzing ${stocks.length} stocks...`);
    
    // Process in small batches to respect rate limits
    for (let i = 0; i < stocks.length; i += maxConcurrent) {
      const batch = stocks.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (stock) => {
        try {
          const buySignal = await this.analyzeStock(stock);
          
          return {
            ...stock,
            buySignal,
            aiAnalyzed: true
          };
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${stock.ticker}:`, error);
          return {
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
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches (Gemini rate limiting)
      if (i + maxConcurrent < stocks.length) {
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