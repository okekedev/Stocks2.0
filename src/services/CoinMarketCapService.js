// src/services/CoinMarketCapService.js
class CoinMarketCapService {
  constructor() {
    this.baseURL = "https://pro-api.coinmarketcap.com/v1";
    this.apiKey = process.env.REACT_APP_COINMARKETCAP_API_KEY;
    this.headers = {
      "X-CMC_PRO_API_KEY": this.apiKey,
      Accept: "application/json",
    };
  }

  /**
   * Get latest cryptocurrency listings with market data
   * @param {Object} options - Query parameters
   * @returns {Promise} API response
   */
  async getLatestListings(options = {}) {
    const params = new URLSearchParams({
      start: options.start || 1,
      limit: options.limit || 100,
      convert: options.convert || "USD",
      sort: options.sort || "market_cap",
      sort_dir: options.sort_dir || "desc",
      cryptocurrency_type: options.cryptocurrency_type || "all",
      tag: options.tag || "all",
    });

    try {
      const response = await fetch(
        `${this.baseURL}/cryptocurrency/listings/latest?${params}`,
        {
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatListingsData(data);
    } catch (error) {
      console.error("Error fetching latest listings:", error);
      throw error;
    }
  }

  /**
   * Get OHLCV data for cryptocurrencies
   * @param {String} symbol - Cryptocurrency symbol (e.g., 'BTC')
   * @param {String} timeStart - Start time (ISO format)
   * @param {String} timeEnd - End time (ISO format)
   * @returns {Promise} OHLCV data
   */
  async getOHLCVData(symbol, timeStart, timeEnd) {
    const params = new URLSearchParams({
      symbol: symbol,
      time_start: timeStart,
      time_end: timeEnd,
      interval: "1h", // Can be: 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 2d, 3d, 7d, 14d, 15d, 30d, 60d, 90d, 365d
    });

    try {
      const response = await fetch(
        `${this.baseURL}/cryptocurrency/ohlcv/historical?${params}`,
        {
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatOHLCVData(data);
    } catch (error) {
      console.error("Error fetching OHLCV data:", error);
      throw error;
    }
  }

  /**
   * Get latest quotes for specific cryptocurrencies
   * @param {Array|String} symbols - Array of symbols or comma-separated string
   * @returns {Promise} Quote data
   */
  async getLatestQuotes(symbols) {
    const symbolParam = Array.isArray(symbols) ? symbols.join(",") : symbols;
    const params = new URLSearchParams({
      symbol: symbolParam,
      convert: "USD",
    });

    try {
      const response = await fetch(
        `${this.baseURL}/cryptocurrency/quotes/latest?${params}`,
        {
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatQuoteData(data);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      throw error;
    }
  }

  /**
   * Get FCAS ratings for cryptocurrencies
   * @param {Array|String} symbols - Array of symbols or comma-separated string
   * @returns {Promise} FCAS data
   */
  async getFCASRatings(symbols) {
    const symbolParam = Array.isArray(symbols) ? symbols.join(",") : symbols;
    const params = new URLSearchParams({
      symbol: symbolParam,
    });

    try {
      const response = await fetch(
        `${this.baseURL}/partners/flipside-crypto/fcas/quotes/latest?${params}`,
        {
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatFCASData(data);
    } catch (error) {
      console.error("Error fetching FCAS ratings:", error);
      throw error;
    }
  }

  /**
   * Get cryptocurrency news from CoinMarketCap
   * @param {Object} options - Query parameters
   * @returns {Promise} News data
   */
  async getCryptoNews(options = {}) {
    const params = new URLSearchParams({
      start: options.start || 1,
      limit: options.limit || 20,
      category: options.category || "",
      sort: options.sort || "published_on",
      sort_dir: options.sort_dir || "desc",
    });

    try {
      const response = await fetch(`${this.baseURL}/content/latest?${params}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatNewsData(data);
    } catch (error) {
      console.error("Error fetching crypto news:", error);
      throw error;
    }
  }

  /**
   * Get cryptocurrency metadata
   * @param {Array|String} symbols - Array of symbols or comma-separated string
   * @returns {Promise} Metadata
   */
  async getCryptoMetadata(symbols) {
    const symbolParam = Array.isArray(symbols) ? symbols.join(",") : symbols;
    const params = new URLSearchParams({
      symbol: symbolParam,
    });

    try {
      const response = await fetch(
        `${this.baseURL}/cryptocurrency/info?${params}`,
        {
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.formatMetadata(data);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      throw error;
    }
  }

  /**
   * Format listings data for UI consumption
   */
  formatListingsData(rawData) {
    if (!rawData.data) return [];

    return rawData.data.map((crypto) => ({
      id: crypto.id,
      name: crypto.name,
      symbol: crypto.symbol,
      slug: crypto.slug,
      price: crypto.quote.USD.price,
      change24h: crypto.quote.USD.percent_change_24h,
      change7d: crypto.quote.USD.percent_change_7d,
      volume24h: crypto.quote.USD.volume_24h,
      marketCap: crypto.quote.USD.market_cap,
      circulatingSupply: crypto.circulating_supply,
      totalSupply: crypto.total_supply,
      maxSupply: crypto.max_supply,
      rank: crypto.cmc_rank,
      lastUpdated: crypto.quote.USD.last_updated,
    }));
  }

  /**
   * Format OHLCV data for charting
   */
  formatOHLCVData(rawData) {
    if (!rawData.data || !rawData.data.quotes) return [];

    return rawData.data.quotes.map((quote) => ({
      timestamp: quote.timestamp,
      open: quote.quote.USD.open,
      high: quote.quote.USD.high,
      low: quote.quote.USD.low,
      close: quote.quote.USD.close,
      volume: quote.quote.USD.volume,
      marketCap: quote.quote.USD.market_cap,
    }));
  }

  /**
   * Format quote data
   */
  formatQuoteData(rawData) {
    if (!rawData.data) return {};

    const formatted = {};
    Object.keys(rawData.data).forEach((symbol) => {
      const crypto = rawData.data[symbol];
      formatted[symbol] = {
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        price: crypto.quote.USD.price,
        change1h: crypto.quote.USD.percent_change_1h,
        change24h: crypto.quote.USD.percent_change_24h,
        change7d: crypto.quote.USD.percent_change_7d,
        volume24h: crypto.quote.USD.volume_24h,
        marketCap: crypto.quote.USD.market_cap,
        lastUpdated: crypto.quote.USD.last_updated,
      };
    });

    return formatted;
  }

  /**
   * Format FCAS data
   */
  formatFCASData(rawData) {
    if (!rawData.data) return {};

    const formatted = {};
    Object.keys(rawData.data).forEach((key) => {
      const fcas = rawData.data[key];
      formatted[fcas.symbol] = {
        id: fcas.id,
        name: fcas.name,
        symbol: fcas.symbol,
        score: fcas.score,
        grade: fcas.grade,
        percentChange24h: fcas.percent_change_24h,
        pointChange24h: fcas.point_change_24h,
        lastUpdated: fcas.last_updated,
      };
    });

    return formatted;
  }

  /**
   * Format news data
   */
  formatNewsData(rawData) {
    if (!rawData.data) return [];

    return rawData.data.map((article) => ({
      id: article.id,
      title: article.title,
      subtitle: article.subtitle,
      content: article.content,
      publishedOn: article.published_on,
      cover: article.cover,
      tags: article.tags || [],
      type: article.type,
      assets: article.assets || [],
    }));
  }

  /**
   * Format metadata
   */
  formatMetadata(rawData) {
    if (!rawData.data) return {};

    const formatted = {};
    Object.keys(rawData.data).forEach((key) => {
      const crypto = rawData.data[key];
      formatted[crypto.symbol] = {
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        description: crypto.description,
        logo: crypto.logo,
        website: crypto.urls.website,
        explorer: crypto.urls.explorer,
        sourceCode: crypto.urls.source_code,
        tags: crypto.tags,
        category: crypto.category,
        dateAdded: crypto.date_added,
        platform: crypto.platform,
      };
    });

    return formatted;
  }

  /**
   * Get comprehensive crypto data combining multiple endpoints
   * @param {Array} symbols - Array of cryptocurrency symbols
   * @returns {Promise} Combined data
   */
  async getComprehensiveCryptoData(
    symbols = ["BTC", "ETH", "XRP", "ADA", "SOL"]
  ) {
    try {
      const [quotes, fcas, metadata] = await Promise.all([
        this.getLatestQuotes(symbols),
        this.getFCASRatings(symbols).catch(() => ({})), // FCAS might not be available for all
        this.getCryptoMetadata(symbols),
      ]);

      // Combine all data
      const combinedData = symbols
        .map((symbol) => {
          const quote = quotes[symbol] || {};
          const fcasData = fcas[symbol] || {};
          const meta = metadata[symbol] || {};

          return {
            ...quote,
            fcasScore: fcasData.score,
            fcasGrade: fcasData.grade,
            description: meta.description,
            logo: meta.logo,
            website: meta.website,
            tags: meta.tags || [],
            category: meta.category,
            // Add mock news count for now
            newsCount: Math.floor(Math.random() * 20) + 1,
          };
        })
        .filter((crypto) => crypto.symbol); // Filter out any empty results

      return combinedData;
    } catch (error) {
      console.error("Error getting comprehensive crypto data:", error);
      throw error;
    }
  }
}

export default new CoinMarketCapService();
