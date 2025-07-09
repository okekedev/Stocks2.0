// src/services/DividendService.js - Clean dividend data service
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

  // Get dividends for next week with enhanced filtering
  async getNextWeekDividends() {
    try {
      // Get date range for next week
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const endOfNextWeek = new Date(nextWeek);
      endOfNextWeek.setDate(nextWeek.getDate() + 6);
      
      const start = nextWeek.toISOString().split('T')[0];
      const end = endOfNextWeek.toISOString().split('T')[0];
      
      console.log(`[DividendService] Fetching dividends from ${start} to ${end}`);
      
      // Get dividends in date range
      const response = await this.makeRequest('/v3/reference/dividends', {
        'ex_dividend_date.gte': start,
        'ex_dividend_date.lte': end,
        order: 'asc',
        sort: 'ex_dividend_date',
        limit: 1000
      });
      
      if (!response.results || response.results.length === 0) {
        console.log('[DividendService] No dividends found for next week');
        return [];
      }
      
      console.log(`[DividendService] Found ${response.results.length} raw dividends`);
      
      // Filter for US stocks only
      const usStocks = response.results.filter(div => this.isUSStock(div.ticker));
      console.log(`[DividendService] Filtered to ${usStocks.length} US stocks`);
      
      // Get current prices using snapshot endpoint (same as stock table)
      const tickers = [...new Set(usStocks.map(div => div.ticker))];
      const priceData = await this.getCurrentPrices(tickers);
      
      // Process dividends with current prices
      const processedDividends = usStocks.map(div => {
        const currentPrice = priceData.get(div.ticker);
        const frequency = div.frequency || 4;
        const annualizedAmount = frequency > 0 ? div.cash_amount * frequency : div.cash_amount;
        
        // Calculate yields
        const dividendYield = currentPrice ? (div.cash_amount / currentPrice) * 100 : 0;
        const annualizedYield = currentPrice ? (annualizedAmount / currentPrice) * 100 : 0;
        
        // Calculate trading dates
        const { buyByDate, sellAfterDate } = this.calculateTradingDates(div.ex_dividend_date, div.record_date);
        
        return {
          ...div,
          currentPrice,
          dividendYield,
          annualizedYield,
          annualizedAmount,
          buyByDate,
          sellAfterDate,
          daysUntilEx: Math.ceil((new Date(div.ex_dividend_date) - new Date()) / (1000 * 60 * 60 * 24)),
          daysUntilPay: div.pay_date ? Math.ceil((new Date(div.pay_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          hasPrice: !!currentPrice,
          lastDividend: {
            amount: div.cash_amount,
            exDate: div.ex_dividend_date,
            frequency: div.frequency || 4
          }
        };
      });
      
      // Filter for high yield (2%+) and stocks with prices
      const highYieldDividends = processedDividends.filter(div => 
        div.hasPrice && div.dividendYield >= 2.0
      );
      
      console.log(`[DividendService] Final result: ${highYieldDividends.length} high-yield US dividends`);
      return highYieldDividends;
      
    } catch (error) {
      console.error('[DividendService] Failed to get next week dividends:', error);
      throw error;
    }
  }

  // Get current prices using snapshot endpoint (same as stock table)
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
            const price = ticker.lastTrade?.p || ticker.day?.c;
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

  // Calculate buy by and sell after dates
  calculateTradingDates(exDividendDate, recordDate) {
    const exDate = new Date(exDividendDate);
    
    // Buy by date: last trading day before ex-dividend
    const buyByDate = new Date(exDate);
    buyByDate.setDate(exDate.getDate() - 1);
    
    // Skip weekends
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