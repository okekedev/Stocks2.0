// src/hooks/useCryptoData.js
import { useState, useEffect, useCallback } from "react";
import CoinMarketCapService from "../services/CoinMarketCapService";

export const useCryptoData = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedCryptos, setSelectedCryptos] = useState([
    "BTC",
    "ETH",
    "XRP",
    "ADA",
    "SOL",
    "DOT",
    "MATIC",
    "AVAX",
    "LINK",
    "UNI",
  ]);
  const [priceFilter, setPriceFilter] = useState({ min: 0, max: 100000 });
  const [sortConfig, setSortConfig] = useState({
    key: "marketCap",
    direction: "desc",
  });

  /**
   * Fetch cryptocurrency data from CoinMarketCap
   */
  const fetchCryptoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get comprehensive crypto data
      const data = await CoinMarketCapService.getComprehensiveCryptoData(
        selectedCryptos
      );

      // Apply price filter
      const filteredData = data.filter(
        (crypto) =>
          crypto.price >= priceFilter.min && crypto.price <= priceFilter.max
      );

      // Sort data
      const sortedData = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key] || 0;
        const bValue = b[sortConfig.key] || 0;

        if (sortConfig.direction === "asc") {
          return aValue - bValue;
        }
        return bValue - aValue;
      });

      setCryptoData(sortedData);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err.message || "Failed to fetch cryptocurrency data");
    } finally {
      setLoading(false);
    }
  }, [selectedCryptos, priceFilter, sortConfig]);

  /**
   * Fetch cryptocurrency news
   */
  const fetchCryptoNews = useCallback(async () => {
    try {
      const news = await CoinMarketCapService.getCryptoNews({ limit: 50 });
      setNewsData(news);
    } catch (err) {
      console.error("Error fetching crypto news:", err);
      // Don't set error for news failure, just log it
    }
  }, []);

  /**
   * Get OHLCV data for a specific cryptocurrency
   */
  const getOHLCVData = useCallback(async (symbol, timeStart, timeEnd) => {
    try {
      const ohlcvData = await CoinMarketCapService.getOHLCVData(
        symbol,
        timeStart,
        timeEnd
      );
      return ohlcvData;
    } catch (err) {
      console.error(`Error fetching OHLCV data for ${symbol}:`, err);
      throw err;
    }
  }, []);

  /**
   * Get detailed information for a specific cryptocurrency
   */
  const getCryptoDetails = useCallback(async (symbol) => {
    try {
      const [quotes, metadata, fcas] = await Promise.all([
        CoinMarketCapService.getLatestQuotes([symbol]),
        CoinMarketCapService.getCryptoMetadata([symbol]),
        CoinMarketCapService.getFCASRatings([symbol]).catch(() => ({})),
      ]);

      return {
        ...quotes[symbol],
        ...metadata[symbol],
        fcas: fcas[symbol] || null,
      };
    } catch (err) {
      console.error(`Error fetching details for ${symbol}:`, err);
      throw err;
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchCryptoData(), fetchCryptoNews()]);
  }, [fetchCryptoData, fetchCryptoNews]);

  /**
   * Add cryptocurrency to watchlist
   */
  const addCryptoToWatchlist = useCallback(
    (symbol) => {
      if (!selectedCryptos.includes(symbol)) {
        setSelectedCryptos((prev) => [...prev, symbol]);
      }
    },
    [selectedCryptos]
  );

  /**
   * Remove cryptocurrency from watchlist
   */
  const removeCryptoFromWatchlist = useCallback((symbol) => {
    setSelectedCryptos((prev) => prev.filter((s) => s !== symbol));
  }, []);

  /**
   * Update price filter
   */
  const updatePriceFilter = useCallback((min, max) => {
    setPriceFilter({ min, max });
  }, []);

  /**
   * Update sort configuration
   */
  const updateSortConfig = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  /**
   * Get market statistics
   */
  const getMarketStats = useCallback(() => {
    if (!cryptoData.length) return null;

    const totalMarketCap = cryptoData.reduce(
      (sum, crypto) => sum + (crypto.marketCap || 0),
      0
    );
    const totalVolume24h = cryptoData.reduce(
      (sum, crypto) => sum + (crypto.volume24h || 0),
      0
    );
    const gainers = cryptoData.filter(
      (crypto) => (crypto.change24h || 0) > 0
    ).length;
    const losers = cryptoData.filter(
      (crypto) => (crypto.change24h || 0) < 0
    ).length;
    const avgChange24h =
      cryptoData.reduce((sum, crypto) => sum + (crypto.change24h || 0), 0) /
      cryptoData.length;

    return {
      totalMarketCap,
      totalVolume24h,
      gainers,
      losers,
      avgChange24h,
      totalCryptos: cryptoData.length,
    };
  }, [cryptoData]);

  /**
   * Get top performers
   */
  const getTopPerformers = useCallback(
    (timeframe = "24h", limit = 5) => {
      const changeField = timeframe === "24h" ? "change24h" : "change7d";

      return [...cryptoData]
        .sort((a, b) => (b[changeField] || 0) - (a[changeField] || 0))
        .slice(0, limit);
    },
    [cryptoData]
  );

  /**
   * Get worst performers
   */
  const getWorstPerformers = useCallback(
    (timeframe = "24h", limit = 5) => {
      const changeField = timeframe === "24h" ? "change24h" : "change7d";

      return [...cryptoData]
        .sort((a, b) => (a[changeField] || 0) - (b[changeField] || 0))
        .slice(0, limit);
    },
    [cryptoData]
  );

  /**
   * Search cryptocurrencies
   */
  const searchCryptos = useCallback(
    (query) => {
      if (!query) return cryptoData;

      const lowercaseQuery = query.toLowerCase();
      return cryptoData.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(lowercaseQuery) ||
          crypto.symbol.toLowerCase().includes(lowercaseQuery)
      );
    },
    [cryptoData]
  );

  // Initial data fetch
  useEffect(() => {
    refresh();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCryptoData();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchCryptoData]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchCryptoData();
  }, [selectedCryptos, priceFilter, sortConfig]);

  return {
    // Data
    cryptoData,
    newsData,
    selectedCryptos,

    // State
    loading,
    error,
    lastUpdate,
    priceFilter,
    sortConfig,

    // Actions
    refresh,
    addCryptoToWatchlist,
    removeCryptoFromWatchlist,
    updatePriceFilter,
    updateSortConfig,

    // API methods
    getOHLCVData,
    getCryptoDetails,

    // Computed data
    getMarketStats,
    getTopPerformers,
    getWorstPerformers,
    searchCryptos,

    // Setters for external control
    setSelectedCryptos,
    setError,
    setLoading,
  };
};
