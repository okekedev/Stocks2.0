// src/services/PolygonService.js - UTC-Based with Proper After-Hours Support (Clean version)
class PolygonService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.baseUrl = "https://api.polygon.io";
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache

    if (!this.apiKey) {
      throw new Error("VITE_POLYGON_API_KEY environment variable is required");
    }

    // ✅ UTC-based market hours (EST/EDT auto-detection)
    this.isDST = this.isDaylightSavingTime();
    this.utcOffset = this.isDST ? 4 : 5; // Hours to add to ET to get UTC

    this.marketHours = {
      premarket: { start: 4 + this.utcOffset, end: 9.5 + this.utcOffset }, // 4:00-9:30 AM ET
      regular: { start: 9.5 + this.utcOffset, end: 16 + this.utcOffset }, // 9:30 AM-4:00 PM ET
      afterhours: { start: 16 + this.utcOffset, end: 20 + this.utcOffset }, // 4:00-8:00 PM ET
    };

    console.log(
      `[PolygonService] Market hours (UTC): Regular ${this.marketHours.regular.start}-${this.marketHours.regular.end}, After-hours ${this.marketHours.afterhours.start}-${this.marketHours.afterhours.end}, DST: ${this.isDST}`
    );
  }

  // ✅ Detect if currently in Daylight Saving Time
  isDaylightSavingTime() {
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    return (
      now.getTimezoneOffset() <
      Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
    );
  }

  // ✅ Get current market session based on UTC time
  getCurrentMarketSession() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const dayOfWeek = now.getUTCDay();

    // Handle weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        session: "weekend",
        isActive: false,
        hasExtendedHours: false,
        utcTime: now.toISOString(),
        description: "Market closed - Weekend",
      };
    }

    // Handle cross-midnight after-hours (8 PM ET onwards becomes next day UTC)
    let session = "closed";
    let isActive = false;
    let hasExtendedHours = false;

    if (this.isTimeInRange(utcHours, this.marketHours.premarket)) {
      session = "premarket";
      isActive = true;
      hasExtendedHours = true;
    } else if (this.isTimeInRange(utcHours, this.marketHours.regular)) {
      session = "regular";
      isActive = true;
      hasExtendedHours = false;
    } else if (this.isTimeInRange(utcHours, this.marketHours.afterhours)) {
      session = "afterhours";
      isActive = true;
      hasExtendedHours = true;
    }

    return {
      session,
      isActive,
      hasExtendedHours,
      utcTime: now.toISOString(),
      utcHours: utcHours.toFixed(1),
      description: `Market ${session} (UTC ${utcHours.toFixed(1)}h)`,
    };
  }

  // ✅ Helper to check if time is in range (handles cross-midnight)
  isTimeInRange(utcHours, range) {
    if (range.start <= range.end) {
      // Normal range (doesn't cross midnight)
      return utcHours >= range.start && utcHours < range.end;
    } else {
      // Cross-midnight range (e.g., 20:00 to 4:00 next day)
      return utcHours >= range.start || utcHours < range.end;
    }
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = new URL(endpoint, this.baseUrl);
      url.searchParams.set("apikey", this.apiKey);

      Object.keys(params).forEach((key) => {
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
      console.error(`[PolygonService] API request failed:`, error);
      throw error;
    }
  }

  // Get positive sentiment news only
  // Get ALL news without sentiment filtering
  async getAllMarketNews(hours = 4) {
    const fromDate = new Date(
      Date.now() - hours * 60 * 60 * 1000
    ).toISOString();

    console.log(
      `[PolygonService] Fetching ALL news from last ${hours} hours (no sentiment filter)`
    );

    const response = await this.makeRequest("/v2/reference/news", {
      limit: 1000,
      order: "desc",
      sort: "published_utc",
      "published_utc.gte": fromDate,
    });

    // DO NOT FILTER BY SENTIMENT - return all articles
    console.log(
      `[PolygonService] Received ${
        response.results?.length || 0
      } total articles`
    );

    return response;
  }

  // ✅ ENHANCED: Get market data with proper extended hours support
  async getMarketData(tickers) {
    try {
      const now = Date.now();
      const marketSession = this.getCurrentMarketSession();
      const uncachedTickers = [];
      const result = [];

      // Check cache first
      tickers.forEach((ticker) => {
        const cached = this.cache.get(ticker);
        if (cached && now - cached.timestamp < this.cacheExpiry) {
          result.push({
            ...cached.data,
            marketSession: marketSession.session,
            hasExtendedHours: marketSession.hasExtendedHours,
          });
        } else {
          uncachedTickers.push(ticker);
        }
      });

      // Fetch uncached tickers
      if (uncachedTickers.length > 0) {
        console.log(
          `[PolygonService] Fetching data for ${uncachedTickers.length} tickers (${marketSession.session} session)`
        );

        // Split large requests to avoid API limits
        const chunks = [];
        for (let i = 0; i < uncachedTickers.length; i += 100) {
          chunks.push(uncachedTickers.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const response = await this.makeRequest(
            "/v2/snapshot/locale/us/markets/stocks/tickers",
            {
              tickers: chunk.join(","),
            }
          );

          if (response.tickers) {
            response.tickers.forEach((ticker) => {
              // ✅ Enhanced ticker data with session info
              const enhancedTicker = {
                ...ticker,
                marketSession: marketSession.session,
                hasExtendedHours: marketSession.hasExtendedHours,
                isActive: marketSession.isActive,
                dataTimestamp: now,
                // ✅ Determine if we have extended hours price data
                hasExtendedHoursPrice: this.hasExtendedHoursData(
                  ticker,
                  marketSession
                ),
              };

              // Cache the result
              this.cache.set(ticker.ticker, {
                data: enhancedTicker,
                timestamp: now,
              });
              result.push(enhancedTicker);
            });
          }
        }
      } else {
        console.log(
          `[PolygonService] Using cached data for all ${tickers.length} tickers`
        );
      }

      console.log(
        `[PolygonService] Retrieved ${result.length} snapshots during ${marketSession.session} session`
      );
      return result;
    } catch (error) {
      console.error("[PolygonService] Failed to get market data:", error);
      return [];
    }
  }

  // ✅ NEW: Check if ticker has extended hours data
  hasExtendedHoursData(ticker, marketSession) {
    if (!marketSession.hasExtendedHours) return false;

    // Check if we have recent trade data during extended hours
    if (ticker.lastTrade?.t) {
      const tradeTime = new Date(ticker.lastTrade.t);
      const timeDiff = Math.abs(Date.now() - tradeTime.getTime());

      // If trade is within last 30 minutes during extended hours
      return timeDiff < 30 * 60 * 1000;
    }

    // Fallback to day data if available
    return !!ticker.day?.c;
  }

  // ✅ NEW: Get aggregates with proper extended hours filtering
  async getAggregatesWithExtendedHours(
    ticker,
    from,
    to,
    multiplier = 1,
    timespan = "minute"
  ) {
    try {
      const response = await this.makeRequest(
        `/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`,
        {
          adjusted: true,
          sort: "asc",
          limit: 50000,
        }
      );

      if (!response.results || response.results.length === 0) {
        return [];
      }

      return response.results.map((bar) => {
        const timestamp = bar.t;
        const utcDate = new Date(timestamp);
        const utcHours = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60;

        // ✅ Determine session based on UTC time
        let sessionType = "closed";
        if (this.isTimeInRange(utcHours, this.marketHours.premarket)) {
          sessionType = "premarket";
        } else if (this.isTimeInRange(utcHours, this.marketHours.regular)) {
          sessionType = "regular";
        } else if (this.isTimeInRange(utcHours, this.marketHours.afterhours)) {
          sessionType = "afterhours";
        }

        return {
          timestamp,
          datetime: utcDate.toISOString(),
          utcHours: utcHours.toFixed(1),
          sessionType,
          isExtendedHours: sessionType !== "regular",
          open: parseFloat(bar.o.toFixed(4)),
          high: parseFloat(bar.h.toFixed(4)),
          low: parseFloat(bar.l.toFixed(4)),
          close: parseFloat(bar.c.toFixed(4)),
          volume: bar.v,
          vwap: parseFloat(bar.vw?.toFixed(4) || 0),
          trades: bar.n || 0,
        };
      });
    } catch (error) {
      console.error(
        `[PolygonService] Failed to get ${multiplier}${timespan} aggregates:`,
        error
      );
      return [];
    }
  }

  // ✅ Get previous day close with UTC handling
  async getPreviousDayClose(ticker, daysBack = 1) {
    try {
      const targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - daysBack);

      // Skip weekends
      while (targetDate.getUTCDay() === 0 || targetDate.getUTCDay() === 6) {
        targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      }

      const dateStr = targetDate.toISOString().split("T")[0];

      const response = await this.makeRequest(
        `/v2/aggs/ticker/${ticker}/range/1/day/${dateStr}/${dateStr}`
      );

      if (response.results?.[0]) {
        const bar = response.results[0];
        return {
          ticker,
          previousClose: bar.c,
          previousOpen: bar.o,
          previousHigh: bar.h,
          previousLow: bar.l,
          previousVolume: bar.v,
          date: dateStr,
          found: true,
        };
      }

      return { ticker, found: false };
    } catch (error) {
      console.warn(
        `[PolygonService] Could not get previous close for ${ticker}:`,
        error.message
      );
      return { ticker, found: false, error: error.message };
    }
  }

  // Get single ticker snapshot
  async getSingleTickerSnapshot(ticker) {
    try {
      const response = await this.makeRequest(
        `/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`
      );
      const marketSession = this.getCurrentMarketSession();

      if (response.ticker) {
        return {
          ...response.ticker,
          marketSession: marketSession.session,
          hasExtendedHours: marketSession.hasExtendedHours,
          isActive: marketSession.isActive,
        };
      }

      return null;
    } catch (error) {
      console.error(
        `[PolygonService] Failed to get snapshot for ${ticker}:`,
        error
      );
      return null;
    }
  }

  // Get company names for tickers
  async getCompanyNames(tickers) {
    const companyNames = new Map();

    try {
      const chunks = [];
      for (let i = 0; i < tickers.length; i += 100) {
        chunks.push(tickers.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const response = await this.makeRequest("/v3/reference/tickers", {
          ticker: chunk.join(","),
          market: "stocks",
          active: true,
          limit: 1000,
        });

        if (response.results) {
          response.results.forEach((result) => {
            if (result.ticker && result.name) {
              companyNames.set(result.ticker, result.name);
            }
          });
        }
      }
    } catch (error) {
      console.error("[PolygonService] Failed to fetch company names:", error);
    }

    return companyNames;
  }

  // ✅ Clear cache manually if needed
  clearCache() {
    this.cache.clear();
    console.log("[PolygonService] Price cache cleared");
  }

  // ✅ Get cache stats
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp < this.cacheExpiry) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheExpiryMs: this.cacheExpiry,
      currentSession: this.getCurrentMarketSession().session,
    };
  }
}

export const polygonService = new PolygonService();
