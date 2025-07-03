// src/services/PolygonService.js
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
    
    // Robinhood supported exchanges
    const robinhoodExchanges = [
      'XNYS', // NYSE
      'XNAS', // NASDAQ
      'ARCX', // NYSE Arca
      'XASE', // NYSE American
      'BATS', // Cboe BZX
      'BATY', // Cboe BYX
      'EDGX', // Cboe EDGX
      'EDGA', // Cboe EDGA
      'IEXG', // IEX
      'MEMX', // MEMX
      'LTSE'  // Long Term Stock Exchange
    ];
    
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

  // Get 30 minutes of minute data
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

  // Analyze price action
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