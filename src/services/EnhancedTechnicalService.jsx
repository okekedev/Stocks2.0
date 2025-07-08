// src/services/EnhancedTechnicalService.js - Simplified: Always Get Last 4 Hours
import { polygonService } from './PolygonService';

class EnhancedTechnicalService {
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

  // ✅ SIMPLIFIED: Always get last 4 hours of data regardless of session
  async getLast4HoursData(ticker) {
    try {
      const now = new Date();
      const marketSession = polygonService.getCurrentMarketSession();
      
      console.log(`[TechnicalService] Getting last 4H data for ${ticker} (current session: ${marketSession.session})`);
      
      // ✅ SIMPLE: Always get exactly 4 hours back from now
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      
      // Use a wider date range to ensure we get data (go back extra days to be safe)
      const fromDate = new Date(fourHoursAgo.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days back
      const toDate = now;
      
      const from = fromDate.toISOString().split('T')[0];
      const to = toDate.toISOString().split('T')[0];
      
      console.log(`[TechnicalService] Fetching data from ${fourHoursAgo.toISOString()} to ${now.toISOString()}`);
      
      // ✅ Get multiple timeframes using PolygonService (includes all sessions)
      const [minuteBars, fiveMinBars, fifteenMinBars] = await Promise.all([
        polygonService.getAggregatesWithExtendedHours(ticker, from, to, 1, 'minute'),   // 1-minute
        polygonService.getAggregatesWithExtendedHours(ticker, from, to, 5, 'minute'),   // 5-minute  
        polygonService.getAggregatesWithExtendedHours(ticker, from, to, 15, 'minute')   // 15-minute
      ]);
      
      // ✅ SIMPLE: Filter to exactly last 4 hours regardless of session type
      const fourHoursCutoff = fourHoursAgo.getTime();
      
      const recentMinuteBars = minuteBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      const recentFiveMinBars = fiveMinBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      const recentFifteenMinBars = fifteenMinBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      
      // ✅ Count different session types
      const extendedHoursBars = recentMinuteBars.filter(bar => bar.isExtendedHours).length;
      const regularHoursBars = recentMinuteBars.filter(bar => !bar.isExtendedHours).length;
      
      // ✅ Get session breakdown
      const sessionBreakdown = this.getSessionBreakdown(recentMinuteBars);
      
      console.log(`[TechnicalService] ${ticker} last 4H data:`, {
        total: recentMinuteBars.length,
        fiveMin: recentFiveMinBars.length,
        fifteenMin: recentFifteenMinBars.length,
        sessions: sessionBreakdown,
        currentSession: marketSession.session,
        timeRange: `${fourHoursAgo.toLocaleTimeString()} - ${now.toLocaleTimeString()}`
      });
      
      return {
        ticker,
        marketSession,
        timeframes: {
          '1min': recentMinuteBars,
          '5min': recentFiveMinBars,
          '15min': recentFifteenMinBars
        },
        metadata: {
          totalBars: recentMinuteBars.length + recentFiveMinBars.length + recentFifteenMinBars.length,
          extendedHoursBars,
          regularHoursBars,
          sessionBreakdown,
          historyTimespan: '4h',
          predictionTimespan: '8h forward',
          lastUpdate: now.toISOString(),
          fromTimestamp: fourHoursCutoff,
          toTimestamp: now.getTime(),
          currentSession: marketSession.session,
          hasExtendedHoursData: extendedHoursBars > 0,
          dataQuality: this.assessDataQuality(recentMinuteBars, marketSession)
        }
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to get 4H data for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        marketSession: polygonService.getCurrentMarketSession(),
        timeframes: { '1min': [], '5min': [], '15min': [] },
        metadata: { 
          totalBars: 0, 
          historyTimespan: '4h', 
          predictionTimespan: '8h forward', 
          lastUpdate: new Date().toISOString() 
        }
      };
    }
  }

  // ✅ NEW: Get breakdown of sessions in the data
  getSessionBreakdown(minuteBars) {
    const breakdown = {
      premarket: 0,
      regular: 0,
      afterhours: 0,
      closed: 0
    };

    minuteBars.forEach(bar => {
      if (bar.sessionType === 'premarket') breakdown.premarket++;
      else if (bar.sessionType === 'regular') breakdown.regular++;
      else if (bar.sessionType === 'afterhours') breakdown.afterhours++;
      else breakdown.closed++;
    });

    return breakdown;
  }

  // ✅ UPDATED: Data quality assessment for any 4-hour period
  assessDataQuality(minuteBars, marketSession) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    
    const veryRecentBars = minuteBars.filter(bar => bar.timestamp >= oneHourAgo);
    const recentBars = minuteBars.filter(bar => bar.timestamp >= twoHoursAgo);
    const extendedHoursBars = minuteBars.filter(bar => bar.isExtendedHours);
    
    // ✅ Realistic expectations based on what sessions we have data from
    const sessionBreakdown = this.getSessionBreakdown(minuteBars);
    const hasRegularHours = sessionBreakdown.regular > 0;
    const hasExtendedHours = sessionBreakdown.premarket > 0 || sessionBreakdown.afterhours > 0;
    
    // Adjust expectations based on session mix
    let expectedBars = 240; // 4 hours = 240 minutes (ideal)
    let qualityThreshold = 30;
    
    if (hasExtendedHours && !hasRegularHours) {
      // Only extended hours data (lower volume expected)
      qualityThreshold = 15;
    } else if (hasRegularHours && hasExtendedHours) {
      // Mixed session data (normal expectations)
      qualityThreshold = 25;
    }
    
    const latestBar = veryRecentBars.length > 0 ? veryRecentBars[veryRecentBars.length - 1] : null;
    const latestDataAge = latestBar ? Math.round((now - latestBar.timestamp) / 60000) : null;
    
    let quality = 'poor';
    if (veryRecentBars.length > qualityThreshold) {
      quality = 'excellent';
    } else if (veryRecentBars.length > qualityThreshold / 2) {
      quality = 'good';
    } else if (recentBars.length > qualityThreshold / 2) {
      quality = 'fair';
    }
    
    return {
      hasVeryRecentData: veryRecentBars.length > 0,
      latestDataAge,
      totalMinuteBars: minuteBars.length,
      veryRecentBars: veryRecentBars.length,
      recentBars: recentBars.length,
      expectedBars,
      completeness: Math.min(100, Math.round((minuteBars.length / expectedBars) * 100)),
      hasExtendedHoursData: extendedHoursBars.length > 0,
      extendedHoursBars: extendedHoursBars.length,
      regularHoursBars: minuteBars.filter(bar => !bar.isExtendedHours).length,
      quality,
      marketSession: marketSession.session,
      sessionMix: hasRegularHours && hasExtendedHours ? 'mixed' : 
                  hasExtendedHours ? 'extended_only' : 'regular_only',
      // ✅ Session-specific metrics
      avgExtendedHoursVolume: this.calculateAvgVolume(extendedHoursBars),
      avgRegularHoursVolume: this.calculateAvgVolume(minuteBars.filter(bar => !bar.isExtendedHours))
    };
  }

  // ✅ Helper to calculate average volume
  calculateAvgVolume(bars) {
    if (bars.length === 0) return 0;
    const totalVolume = bars.reduce((sum, bar) => sum + (bar.volume || 0), 0);
    return Math.round(totalVolume / bars.length);
  }

  // ✅ UPDATED: Main analysis function - Always 4 hours of data
  async analyzeStockForAI(ticker) {
    try {
      console.log(`[TechnicalService] Starting 8-hour prediction analysis for ${ticker}`);
      
      // ✅ Get exactly 4 hours of data regardless of session
      const focusedData = await this.getLast4HoursData(ticker);
      
      if (focusedData.error || focusedData.metadata.totalBars === 0) {
        return {
          ticker,
          error: focusedData.error || 'No market data available in last 4 hours',
          hasData: false,
          dataPoints: 0,
          analysisType: '8h_prediction'
        };
      }
      
      // ✅ Extract latest price info from all timeframes
      const allBars = [
        ...focusedData.timeframes['1min'],
        ...focusedData.timeframes['5min']
      ].sort((a, b) => b.timestamp - a.timestamp);
      
      const latestBar = allBars[0];
      const currentPrice = latestBar?.close;
      
      // ✅ Calculate momentum over different periods
      const hourlyBars = focusedData.timeframes['1min'].slice(-60); // Last hour
      const fourHourBars = focusedData.timeframes['1min']; // All 4 hours
      
      const hourlyMomentum = hourlyBars.length > 1 ? 
        ((hourlyBars[hourlyBars.length - 1].close - hourlyBars[0].close) / hourlyBars[0].close) * 100 : null;
      
      const fourHourMomentum = fourHourBars.length > 1 ? 
        ((fourHourBars[fourHourBars.length - 1].close - fourHourBars[0].close) / fourHourBars[0].close) * 100 : null;
      
      // ✅ Calculate 8-hour forward target timestamp
      const eightHourForwardTimestamp = Date.now() + 8 * 60 * 60 * 1000;
      
      const result = {
        ticker,
        hasData: true,
        dataPoints: focusedData.metadata.totalBars,
        analysisType: '8h_prediction',
        
        // ✅ Current state with session awareness
        marketSession: focusedData.marketSession,
        currentPrice,
        hourlyMomentum,
        fourHourMomentum,
        latestDataAge: Math.round((Date.now() - latestBar.timestamp) / 60000),
        
        // ✅ Time context for 8H prediction
        timeContext: {
          currentUtcTime: Date.now(),
          eightHourTarget: eightHourForwardTimestamp,
          currentSession: focusedData.marketSession.session,
          hasExtendedHours: focusedData.marketSession.hasExtendedHours,
          isActive: focusedData.marketSession.isActive,
          sessionBreakdown: focusedData.metadata.sessionBreakdown
        },
        
        // ✅ Raw data for AI (4 hours regardless of session)
        rawTimeframes: focusedData.timeframes,
        
        // ✅ Enhanced data quality with session mix info
        dataQuality: focusedData.metadata.dataQuality,
        
        timestamp: new Date().toISOString()
      };
      
      console.log(`[TechnicalService] 8H prediction data ready for ${ticker}:`, {
        totalDataPoints: focusedData.metadata.totalBars,
        currentPrice,
        currentSession: focusedData.marketSession.session,
        sessionMix: focusedData.metadata.dataQuality.sessionMix,
        hourlyMomentum: hourlyMomentum?.toFixed(2) + '%',
        fourHourMomentum: fourHourMomentum?.toFixed(2) + '%',
        dataQuality: focusedData.metadata.dataQuality.quality,
        hasExtendedHours: focusedData.metadata.hasExtendedHoursData,
        extendedHoursBars: focusedData.metadata.extendedHoursBars,
        regularHoursBars: focusedData.metadata.regularHoursBars,
        latestDataAge: `${result.latestDataAge}m ago`
      });
      
      return result;
      
    } catch (error) {
      console.error(`[ERROR] 8-hour prediction analysis failed for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        hasData: false,
        dataPoints: 0,
        analysisType: '8h_prediction',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ Batch analysis
  async batchAnalyzeForAI(tickers, maxConcurrent = 5) {
    const results = [];
    
    console.log(`[TechnicalService] Starting batch 8H prediction analysis for ${tickers.length} stocks`);
    
    for (let i = 0; i < tickers.length; i += maxConcurrent) {
      const batch = tickers.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(ticker => this.analyzeStockForAI(ticker));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrent < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const successfulResults = results.filter(r => r.hasData);
    console.log(`[TechnicalService] Batch 8H prediction complete: ${successfulResults.length}/${tickers.length} successful`);
    
    return results;
  }
}

export const enhancedTechnicalService = new EnhancedTechnicalService();