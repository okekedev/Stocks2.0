// src/services/SimplifiedTechnicalService.js - Focus on actionable intraday signals
class TechnicalService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = new URL(endpoint, this.baseUrl);
      url.searchParams.set('apikey', this.apiKey);
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[ERROR] Technical analysis request failed:`, error);
      throw error;
    }
  }

  // Get recent minute bars - FIXED logic for proper time range
  async getRecentMinuteBars(ticker, hours = 4) {
    try {
      const now = new Date();
      const fromDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      // Format dates properly for Polygon API
      const from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const to = now.toISOString().split('T')[0];
      
      console.log(`[INFO] Fetching ${hours}h of minute bars for ${ticker} from ${from} to ${to}`);
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/minute/${from}/${to}`, {
        adjusted: true,
        sort: 'desc',
        limit: 50000 // High limit to get all recent data
      });
      
      if (!response.results || response.results.length === 0) {
        console.warn(`[WARN] No minute bars found for ${ticker}`);
        return [];
      }
      
      // Filter to actual time range (API sometimes returns more)
      const cutoffTime = fromDate.getTime();
      const recentBars = response.results
        .filter(bar => bar.t >= cutoffTime)
        .sort((a, b) => a.t - b.t); // Sort chronologically
      
      console.log(`[INFO] Retrieved ${recentBars.length} minute bars for ${ticker} (expected ~${hours * 60 * 6.5} for market hours)`);
      
      return recentBars;
      
    } catch (error) {
      console.error(`[ERROR] Failed to get minute bars for ${ticker}:`, error);
      return [];
    }
  }

  // Calculate VWAP (Volume Weighted Average Price) - Key intraday indicator
  calculateVWAP(bars) {
    if (!bars || bars.length === 0) return null;
    
    let totalVolume = 0;
    let totalVolumePrice = 0;
    
    bars.forEach(bar => {
      const typicalPrice = (bar.h + bar.l + bar.c) / 3; // High + Low + Close / 3
      const volumePrice = typicalPrice * bar.v;
      
      totalVolumePrice += volumePrice;
      totalVolume += bar.v;
    });
    
    return totalVolume > 0 ? totalVolumePrice / totalVolume : null;
  }

  // Calculate current momentum - Are we trending up or down?
  calculateMomentum(bars) {
    if (!bars || bars.length < 10) return null;
    
    const recent = bars.slice(-10); // Last 10 minutes
    const earlier = bars.slice(-20, -10); // Previous 10 minutes
    
    const recentAvg = recent.reduce((sum, bar) => sum + bar.c, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, bar) => sum + bar.c, 0) / earlier.length;
    
    const momentumPercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    
    return {
      direction: momentumPercent > 0 ? 'bullish' : 'bearish',
      strength: Math.abs(momentumPercent),
      percentChange: momentumPercent
    };
  }

  // Volume analysis - Is volume supporting the move?
  analyzeVolume(bars) {
    if (!bars || bars.length < 20) return null;
    
    const recent10 = bars.slice(-10);
    const previous20 = bars.slice(-30, -10);
    
    const recentAvgVolume = recent10.reduce((sum, bar) => sum + bar.v, 0) / recent10.length;
    const historicalAvgVolume = previous20.reduce((sum, bar) => sum + bar.v, 0) / previous20.length;
    
    const volumeRatio = recentAvgVolume / historicalAvgVolume;
    
    return {
      currentAverage: recentAvgVolume,
      historicalAverage: historicalAvgVolume,
      ratio: volumeRatio,
      isAboveAverage: volumeRatio > 1.2, // 20% above average = significant
      volumeSpike: volumeRatio > 2.0, // 100% above = spike
      volumeDescription: volumeRatio > 2.0 ? 'High Spike' : 
                        volumeRatio > 1.5 ? 'Above Average' :
                        volumeRatio > 0.8 ? 'Normal' : 'Below Average'
    };
  }

  // Price levels - Support and resistance
  findKeyLevels(bars) {
    if (!bars || bars.length < 30) return null;
    
    const prices = bars.map(bar => bar.c);
    const highs = bars.map(bar => bar.h);
    const lows = bars.map(bar => bar.l);
    
    const currentPrice = prices[prices.length - 1];
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    // Simple support/resistance using recent price action
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);
    
    return {
      currentPrice,
      resistance,
      support,
      dayHigh: highestHigh,
      dayLow: lowestLow,
      distanceToResistance: ((resistance - currentPrice) / currentPrice) * 100,
      distanceToSupport: ((currentPrice - support) / currentPrice) * 100
    };
  }

  // Breakout detection - Key for intraday trading
  detectBreakout(bars) {
    if (!bars || bars.length < 30) return null;
    
    const recent5 = bars.slice(-5);
    const previous20 = bars.slice(-25, -5);
    
    const recentHigh = Math.max(...recent5.map(bar => bar.h));
    const recentLow = Math.min(...recent5.map(bar => bar.l));
    const historicalHigh = Math.max(...previous20.map(bar => bar.h));
    const historicalLow = Math.min(...previous20.map(bar => bar.l));
    
    const upwardBreakout = recentHigh > historicalHigh;
    const downwardBreakout = recentLow < historicalLow;
    
    return {
      hasBreakout: upwardBreakout || downwardBreakout,
      direction: upwardBreakout ? 'upward' : downwardBreakout ? 'downward' : 'none',
      strength: upwardBreakout ? 
        ((recentHigh - historicalHigh) / historicalHigh) * 100 :
        downwardBreakout ?
        ((historicalLow - recentLow) / historicalLow) * 100 : 0
    };
  }

  // Main analysis function - Everything traders need quickly
  async analyzeStock(ticker) {
    try {
      console.log(`[INFO] Starting simplified technical analysis for ${ticker}`);
      
      // Get 4 hours of minute data
      const bars = await this.getRecentMinuteBars(ticker, 4);
      
      if (bars.length === 0) {
        return {
          ticker,
          error: 'No recent minute data available',
          timestamp: new Date().toISOString()
        };
      }
      
      // Calculate all key metrics
      const vwap = this.calculateVWAP(bars);
      const momentum = this.calculateMomentum(bars);
      const volume = this.analyzeVolume(bars);
      const levels = this.findKeyLevels(bars);
      const breakout = this.detectBreakout(bars);
      
      const currentPrice = bars[bars.length - 1]?.c;
      const priceVsVwap = vwap ? ((currentPrice - vwap) / vwap) * 100 : null;
      
      // Format raw data for AI analysis (no human interpretation)
      const technicalData = this.formatForAI({
        priceVsVwap,
        momentum,
        volume,
        breakout,
        levels
      });
      
      console.log(`[SUCCESS] Technical data prepared for ${ticker} - ${bars.length} bars analyzed`);
      
      return {
        ticker,
        currentPrice,
        barsAnalyzed: bars.length,
        timeframe: '4h',
        
        // Raw technical data for AI
        technicalData,
        
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[ERROR] Technical analysis failed for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Just format raw data for AI - no human interpretation
  formatForAI({ priceVsVwap, momentum, volume, breakout, levels }) {
    return {
      // Raw technical metrics - let AI decide what they mean
      priceVsVwap: priceVsVwap ? parseFloat(priceVsVwap.toFixed(3)) : null,
      momentum: momentum ? {
        percentChange: parseFloat(momentum.percentChange.toFixed(3)),
        strength: parseFloat(momentum.strength.toFixed(3)),
        direction: momentum.direction
      } : null,
      volume: volume ? {
        ratio: parseFloat(volume.ratio.toFixed(2)),
        currentAverage: Math.round(volume.currentAverage),
        historicalAverage: Math.round(volume.historicalAverage),
        isAboveAverage: volume.isAboveAverage,
        volumeSpike: volume.volumeSpike
      } : null,
      breakout: breakout ? {
        hasBreakout: breakout.hasBreakout,
        direction: breakout.direction,
        strength: parseFloat(breakout.strength.toFixed(3))
      } : null,
      levels: levels ? {
        currentPrice: parseFloat(levels.currentPrice.toFixed(2)),
        resistance: parseFloat(levels.resistance.toFixed(2)),
        support: parseFloat(levels.support.toFixed(2)),
        distanceToResistance: parseFloat(levels.distanceToResistance.toFixed(2)),
        distanceToSupport: parseFloat(levels.distanceToSupport.toFixed(2))
      } : null,
      // Context only
      timeframe: 'last_4_hours',
      dataType: 'intraday_technical'
    };
  }

  // Batch analyze multiple stocks efficiently
  async batchAnalyze(tickers, maxConcurrent = 3) {
    const results = [];
    
    console.log(`[INFO] Starting batch technical analysis for ${tickers.length} stocks`);
    
    // Process in small batches to respect rate limits
    for (let i = 0; i < tickers.length; i += maxConcurrent) {
      const batch = tickers.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(ticker => this.analyzeStock(ticker));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrent < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[SUCCESS] Batch analysis complete: ${results.length} stocks analyzed`);
    return results;
  }
}

export const technicalService = new TechnicalService();