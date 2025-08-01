// src/hooks/useCryptoMarketData.js
import { useState, useEffect, useCallback } from "react";

// CoinMarketCap API configuration
const CMC_API_KEY = import.meta.env.VITE_CMC_API_KEY;
const CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1";

// Fallback to demo API if no key provided
const DEMO_API_URL = "https://api.coinpaprika.com/v1";

export const useCryptoMarketData = (symbols = ["BTC", "ETH", "SOL"]) => {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch data from CoinMarketCap
  const fetchFromCMC = async () => {
    try {
      const response = await fetch(
        `${CMC_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbols.join(
          ","
        )}`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": CMC_API_KEY,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API Error: ${response.status}`);
      }

      const data = await response.json();

      // Transform CMC data to our format
      const transformedData = Object.values(data.data).map((crypto) => ({
        id: crypto.id,
        symbol: crypto.symbol,
        name: crypto.name,
        rank: crypto.cmc_rank,
        price: crypto.quote.USD.price,
        marketCap: crypto.quote.USD.market_cap,
        volume24h: crypto.quote.USD.volume_24h,
        change24h: crypto.quote.USD.percent_change_24h,
        change7d: crypto.quote.USD.percent_change_7d,
        circulatingSupply: crypto.circulating_supply,
        totalSupply: crypto.total_supply,
        maxSupply: crypto.max_supply,
        lastUpdated: crypto.quote.USD.last_updated,
      }));

      return transformedData;
    } catch (err) {
      console.error("CoinMarketCap API error:", err);
      throw err;
    }
  };

  // Fetch data from demo API (CoinPaprika) as fallback
  const fetchFromDemo = async () => {
    try {
      // First get the ticker data
      const tickerResponse = await fetch(`${DEMO_API_URL}/tickers`);
      if (!tickerResponse.ok) {
        throw new Error(`Demo API Error: ${tickerResponse.status}`);
      }

      const tickers = await tickerResponse.json();

      // Filter and transform data for requested symbols
      const transformedData = symbols
        .map((symbol) => {
          const ticker = tickers.find((t) => t.symbol === symbol);
          if (!ticker) return null;

          return {
            id: ticker.id,
            symbol: ticker.symbol,
            name: ticker.name,
            rank: ticker.rank,
            price: ticker.quotes.USD.price,
            marketCap: ticker.quotes.USD.market_cap,
            volume24h: ticker.quotes.USD.volume_24h,
            change24h: ticker.quotes.USD.percent_change_24h,
            change7d: ticker.quotes.USD.percent_change_7d,
            circulatingSupply: ticker.circulating_supply,
            totalSupply: ticker.total_supply,
            maxSupply: ticker.max_supply,
            lastUpdated: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      return transformedData;
    } catch (err) {
      console.error("Demo API error:", err);
      throw err;
    }
  };

  // Mock data generator for development
  const generateMockData = () => {
    const mockPrices = {
      BTC: 65000 + Math.random() * 5000,
      ETH: 3500 + Math.random() * 500,
      SOL: 150 + Math.random() * 20,
      DOGE: 0.15 + Math.random() * 0.05,
      XRP: 0.6 + Math.random() * 0.1,
      ADA: 0.5 + Math.random() * 0.1,
      AVAX: 35 + Math.random() * 5,
      LINK: 15 + Math.random() * 3,
    };

    const mockNames = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      SOL: "Solana",
      DOGE: "Dogecoin",
      XRP: "XRP",
      ADA: "Cardano",
      AVAX: "Avalanche",
      LINK: "Chainlink",
    };

    return symbols.map((symbol, index) => ({
      id: symbol.toLowerCase(),
      symbol: symbol,
      name: mockNames[symbol] || symbol,
      rank: index + 1,
      price: mockPrices[symbol] || Math.random() * 100,
      marketCap:
        (mockPrices[symbol] || 100) * (1000000000 + Math.random() * 500000000),
      volume24h:
        (mockPrices[symbol] || 100) * (10000000 + Math.random() * 5000000),
      change24h: -5 + Math.random() * 10,
      change7d: -10 + Math.random() * 20,
      circulatingSupply: 1000000000 + Math.random() * 500000000,
      totalSupply: 2000000000,
      maxSupply: 2000000000,
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Main fetch function
  const fetchCryptoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data;

      if (CMC_API_KEY) {
        // Use CoinMarketCap if API key is available
        console.log("Fetching from CoinMarketCap...");
        data = await fetchFromCMC();
      } else {
        // Try demo API first
        try {
          console.log("No CMC API key found, using demo API...");
          data = await fetchFromDemo();
        } catch (demoError) {
          // Fall back to mock data if demo API fails
          console.log("Demo API failed, using mock data...");
          data = generateMockData();
        }
      }

      setCryptoData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err.message);

      // Use mock data as last resort
      setCryptoData(generateMockData());
    } finally {
      setLoading(false);
    }
  }, [symbols.join(",")]); // Dependency on symbols

  // Refresh function
  const refresh = useCallback(() => {
    fetchCryptoData();
  }, [fetchCryptoData]);

  // Initial fetch
  useEffect(() => {
    fetchCryptoData();

    // Set up periodic refresh (every 60 seconds)
    const interval = setInterval(fetchCryptoData, 60000);

    return () => clearInterval(interval);
  }, [fetchCryptoData]);

  return {
    cryptoData,
    loading,
    error,
    lastUpdate,
    refresh,
  };
};
