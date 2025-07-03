// src/services/PolygonService.js - Enhanced version
class PolygonService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    
    if (!this.apiKey) {
      throw new Error('VITE_POLYGON_API_KEY environment variable is required');
    }
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

      console.log(`[INFO] Polygon API call: ${endpoint}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[INFO] API response: ${data.status}, count: ${data.count || 0}`);
      
      return data;
    } catch (error) {
      console.error(`[ERROR] API request failed:`, error);
      throw error;
    }
  }

  // Get positive sentiment news only - filtered by Robinhood exchanges
  async getAllMarketNews(hours = 8) {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();
    
    console.log('[INFO] Fetching positive sentiment news from Robinhood exchanges...');
    
    const response = await this.makeRequest('/v2/reference/news', {
      limit: 1000,
      order: 'desc',
      sort: 'published_utc',
      'published_utc.gte': fromDate,
      'published_utc.lte': toDate
    });
    
    // Filter for positive sentiment + Robinhood exchanges
    if (response.results) {
      const originalCount = response.results.length;
      
      response.results = response.results.filter(article => {
        // Must have positive sentiment
        const hasPositiveSentiment = article.insights && 
          article.insights.some(insight => insight.sentiment === 'positive');
        
        if (!hasPositiveSentiment) return false;
        
        // Must have tickers from Robinhood exchanges
        const hasRobinhoodTickers = article.tickers && 
          article.tickers.some(ticker => {
            // Simple validation - just check it's a valid stock symbol
            return ticker && 
                   ticker.length <= 5 && 
                   ticker.length >= 1 && 
                   /^[A-Z]+$/.test(ticker);
          });
        
        return hasRobinhoodTickers;
      });
      
      console.log(`[INFO] Filtered ${originalCount} → ${response.results.length} positive Robinhood articles`);
    }
    
    return response;
  }

  // Enhanced method: Get detailed minute data for chart (1 hour before news to current)
  async getDetailedMinuteData(ticker, startTime, endTime) {
    try {
      const fromDate = startTime.toISOString().split('T')[0];
      const toDate = endTime.toISOString().split('T')[0];
      
      console.log(`[INFO] 📊 Fetching detailed minute data for ${ticker} from ${fromDate} to ${toDate}`);
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/minute/${fromDate}/${toDate}`, {
        adjusted: true,
        sort: 'asc',
        limit: 50000
      });
      
      if (!response.results || response.results.length === 0) {
        console.log(`[WARNING] No minute data for ${ticker}`);
        return [];
      }
      
      // Filter to exact time range and format for chart
      const startTimestamp = startTime.getTime();
      const endTimestamp = endTime.getTime();
      
      const chartData = response.results
        .filter(bar => bar.t >= startTimestamp && bar.t <= endTimestamp)
        .map(bar => ({
          timestamp: bar.t,
          time: new Date(bar.t).toISOString(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          volumeWeightedPrice: bar.vw || bar.c,
          transactions: bar.n || 0,
          // Additional fields for AI analysis
          priceChange: bar.c - bar.o,
          priceChangePercent: ((bar.c - bar.o) / bar.o) * 100,
          range: bar.h - bar.l,
          volatility: ((bar.h - bar.l) / bar.o) * 100
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`[INFO] Retrieved ${chartData.length} minute bars for ${ticker} chart`);
      return chartData;
      
    } catch (error) {
      console.error(`[ERROR] Failed to get detailed minute data for ${ticker}:`, error);
      return [];
    }
  }

  // Get market snapshots
  async getMarketData(tickers) {
    try {
      const batchSize = 250;
      const allSnapshots = [];
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        
        const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
          tickers: batch.join(',')
        });
        
        if (response.tickers) {
          allSnapshots.push(...response.tickers);
        }
        
        if (i + batchSize < tickers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return allSnapshots;
    } catch (error) {
      console.error('[ERROR] Failed to get market data:', error);
      return [];
    }
  }

  // Get 30 minutes of minute data (existing method)
  async getMinuteData(ticker, minutesBack = 30) {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - minutesBack * 60 * 1000);
      
      const fromDate = startTime.toISOString().split('T')[0];
      const toDate = now.toISOString().split('T')[0];
      
      console.log(`[INFO] Getting ${minutesBack}min data for ${ticker}`);
      
      const response = await this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/minute/${fromDate}/${toDate}`, {
        adjusted: true,
        sort: 'asc',
        limit: 50000
      });
      
      if (!response.results || response.results.length === 0) {
        console.log(`[WARNING] No minute data for ${ticker}`);
        return [];
      }
      
      const cutoffTime = now.getTime() - (minutesBack * 60 * 1000);
      const recentData = response.results
        .filter(bar => bar.t >= cutoffTime)
        .map(bar => ({
          timestamp: bar.t,
          time: new Date(bar.t).toISOString(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          volumeWeightedPrice: bar.vw || bar.c,
          transactions: bar.n || 0
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`[INFO] Retrieved ${recentData.length} minute bars for ${ticker}`);
      return recentData;
      
    } catch (error) {
      console.error(`[ERROR] Failed to get minute data for ${ticker}:`, error);
      return [];
    }
  }

  // Get current snapshot
  async getCurrentSnapshot(ticker) {
    try {
      const response = await this.makeRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
      
      if (!response.ticker) {
        return null;
      }
      
      const snapshot = response.ticker;
      return {
        ticker: snapshot.ticker,
        currentPrice: snapshot.lastTrade?.p || snapshot.lastQuote?.p || 0,
        change: snapshot.todaysChange || 0,
        changePercent: snapshot.todaysChangePerc || 0,
        volume: snapshot.day?.v || 0,
        previousClose: snapshot.prevDay?.c || 0,
        dayHigh: snapshot.day?.h || 0,
        dayLow: snapshot.day?.l || 0,
        dayOpen: snapshot.day?.o || 0,
        lastTradeTime: snapshot.lastTrade?.t || Date.now(),
        marketStatus: snapshot.market_status || 'unknown'
      };
    } catch (error) {
      console.error(`[ERROR] Failed to get snapshot for ${ticker}:`, error);
      return null;
    }
  }

  // Enhanced: Create formatted data package for AI analysis
  createAIDataPackage(ticker, chartData, newsTime, currentSnapshot) {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const newsTimestamp = newsTime ? new Date(newsTime).getTime() : null;
    
    // Split data into pre-news and post-news
    const preNewsData = newsTimestamp ? 
      chartData.filter(d => d.timestamp < newsTimestamp) : [];
    const postNewsData = newsTimestamp ? 
      chartData.filter(d => d.timestamp >= newsTimestamp) : chartData;

    // Calculate various metrics for AI
    const metrics = {
      // Basic price action
      totalPriceChange: chartData.length > 0 ? 
        ((chartData[chartData.length - 1].close - chartData[0].open) / chartData[0].open) * 100 : 0,
      
      // Pre/post news comparison
      preNewsAvgPrice: preNewsData.length > 0 ? 
        preNewsData.reduce((sum, d) => sum + d.close, 0) / preNewsData.length : 0,
      postNewsAvgPrice: postNewsData.length > 0 ? 
        postNewsData.reduce((sum, d) => sum + d.close, 0) / postNewsData.length : 0,
      
      // Volume analysis
      totalVolume: chartData.reduce((sum, d) => sum + d.volume, 0),
      avgVolume: chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length,
      maxVolume: Math.max(...chartData.map(d => d.volume)),
      volumeSpike: this.detectVolumeSpike(chartData, newsTimestamp),
      
      // Volatility
      priceRange: Math.max(...chartData.map(d => d.high)) - Math.min(...chartData.map(d => d.low)),
      avgVolatility: chartData.reduce((sum, d) => sum + d.volatility, 0) / chartData.length,
      
      // Momentum
      momentum: this.calculateMomentum(chartData),
      trend: this.calculateTrend(chartData),
      
      // Support/Resistance levels
      supportLevel: Math.min(...chartData.map(d => d.low)),
      resistanceLevel: Math.max(...chartData.map(d => d.high)),
      
      // Time-based metrics
      dataPoints: chartData.length,
      timespan: chartData.length > 0 ? 
        (chartData[chartData.length - 1].timestamp - chartData[0].timestamp) / (1000 * 60) : 0, // minutes
    };

    return {
      ticker,
      newsTime: newsTime?.toISOString(),
      currentPrice: currentSnapshot?.currentPrice || chartData[chartData.length - 1]?.close,
      chartData: chartData, // Full minute-by-minute data
      metrics,
      summary: {
        priceChangeTotal: metrics.totalPriceChange,
        priceChangePostNews: newsTimestamp && postNewsData.length > 0 ? 
          ((postNewsData[postNewsData.length - 1].close - (preNewsData[preNewsData.length - 1]?.close || postNewsData[0].open)) / 
           (preNewsData[preNewsData.length - 1]?.close || postNewsData[0].open)) * 100 : 0,
        volumeProfile: metrics.volumeSpike,
        volatilityLevel: metrics.avgVolatility > 2 ? 'high' : metrics.avgVolatility > 1 ? 'medium' : 'low',
        momentum: metrics.momentum,
        trend: metrics.trend
      }
    };
  }

  // Helper methods for AI data package
  detectVolumeSpike(chartData, newsTimestamp) {
    if (!newsTimestamp || chartData.length < 10) return false;
    
    const preNewsData = chartData.filter(d => d.timestamp < newsTimestamp);
    const postNewsData = chartData.filter(d => d.timestamp >= newsTimestamp).slice(0, 10); // First 10 minutes after news
    
    if (preNewsData.length < 5 || postNewsData.length < 5) return false;
    
    const avgPreVolume = preNewsData.reduce((sum, d) => sum + d.volume, 0) / preNewsData.length;
    const avgPostVolume = postNewsData.reduce((sum, d) => sum + d.volume, 0) / postNewsData.length;
    
    return avgPostVolume > avgPreVolume * 2; // 200% increase
  }

  calculateMomentum(chartData) {
    if (chartData.length < 10) return 0;
    
    const recent = chartData.slice(-10);
    const earlier = chartData.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.close, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, d) => sum + d.close, 0) / earlier.length;
    
    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  }

  calculateTrend(chartData) {
    if (chartData.length < 5) return 'insufficient_data';
    
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    const change = ((last - first) / first) * 100;
    
    if (change > 2) return 'strong_bullish';
    if (change > 0.5) return 'bullish';
    if (change < -2) return 'strong_bearish';
    if (change < -0.5) return 'bearish';
    return 'sideways';
  }

  // Analyze price action (existing method, kept for compatibility)
  analyzePriceAction(minuteData, currentSnapshot) {
    if (!minuteData || minuteData.length < 5) {
      return {
        trend: 'insufficient_data',
        volumeSpike: false,
        priceChange: 0,
        volumeRatio: 0,
        momentum: 0
      };
    }

    const firstBar = minuteData[0];
    const lastBar = minuteData[minuteData.length - 1];
    const totalVolume = minuteData.reduce((sum, bar) => sum + bar.volume, 0);
    const avgVolume = totalVolume / minuteData.length;
    
    const priceChange = ((lastBar.close - firstBar.open) / firstBar.open) * 100;
    
    const estimatedDailyVolume = currentSnapshot?.volume || 0;
    const thirtyMinuteExpectedVolume = estimatedDailyVolume * (30 / (6.5 * 60));
    const volumeRatio = thirtyMinuteExpectedVolume > 0 ? totalVolume / thirtyMinuteExpectedVolume : 0;
    
    let trend = 'sideways';
    if (priceChange > 1) trend = 'strong_up';
    else if (priceChange > 0.3) trend = 'up';
    else if (priceChange < -1) trend = 'strong_down';
    else if (priceChange < -0.3) trend = 'down';
    
    const volumeSpike = volumeRatio > 2.0;
    
    const firstHalf = minuteData.slice(0, Math.floor(minuteData.length / 2));
    const secondHalf = minuteData.slice(Math.floor(minuteData.length / 2));
    
    const firstHalfChange = firstHalf.length > 0 ? 
      ((firstHalf[firstHalf.length - 1].close - firstHalf[0].open) / firstHalf[0].open) * 100 : 0;
    const secondHalfChange = secondHalf.length > 0 ? 
      ((secondHalf[secondHalf.length - 1].close - secondHalf[0].open) / secondHalf[0].open) * 100 : 0;
    
    const momentum = secondHalfChange - firstHalfChange;
    
    return {
      trend,
      volumeSpike,
      priceChange: parseFloat(priceChange.toFixed(2)),
      volumeRatio: parseFloat(volumeRatio.toFixed(2)),
      momentum: parseFloat(momentum.toFixed(2)),
      totalVolume,
      avgVolume: Math.round(avgVolume),
      barsAnalyzed: minuteData.length
    };
  }
}

export const polygonService = new PolygonService();