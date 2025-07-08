// src/services/EnhancedTechnicalService.js - Optimized for 8-Hour Predictions
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

  // ✅ OPTIMIZED: Get current market session info
  getCurrentMarketSession() {
    const now = new Date();
    const utcNow = now.getTime();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const day = etNow.getDay();
    const hours = etNow.getHours();
    const minutes = etNow.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Define market periods in ET
    const periods = {
      preMarket: { start: 4 * 60, end: 9 * 60 + 30, name: 'premarket' },
      regular: { start: 9 * 60 + 30, end: 16 * 60, name: 'regular' },
      afterHours: { start: 16 * 60, end: 20 * 60, name: 'afterhours' }
    };
    
    let currentSession = 'closed';
    let nextSessionStart = null;
    let sessionEndsAt = null;
    
    if (day === 0 || day === 6) {
      currentSession = 'weekend';
    } else {
      for (const [key, period] of Object.entries(periods)) {
        if (timeInMinutes >= period.start && timeInMinutes < period.end) {
          currentSession = period.name;
          sessionEndsAt = new Date(etNow);
          sessionEndsAt.setHours(Math.floor(period.end / 60), period.end % 60, 0, 0);
          break;
        }
      }
      
      // Calculate 8-hour forward prediction window
      const eightHoursForward = new Date(utcNow + 8 * 60 * 60 * 1000);
      const eightHourET = new Date(eightHoursForward.toLocaleString("en-US", {timeZone: "America/New_York"}));
      
      // Find next session
      if (currentSession === 'closed') {
        if (timeInMinutes < periods.preMarket.start) {
          nextSessionStart = new Date(etNow);
          nextSessionStart.setHours(4, 0, 0, 0);
        } else if (timeInMinutes >= periods.afterHours.end) {
          nextSessionStart = new Date(etNow);
          nextSessionStart.setDate(nextSessionStart.getDate() + 1);
          nextSessionStart.setHours(4, 0, 0, 0);
        }
      }
    }
    
    return {
      currentSession,
      utcTimestamp: utcNow,
      easternTime: etNow.toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
      easternDate: etNow.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
      sessionEndsAt: sessionEndsAt?.getTime() || null,
      nextSessionStart: nextSessionStart?.getTime() || null,
      hoursUntilNextSession: nextSessionStart ? Math.round((nextSessionStart.getTime() - utcNow) / (1000 * 60 * 60)) : null,
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      isWeekend: day === 0 || day === 6,
      // ✅ NEW: 8-hour forward prediction window
      eightHourForwardTimestamp: utcNow + 8 * 60 * 60 * 1000,
      predictionWindowEnd: new Date(utcNow + 8 * 60 * 60 * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York' })
    };
  }

  // ✅ OPTIMIZED: Get last 4 hours of data (much faster)
  async getLast4HoursData(ticker) {
    try {
      const now = new Date();
      const marketSession = this.getCurrentMarketSession();
      
      // ✅ FOCUSED: Only get last 4 hours
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      
      // If it's weekend/closed, adjust to get last trading data
      let fromTime = fourHoursAgo;
      if (marketSession.isWeekend || marketSession.currentSession === 'closed') {
        const lastFriday = new Date(now);
        lastFriday.setDate(now.getDate() - (now.getDay() + 2) % 7); // Last Friday
        lastFriday.setUTCHours(21, 0, 0, 0); // 4 PM ET = 21:00 UTC
        fromTime = new Date(lastFriday.getTime() - 4 * 60 * 60 * 1000); // 4 hours before close
      }
      
      const from = fromTime.toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      
      console.log(`[INFO] Fetching recent 4H data for ${ticker} from ${fromTime.toLocaleTimeString()} to ${now.toLocaleTimeString()}`);
      console.log(`[INFO] Market session: ${marketSession.currentSession}, 8-hour prediction until: ${marketSession.predictionWindowEnd}`);
      
      // ✅ STREAMLINED: Get only essential timeframes
      const [minuteBars, fiveMinBars, fifteenMinBars] = await Promise.all([
        this.getAggregatesWithExtendedHours(ticker, from, to, 1, 'minute'),   // 1-minute
        this.getAggregatesWithExtendedHours(ticker, from, to, 5, 'minute'),   // 5-minute  
        this.getAggregatesWithExtendedHours(ticker, from, to, 15, 'minute')   // 15-minute
      ]);
      
      // ✅ OPTIMIZED: Filter to exactly last 4 hours
      const fourHoursCutoff = now.getTime() - 4 * 60 * 60 * 1000;
      
      const recentMinuteBars = minuteBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      const recentFiveMinBars = fiveMinBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      const recentFifteenMinBars = fifteenMinBars.filter(bar => bar.timestamp >= fourHoursCutoff);
      
      console.log(`[SUCCESS] Recent 4H data for ${ticker}:`, {
        minute: recentMinuteBars.length,
        fiveMin: recentFiveMinBars.length,
        fifteenMin: recentFifteenMinBars.length,
        timespan: '4h recent data for 8h prediction'
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
          historyTimespan: '4h',
          predictionTimespan: '8h forward',
          lastUpdate: now.toISOString(),
          fromTimestamp: fourHoursCutoff,
          toTimestamp: marketSession.eightHourForwardTimestamp,
          currentSession: marketSession.currentSession,
          dataQuality: this.assessFocusedDataQuality(recentMinuteBars)
        }
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to get 4H data for ${ticker}:`, error);
      return {
        ticker,
        error: error.message,
        marketSession: this.getCurrentMarketSession(),
        timeframes: { '1min': [], '5min': [], '15min': [] },
        metadata: { totalBars: 0, historyTimespan: '4h', predictionTimespan: '8h forward', lastUpdate: new Date().toISOString() }
      };
    }
  }

  // ✅ UNCHANGED: Get aggregates including extended hours data
  async getAggregatesWithExtendedHours(ticker, from, to, multiplier = 1, timespan = 'minute') {
    try {
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`, {
        adjusted: true,
        sort: 'asc',
        limit: 50000
      });
      
      if (!response.results || response.results.length === 0) {
        return [];
      }
      
      return response.results.map(bar => {
        const timestamp = bar.t;
        const datetime = new Date(timestamp);
        const etTime = new Date(datetime.toLocaleString("en-US", {timeZone: "America/New_York"}));
        
        const hours = etTime.getHours();
        const minutes = etTime.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        
        let sessionType = 'regular';
        if (timeInMinutes < 4 * 60) sessionType = 'closed';
        else if (timeInMinutes < 9 * 60 + 30) sessionType = 'premarket';
        else if (timeInMinutes < 16 * 60) sessionType = 'regular';
        else if (timeInMinutes < 20 * 60) sessionType = 'afterhours';
        else sessionType = 'closed';
        
        return {
          timestamp: timestamp,
          datetime: datetime.toISOString(),
          easternTime: etTime.toLocaleTimeString('en-US'),
          sessionType,
          open: parseFloat(bar.o.toFixed(4)),
          high: parseFloat(bar.h.toFixed(4)),
          low: parseFloat(bar.l.toFixed(4)),
          close: parseFloat(bar.c.toFixed(4)),
          volume: bar.v,
          vwap: parseFloat(bar.vw?.toFixed(4) || 0),
          trades: bar.n || 0,
          isExtendedHours: sessionType !== 'regular'
        };
      });
      
    } catch (error) {
      console.error(`[ERROR] Failed to get ${multiplier}${timespan} aggregates:`, error);
      return [];
    }
  }

  // ✅ OPTIMIZED: Focused data quality assessment
  assessFocusedDataQuality(minuteBars) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    
    const veryRecentBars = minuteBars.filter(bar => bar.timestamp >= oneHourAgo);
    const recentBars = minuteBars.filter(bar => bar.timestamp >= twoHoursAgo);
    
    return {
      hasVeryRecentData: veryRecentBars.length > 0,
      latestDataAge: veryRecentBars.length > 0 ? Math.round((now - veryRecentBars[veryRecentBars.length - 1].timestamp) / 60000) : null,
      totalMinuteBars: minuteBars.length,
      veryRecentBars: veryRecentBars.length,
      recentBars: recentBars.length,
      expectedBars: 240, // 4 hours = 240 minutes
      completeness: Math.min(100, Math.round((minuteBars.length / 240) * 100)),
      hasExtendedHoursData: minuteBars.some(bar => bar.isExtendedHours),
      extendedHoursBars: minuteBars.filter(bar => bar.isExtendedHours).length,
      quality: veryRecentBars.length > 30 ? 'excellent' : 
               veryRecentBars.length > 15 ? 'good' : 
               recentBars.length > 30 ? 'fair' : 'poor'
    };
  }

  // ✅ UPDATED: Main analysis function - 8-hour prediction analysis
  async analyzeStockForAI(ticker) {
    try {
      console.log(`[INFO] Starting 8-hour prediction analysis for ${ticker}`);
      
      // ✅ FOCUSED: Get only last 4 hours
      const focusedData = await this.getLast4HoursData(ticker);
      
      if (focusedData.error || focusedData.metadata.totalBars === 0) {
        return {
          ticker,
          error: focusedData.error || 'No recent 4H market data available',
          hasData: false,
          dataPoints: 0,
          analysisType: '8h_prediction'
        };
      }
      
      // Extract latest price info from focused dataset
      const allBars = [
        ...focusedData.timeframes['1min'],
        ...focusedData.timeframes['5min']
      ].sort((a, b) => b.timestamp - a.timestamp);
      
      const latestBar = allBars[0];
      const currentPrice = latestBar?.close;
      
      // Calculate 4-hour momentum
      const fourHourStart = allBars[allBars.length - 1];
      const fourHourMomentum = currentPrice && fourHourStart ? 
        ((currentPrice - fourHourStart.close) / fourHourStart.close) * 100 : null;
      
      // ✅ STREAMLINED: Package for AI
      const result = {
        ticker,
        hasData: true,
        dataPoints: focusedData.metadata.totalBars,
        analysisType: '8h_prediction',
        
        // Current state
        marketSession: focusedData.marketSession,
        currentPrice,
        fourHourMomentum,
        latestDataAge: Math.round((Date.now() - latestBar.timestamp) / 60000),
        
        // ✅ FOCUSED: Time context for 8H prediction
        timeContext: {
          currentUtcTime: focusedData.marketSession.utcTimestamp,
          currentEasternTime: focusedData.marketSession.easternTime,
          currentSession: focusedData.marketSession.currentSession,
          eightHourTarget: focusedData.marketSession.eightHourForwardTimestamp,
          predictionWindowEnd: focusedData.marketSession.predictionWindowEnd,
          hoursUntilNextSession: focusedData.marketSession.hoursUntilNextSession,
          isWeekend: focusedData.marketSession.isWeekend
        },
        
        // ✅ FOCUSED: Only last 4H of data for AI
        rawTimeframes: focusedData.timeframes,
        
        // Data quality
        dataQuality: focusedData.metadata.dataQuality,
        
        timestamp: new Date().toISOString()
      };
      
      console.log(`[SUCCESS] 8-hour prediction data ready for ${ticker}:`, {
        totalDataPoints: focusedData.metadata.totalBars,
        currentPrice,
        session: focusedData.marketSession.currentSession,
        fourHourMomentum: fourHourMomentum?.toFixed(2) + '%',
        dataQuality: focusedData.metadata.dataQuality.quality,
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

  // ✅ OPTIMIZED: Batch analysis
  async batchAnalyzeForAI(tickers, maxConcurrent = 5) { // Increased concurrency
    const results = [];
    
    console.log(`[INFO] Starting batch 8-hour prediction analysis for ${tickers.length} stocks`);
    
    for (let i = 0; i < tickers.length; i += maxConcurrent) {
      const batch = tickers.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(ticker => this.analyzeStockForAI(ticker));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Reduced delay for faster processing
      if (i + maxConcurrent < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms
      }
    }
    
    const successfulResults = results.filter(r => r.hasData);
    console.log(`[SUCCESS] Batch 8-hour prediction analysis complete: ${successfulResults.length}/${tickers.length} successful`);
    
    return results;
  }
}

export const enhancedTechnicalService = new EnhancedTechnicalService();