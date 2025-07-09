// src/services/DividendService.js - Clean dividend data service with only 4 price points
class DividendService {
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

      console.log(`[DividendService] Making request to: ${url.toString()}`);
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[DividendService] API request failed:`, error);
      throw error;
    }
  }

  // Get upcoming dividends with historical analysis from their most recent past dividend
  async getUpcomingDividendsWithHistoricalAnalysis() {
    try {
      // Get upcoming dividends (next 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const start = today.toISOString().split('T')[0];
      const end = thirtyDaysFromNow.toISOString().split('T')[0];
      
      console.log(`[DividendService] Fetching UPCOMING dividends from ${start} to ${end}`);
      
      // ✅ OPTIMIZATION: Get more targeted results by requesting Regular dividends only
      const response = await this.makeRequest('/v3/reference/dividends', {
        'ex_dividend_date.gte': start,
        'ex_dividend_date.lte': end,
        order: 'asc',  // Soonest first
        sort: 'ex_dividend_date',
        limit: 1000,
        dividend_type: 'CD'  // Only regular cash dividends (not special/LT/ST)
      });
      
      if (!response.results || response.results.length === 0) {
        console.log('[DividendService] No upcoming dividends found in next 30 days');
        return [];
      }
      
      console.log(`[DividendService] Found ${response.results.length} upcoming regular dividends`);
      
      // ✅ EARLY FILTERING: Filter for US stocks FIRST before processing any data
      const usStocks = response.results.filter(div => this.isUSStock(div.ticker));
      console.log(`[DividendService] Early filtered to ${usStocks.length} US stock dividends (saved ${response.results.length - usStocks.length} non-US processing)`);
      
      if (usStocks.length === 0) {
        console.log('[DividendService] No US stocks found after filtering');
        return [];
      }
      
      // ✅ PRE-FILTER: Only get prices for US stocks
      const tickers = [...new Set(usStocks.map(div => div.ticker))];
      console.log(`[DividendService] Getting prices for ${tickers.length} US stock tickers only`);
      
      const currentPrices = await this.getCurrentPrices(tickers);
      
      // ✅ EARLY YIELD FILTERING: Only process stocks with current prices and potential high yield
      const stocksWithPrices = usStocks.filter(div => {
        const currentPrice = currentPrices.get(div.ticker);
        if (!currentPrice) return false;
        
        const dividendYield = (div.cash_amount / currentPrice) * 100;
        return dividendYield >= 2.0; // Early exit for low-yield stocks
      });
      
      console.log(`[DividendService] Pre-filtered to ${stocksWithPrices.length} high-yield stocks (saved ${usStocks.length - stocksWithPrices.length} low-yield processing)`);
      
      // Process each high-yield US dividend
      const processedDividends = [];
      
      for (const div of stocksWithPrices) {
        const currentPrice = currentPrices.get(div.ticker);
        
        // Calculate basic dividend info
        const frequency = div.frequency || 4;
        const annualizedAmount = frequency > 0 ? div.cash_amount * frequency : div.cash_amount;
        const dividendYield = (div.cash_amount / currentPrice) * 100;
        const annualizedYield = (annualizedAmount / currentPrice) * 100;
        
        // ✅ KEY: Get historical analysis from this stock's MOST RECENT PAST dividend
        const historicalAnalysis = await this.getHistoricalDividendAnalysis(div.ticker, div.ex_dividend_date);
        
        // Calculate trading dates for upcoming dividend
        const { buyByDate, sellAfterDate } = this.calculateTradingDates(div.ex_dividend_date, div.record_date);
        
        const processedDiv = {
          ...div,
          currentPrice,
          dividendYield,
          annualizedYield,
          annualizedAmount,
          buyByDate,
          sellAfterDate,
          daysUntilEx: Math.ceil((new Date(div.ex_dividend_date) - new Date()) / (1000 * 60 * 60 * 24)),
          daysUntilPay: div.pay_date ? Math.ceil((new Date(div.pay_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          hasPrice: true,
          
          // ✅ UPCOMING dividend info
          isUpcoming: true,
          
          // ✅ HISTORICAL analysis from most recent past dividend
          historicalAnalysis: historicalAnalysis,
          
          lastDividend: {
            amount: div.cash_amount,
            exDate: div.ex_dividend_date,
            frequency: div.frequency || 4
          }
        };
        
        processedDividends.push(processedDiv);
      }
      
      console.log(`[DividendService] Final result: ${processedDividends.length} upcoming high-yield US dividends with historical analysis`);
      return processedDividends;
      
    } catch (error) {
      console.error('[DividendService] Failed to get upcoming dividends with historical analysis:', error);
      throw error;
    }
  }

  // NEW: Get historical analysis from a stock's most recent past dividend
  async getHistoricalDividendAnalysis(ticker, upcomingExDate) {
    try {
      console.log(`[DividendService] Getting historical dividend analysis for ${ticker} (upcoming: ${upcomingExDate})`);
      
      // Find the most recent past dividend for this ticker (before the upcoming one)
      const response = await this.makeRequest('/v3/reference/dividends', {
        ticker: ticker,
        'ex_dividend_date.lt': upcomingExDate,  // Before the upcoming dividend
        order: 'desc',  // Most recent first
        sort: 'ex_dividend_date',
        limit: 1
      });
      
      if (!response.results || response.results.length === 0) {
        console.log(`[DividendService] No historical dividend found for ${ticker}`);
        return {
          hasHistoricalData: false,
          reason: 'No past dividend found'
        };
      }
      
      const lastDividend = response.results[0];
      console.log(`[DividendService] Found last dividend for ${ticker}: ${lastDividend.ex_dividend_date} (${lastDividend.cash_amount})`);
      
      // Get the 4 price points from the historical dividend
      const priceData = await this.getFourPricePoints(ticker, lastDividend.ex_dividend_date);
      
      if (!priceData.hasAllData) {
        console.log(`[DividendService] Incomplete historical price data for ${ticker}`);
        return {
          hasHistoricalData: false,
          reason: 'Incomplete historical price data',
          lastDividend: lastDividend,
          priceData: priceData
        };
      }
      
      // Calculate historical price movements
      const gapDown = ((priceData.exDayOpen - priceData.previousDayClose) / priceData.previousDayClose) * 100;
      const exDayPerformance = ((priceData.exDayClose - priceData.exDayOpen) / priceData.exDayOpen) * 100;
      const dividendYield = (lastDividend.cash_amount / priceData.previousDayClose) * 100;
      
      console.log(`[DividendService] ${ticker} historical analysis: Gap ${gapDown.toFixed(2)}%, Ex-day ${exDayPerformance.toFixed(2)}%`);
      
      return {
        hasHistoricalData: true,
        lastDividend: lastDividend,
        priceData: priceData,
        movements: {
          gapDown: gapDown,
          exDayPerformance: exDayPerformance,
          totalReturn: gapDown + exDayPerformance + dividendYield,
          dividendRecoveryRatio: Math.abs(gapDown) / dividendYield // How much of dividend was lost to gap
        },
        analysis: {
          isGoodDividendCapture: exDayPerformance > 0 && Math.abs(gapDown) < dividendYield,
          pattern: this.analyzeDividendPattern(gapDown, exDayPerformance, dividendYield)
        }
      };
      
    } catch (error) {
      console.error(`[DividendService] Failed to get historical analysis for ${ticker}:`, error);
      return {
        hasHistoricalData: false,
        reason: 'Error fetching data',
        error: error.message
      };
    }
  }

  // Analyze the dividend capture pattern
  analyzeDividendPattern(gapDown, exDayPerformance, dividendYield) {
    if (exDayPerformance > 1 && Math.abs(gapDown) < dividendYield) {
      return 'Excellent - Price recovered and dividend retained';
    } else if (exDayPerformance > 0 && Math.abs(gapDown) < dividendYield * 1.5) {
      return 'Good - Positive recovery, manageable gap';
    } else if (exDayPerformance > 0) {
      return 'Fair - Some recovery but large gap';
    } else if (Math.abs(gapDown) < dividendYield) {
      return 'Average - Small gap but no recovery';
    } else {
      return 'Poor - Large gap and no recovery';
    }
  }
  async getFourPricePoints(ticker, exDividendDate) {
    try {
      const exDate = new Date(exDividendDate);
      
      // Calculate previous TRADING day (day before ex-dividend, skipping weekends)
      const previousDay = new Date(exDate);
      previousDay.setDate(exDate.getDate() - 1);
      
      // ✅ CRITICAL: Skip weekends to get the actual PREVIOUS TRADING DAY
      while (previousDay.getDay() === 0 || previousDay.getDay() === 6) {
        previousDay.setDate(previousDay.getDate() - 1);
      }
      
      const previousDayStr = previousDay.toISOString().split('T')[0];
      const exDateStr = exDate.toISOString().split('T')[0];
      
      console.log(`[DividendService] Getting 4 price points for ${ticker}:`);
      console.log(`   Previous TRADING day: ${previousDayStr} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][previousDay.getDay()]})`);
      console.log(`   Ex-dividend day: ${exDateStr} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][exDate.getDay()]})`);
      
      // Fetch both days' data in parallel
      const [previousDayResponse, exDayResponse] = await Promise.all([
        this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${previousDayStr}/${previousDayStr}`),
        this.makeRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${exDateStr}/${exDateStr}`)
      ]);
      
      const result = {
        ticker,
        exDividendDate,
        previousTradingDay: previousDayStr,
        exDividendDay: exDateStr,
        
        // THE 4 PRICE POINTS:
        previousDayOpen: null,    // Point 1: Previous TRADING day opening
        previousDayClose: null,   // Point 2: Previous TRADING day closing  
        exDayOpen: null,          // Point 3: Ex-dividend day opening
        exDayClose: null,         // Point 4: Ex-dividend day closing
        
        hasAllData: false,
        dataQuality: 'incomplete'
      };
      
      // Extract previous day data
      if (previousDayResponse.results && previousDayResponse.results[0]) {
        const prevBar = previousDayResponse.results[0];
        result.previousDayOpen = parseFloat(prevBar.o.toFixed(4));
        result.previousDayClose = parseFloat(prevBar.c.toFixed(4));
        console.log(`[DividendService] ${ticker} Previous TRADING day (${previousDayStr}): Open ${result.previousDayOpen}, Close ${result.previousDayClose}`);
      } else {
        console.warn(`[DividendService] ${ticker}: No data for previous TRADING day ${previousDayStr}`);
      }
      
      // Extract ex-dividend day data
      if (exDayResponse.results && exDayResponse.results[0]) {
        const exBar = exDayResponse.results[0];
        result.exDayOpen = parseFloat(exBar.o.toFixed(4));
        result.exDayClose = parseFloat(exBar.c.toFixed(4));
        console.log(`[DividendService] ${ticker} Ex-dividend day (${exDateStr}): Open $${result.exDayOpen}, Close $${result.exDayClose}`);
      } else {
        console.warn(`[DividendService] ${ticker}: No data for ex-dividend day ${exDateStr}`);
      }
      
      // Determine data quality
      const hasAllFourPoints = !!(
        result.previousDayOpen && 
        result.previousDayClose && 
        result.exDayOpen && 
        result.exDayClose
      );
      
      result.hasAllData = hasAllFourPoints;
      result.dataQuality = hasAllFourPoints ? 'complete' : 
                          (result.previousDayOpen || result.exDayOpen) ? 'partial' : 'none';
      
      console.log(`[DividendService] ${ticker} Data quality: ${result.dataQuality} (${hasAllFourPoints ? '4/4' : 'partial'} price points)`);
      
      return result;
      
    } catch (error) {
      console.error(`[DividendService] Failed to get price points for ${ticker}:`, error);
      return {
        ticker,
        exDividendDate,
        previousDayOpen: null,
        previousDayClose: null, 
        exDayOpen: null,
        exDayClose: null,
        hasAllData: false,
        dataQuality: 'error',
        error: error.message
      };
    }
  }

  // Get current prices using snapshot endpoint (minimal version)
  async getCurrentPrices(tickers) {
    const priceMap = new Map();
    
    try {
      console.log(`[DividendService] Getting current prices for ${tickers.length} tickers`);
      
      // Split into chunks to avoid API limits
      const chunks = [];
      for (let i = 0; i < tickers.length; i += 100) {
        chunks.push(tickers.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const response = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
          tickers: chunk.join(',')
        });
        
        if (response.tickers) {
          response.tickers.forEach(ticker => {
            const price = ticker.lastTrade && ticker.lastTrade.p ? ticker.lastTrade.p : 
                         ticker.day && ticker.day.c ? ticker.day.c : null;
            if (price) {
              priceMap.set(ticker.ticker, price);
            }
          });
        }
      }
      
      console.log(`[DividendService] Got prices for ${priceMap.size} tickers`);
      return priceMap;
      
    } catch (error) {
      console.error('[DividendService] Failed to get current prices:', error);
      return priceMap;
    }
  }

  // Filter for US stocks only
  isUSStock(ticker) {
    if (!ticker) return false;
    
    const upperTicker = ticker.toUpperCase();
    
    // Skip foreign stocks
    if (upperTicker.includes('.')) return false;
    if (upperTicker.endsWith('F')) return false;
    if (upperTicker.endsWith('Y')) return false;
    if (upperTicker.endsWith('UF')) return false;
    if (upperTicker.endsWith('TF')) return false;
    if (upperTicker.endsWith('AY')) return false;
    if (upperTicker.endsWith('LY')) return false;
    
    // Skip OTC
    if (upperTicker.includes('OTC') || upperTicker.includes('PK')) return false;
    
    // Skip long tickers
    if (ticker.length > 5) return false;
    
    // Skip tickers with numbers
    if (/\d/.test(ticker)) return false;
    
    // Only allow standard US stock patterns
    if (!/^[A-Z]{1,5}$/.test(upperTicker)) return false;
    
    return true;
  }

  // Calculate buy by and sell after dates (using TRADING days)
  calculateTradingDates(exDividendDate, recordDate) {
    const exDate = new Date(exDividendDate);
    
    // Buy by date: last TRADING day before ex-dividend
    const buyByDate = new Date(exDate);
    buyByDate.setDate(exDate.getDate() - 1);
    
    // ✅ CRITICAL: Skip weekends to get actual TRADING day
    while (buyByDate.getDay() === 0 || buyByDate.getDay() === 6) {
      buyByDate.setDate(buyByDate.getDate() - 1);
    }
    
    // Sell after date: ex-dividend date or record date
    const sellAfterDate = new Date(recordDate || exDividendDate);
    
    return {
      buyByDate: buyByDate.toISOString().split('T')[0],
      sellAfterDate: sellAfterDate.toISOString().split('T')[0]
    };
  }
}

export const dividendService = new DividendService();