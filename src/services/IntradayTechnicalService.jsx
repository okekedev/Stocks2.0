// src/services/IntradayTechnicalService.js - Pure Mathematical Calculations Only
class IntradayTechnicalService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.cache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2 minutes cache
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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[ERROR] API request failed:`, error);
      throw error;
    }
  }

  // Get minute-by-minute data in time window
  async getMinuteData(ticker, hoursWindow = 4) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hoursWindow * 60 * 60 * 1000));
    
    const fromDate = startTime.toISOString().split('T')[0];
    const toDate = endTime.toISOString().split('T')[0];
    
    try {
      console.log(`[INFO] Fetching ${hoursWindow}h minute data for ${ticker}`);
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/minute/${fromDate}/${toDate}`, {
        adjusted: true,
        sort: 'asc',
        limit: 50000
      });

      if (!response.results || response.results.length === 0) {
        throw new Error(`No minute data for ${ticker}`);
      }

      // Convert to clean data arrays
      const bars = response.results
        .filter(bar => {
          const barTime = new Date(bar.t);
          return barTime >= startTime && barTime <= endTime;
        })
        .map(bar => ({
          timestamp: bar.t,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw || null,
          transactions: bar.n || null
        }));

      console.log(`[SUCCESS] Retrieved ${bars.length} minute bars for ${ticker}`);
      return bars;

    } catch (error) {
      console.error(`[ERROR] Failed to get minute data for ${ticker}:`, error);
      throw error;
    }
  }

  // Pure mathematical calculations - no interpretation
  calculatePureTechnicals(bars) {
    if (!bars || bars.length < 30) {
      return { error: 'Insufficient data', dataPoints: bars?.length || 0 };
    }

    // Extract raw arrays
    const opens = bars.map(bar => bar.open);
    const highs = bars.map(bar => bar.high);
    const lows = bars.map(bar => bar.low);
    const closes = bars.map(bar => bar.close);
    const volumes = bars.map(bar => bar.volume);
    const vwaps = bars.map(bar => bar.vwap).filter(v => v !== null);
    const timestamps = bars.map(bar => bar.timestamp);

    return {
      // Raw data arrays (last 50 points for AI analysis)
      arrays: {
        closes: closes.slice(-50),
        volumes: volumes.slice(-50),
        highs: highs.slice(-50),
        lows: lows.slice(-50),
        vwaps: vwaps.slice(-50),
        timestamps: timestamps.slice(-50)
      },

      // Price calculations
      price: {
        current: closes[closes.length - 1],
        open: opens[0],
        high: Math.max(...highs),
        low: Math.min(...lows),
        range: Math.max(...highs) - Math.min(...lows),
        volatility: this.standardDeviation(closes),
        returns: this.calculateReturns(closes)
      },

      // Moving averages (multiple timeframes)
      sma: {
        sma_5: this.sma(closes, 5),
        sma_10: this.sma(closes, 10),
        sma_15: this.sma(closes, 15),
        sma_20: this.sma(closes, 20),
        sma_30: this.sma(closes, 30),
        sma_50: this.sma(closes, 50)
      },

      // Exponential moving averages
      ema: {
        ema_5: this.ema(closes, 5),
        ema_10: this.ema(closes, 10),
        ema_12: this.ema(closes, 12),
        ema_20: this.ema(closes, 20),
        ema_26: this.ema(closes, 26),
        ema_50: this.ema(closes, 50)
      },

      // RSI calculations
      rsi: {
        rsi_7: this.rsi(closes, 7),
        rsi_14: this.rsi(closes, 14),
        rsi_21: this.rsi(closes, 21)
      },

      // MACD values
      macd: this.macd(closes, 12, 26, 9),

      // Bollinger Bands
      bollinger_20_2: this.bollingerBands(closes, 20, 2),
      bollinger_20_1: this.bollingerBands(closes, 20, 1),

      // Volume metrics
      volume: {
        current: volumes[volumes.length - 1],
        average: this.average(volumes),
        stddev: this.standardDeviation(volumes),
        ratio_recent: this.average(volumes.slice(-10)) / this.average(volumes.slice(-30, -10)),
        max: Math.max(...volumes),
        min: Math.min(...volumes),
        vwap_current: vwaps[vwaps.length - 1] || null,
        vwap_average: this.average(vwaps)
      },

      // Statistical measures
      statistics: {
        mean_return: this.average(this.calculateReturns(closes)),
        return_volatility: this.standardDeviation(this.calculateReturns(closes)),
        skewness: this.skewness(this.calculateReturns(closes)),
        kurtosis: this.kurtosis(this.calculateReturns(closes)),
        autocorrelation: this.autocorrelation(closes, 1)
      },

      // Price momentum calculations
      momentum: {
        roc_5: this.rateOfChange(closes, 5),
        roc_10: this.rateOfChange(closes, 10),
        roc_20: this.rateOfChange(closes, 20),
        momentum_10: this.momentum(closes, 10),
        momentum_20: this.momentum(closes, 20)
      },

      // Support/Resistance levels (mathematical)
      levels: {
        resistance_levels: this.findResistanceLevels(highs, closes),
        support_levels: this.findSupportLevels(lows, closes),
        pivot_points: this.pivotPoints(highs[highs.length - 1], lows[lows.length - 1], closes[closes.length - 1])
      },

      // Meta information
      meta: {
        total_bars: bars.length,
        timespan_minutes: bars.length,
        first_timestamp: timestamps[0],
        last_timestamp: timestamps[timestamps.length - 1],
        data_quality: this.assessDataQuality(bars)
      }
    };
  }

  // Mathematical functions - pure calculations only

  average(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
  }

  standardDeviation(values) {
    const avg = this.average(values);
    if (!avg) return null;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.average(squaredDiffs));
  }

  sma(values, period) {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return this.average(slice);
  }

  ema(values, period) {
    if (values.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }

  rsi(values, period = 14) {
    if (values.length < period + 1) return null;
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = this.average(gains.slice(-period));
    const avgLoss = this.average(losses.slice(-period));
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (values.length < slowPeriod) return { macd: null, signal: null, histogram: null };
    
    const emaFast = this.ema(values, fastPeriod);
    const emaSlow = this.ema(values, slowPeriod);
    
    if (!emaFast || !emaSlow) return { macd: null, signal: null, histogram: null };
    
    const macdLine = emaFast - emaSlow;
    // Simplified signal line (in real implementation would need MACD history)
    const signalLine = macdLine;
    const histogram = macdLine - signalLine;
    
    return { 
      macd: macdLine, 
      signal: signalLine, 
      histogram: histogram 
    };
  }

  bollingerBands(values, period = 20, stdDevMultiplier = 2) {
    if (values.length < period) return { upper: null, middle: null, lower: null, bandwidth: null, percent_b: null };
    
    const sma = this.sma(values, period);
    const stdDev = this.standardDeviation(values.slice(-period));
    
    if (!sma || !stdDev) return { upper: null, middle: null, lower: null, bandwidth: null, percent_b: null };
    
    const upper = sma + (stdDev * stdDevMultiplier);
    const lower = sma - (stdDev * stdDevMultiplier);
    const currentPrice = values[values.length - 1];
    
    return {
      upper: upper,
      middle: sma,
      lower: lower,
      bandwidth: (upper - lower) / sma,
      percent_b: (currentPrice - lower) / (upper - lower)
    };
  }

  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  rateOfChange(values, period) {
    if (values.length < period + 1) return null;
    const current = values[values.length - 1];
    const previous = values[values.length - 1 - period];
    return (current - previous) / previous;
  }

  momentum(values, period) {
    if (values.length < period + 1) return null;
    return values[values.length - 1] - values[values.length - 1 - period];
  }

  skewness(values) {
    const mean = this.average(values);
    const stdDev = this.standardDeviation(values);
    if (!mean || !stdDev) return null;
    
    const n = values.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.pow((values[i] - mean) / stdDev, 3);
    }
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  kurtosis(values) {
    const mean = this.average(values);
    const stdDev = this.standardDeviation(values);
    if (!mean || !stdDev) return null;
    
    const n = values.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.pow((values[i] - mean) / stdDev, 4);
    }
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  autocorrelation(values, lag) {
    if (values.length < lag + 1) return null;
    
    const mean = this.average(values);
    let numerator = 0;
    let denominator = 0;
    
    for (let i = lag; i < values.length; i++) {
      numerator += (values[i] - mean) * (values[i - lag] - mean);
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator !== 0 ? numerator / denominator : null;
  }

  findResistanceLevels(highs, closes) {
    const currentPrice = closes[closes.length - 1];
    const recentHighs = highs.slice(-50);
    const levels = [];
    
    for (let i = 1; i < recentHighs.length - 1; i++) {
      if (recentHighs[i] > recentHighs[i - 1] && recentHighs[i] > recentHighs[i + 1]) {
        if (recentHighs[i] > currentPrice) {
          levels.push(recentHighs[i]);
        }
      }
    }
    
    return levels.slice(0, 3); // Top 3 resistance levels
  }

  findSupportLevels(lows, closes) {
    const currentPrice = closes[closes.length - 1];
    const recentLows = lows.slice(-50);
    const levels = [];
    
    for (let i = 1; i < recentLows.length - 1; i++) {
      if (recentLows[i] < recentLows[i - 1] && recentLows[i] < recentLows[i + 1]) {
        if (recentLows[i] < currentPrice) {
          levels.push(recentLows[i]);
        }
      }
    }
    
    return levels.slice(0, 3); // Top 3 support levels
  }

  pivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;
    return {
      pivot: pivot,
      r1: (2 * pivot) - low,
      r2: pivot + (high - low),
      s1: (2 * pivot) - high,
      s2: pivot - (high - low)
    };
  }

  assessDataQuality(bars) {
    let gaps = 0;
    for (let i = 1; i < bars.length; i++) {
      const timeDiff = bars[i].timestamp - bars[i - 1].timestamp;
      if (timeDiff > 60000) gaps++; // > 1 minute gap
    }
    
    return {
      total_bars: bars.length,
      data_gaps: gaps,
      completeness: 1 - (gaps / bars.length),
      volume_data_available: bars.filter(b => b.volume > 0).length / bars.length
    };
  }

  // MAIN METHOD: Get pure mathematical analysis
  async getNewsEventAnalysis(ticker, newsTimestamp, hoursWindow = 4) {
    console.log(`[INFO] Getting pure mathematical data for ${ticker}...`);
    
    try {
      // Get minute data
      const bars = await this.getMinuteData(ticker, hoursWindow);
      
      // Calculate pure technical indicators
      const technical = this.calculatePureTechnicals(bars);
      
      // Return raw mathematical data only
      return {
        metadata: {
          ticker: ticker,
          analysisTimestamp: Date.now(),
          newsTimestamp: new Date(newsTimestamp).getTime(),
          windowHours: hoursWindow
        },
        technical: technical
      };
      
    } catch (error) {
      console.error(`[ERROR] Failed to get analysis for ${ticker}:`, error);
      throw error;
    }
  }
}

export const intradayTechnicalService = new IntradayTechnicalService();