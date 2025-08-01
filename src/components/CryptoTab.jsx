// src/components/CryptoTab.jsx - WebSocket Implementation
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bitcoin,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Brain,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Newspaper,
  Wifi,
  WifiOff,
} from "lucide-react";
import CryptoNews from "./CryptoNews";

// Coinbase WebSocket Configuration
const WEBSOCKET_URL = "wss://ws-feed.exchange.coinbase.com";
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Helper function to calculate percentage change
function calculatePercentageChange(current, previous) {
  if (!current || !previous || previous === "0") return 0;
  const change =
    ((parseFloat(current) - parseFloat(previous)) / parseFloat(previous)) * 100;
  return change;
}

// Get crypto metadata (name, description, etc.)
function getCryptoMetadata(baseCurrency) {
  const metadata = {
    BTC: {
      name: "Bitcoin",
      description:
        "The world's first cryptocurrency, Bitcoin is a decentralized digital currency.",
    },
    ETH: {
      name: "Ethereum",
      description:
        "A decentralized platform that runs smart contracts and decentralized applications.",
    },
    SOL: {
      name: "Solana",
      description:
        "A high-performance blockchain supporting builders around the world.",
    },
    USDC: {
      name: "USD Coin",
      description:
        "A digital stablecoin that is pegged to the United States dollar.",
    },
    USDT: {
      name: "Tether",
      description: "A stablecoin that mirrors the price of the U.S. dollar.",
    },
    XRP: {
      name: "XRP",
      description:
        "Digital payment protocol and cryptocurrency for financial transactions.",
    },
    ADA: {
      name: "Cardano",
      description:
        "A proof-of-stake blockchain platform founded on peer-reviewed research.",
    },
    DOGE: {
      name: "Dogecoin",
      description:
        "A cryptocurrency featuring a likeness of the Shiba Inu dog from the 'Doge' meme.",
    },
    AVAX: {
      name: "Avalanche",
      description:
        "A layer one blockchain that functions as a platform for decentralized applications.",
    },
    LINK: {
      name: "Chainlink",
      description:
        "A decentralized oracle network that provides real-world data to smart contracts.",
    },
    MATIC: {
      name: "Polygon",
      description: "A decentralized Ethereum scaling platform.",
    },
    DOT: {
      name: "Polkadot",
      description: "An open-source sharded multichain protocol.",
    },
    UNI: {
      name: "Uniswap",
      description: "A decentralized cryptocurrency exchange.",
    },
    ATOM: {
      name: "Cosmos",
      description:
        "A decentralized network of independent parallel blockchains.",
    },
    LTC: {
      name: "Litecoin",
      description: "A peer-to-peer cryptocurrency based on Bitcoin.",
    },
    BCH: {
      name: "Bitcoin Cash",
      description: "A peer-to-peer electronic cash system.",
    },
    ALGO: {
      name: "Algorand",
      description: "A carbon-negative, layer-1 blockchain.",
    },
    XLM: {
      name: "Stellar",
      description: "An open network for storing and moving money.",
    },
    VET: {
      name: "VeChain",
      description: "A blockchain platform for supply chain management.",
    },
    ICP: {
      name: "Internet Computer",
      description:
        "A blockchain that enables smart contracts to run at web speed.",
    },
  };

  return (
    metadata[baseCurrency] || {
      name: baseCurrency,
      description: `${baseCurrency} cryptocurrency trading on Coinbase.`,
    }
  );
}

// Generate mock news for demo
function generateMockNews(ticker) {
  const newsOptions = [
    `${ticker} shows strong momentum amid institutional interest`,
    `Technical analysis suggests bullish pattern for ${ticker}`,
    `${ticker} network activity reaches new highs`,
    `Major upgrade announced for ${ticker} ecosystem`,
    `${ticker} trading volume surges on positive sentiment`,
  ];

  return {
    title: newsOptions[Math.floor(Math.random() * newsOptions.length)],
    url: `https://www.coindesk.com/search?q=${ticker}`,
    minutesAgo: Math.floor(Math.random() * 60) + 1,
  };
}

// Stock Card Component
function StockCard({ stock, onAnalyze, hasAnalysis, analysisResult }) {
  const [expanded, setExpanded] = useState(false);

  const getSignalColor = (signal) => {
    switch (signal?.toLowerCase()) {
      case "buy":
        return "text-green-400 bg-green-900/20";
      case "sell":
        return "text-red-400 bg-red-900/20";
      default:
        return "text-yellow-400 bg-yellow-900/20";
    }
  };

  return (
    <div className="ultra-glass p-6 hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {stock.ticker}
            </h3>
            {stock.rank && (
              <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                #{stock.rank}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{stock.name}</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            ${stock.currentPrice?.toFixed(2) || "0.00"}
          </div>
          <div
            className={`flex items-center justify-end text-sm font-medium ${
              stock.changePercent24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {stock.changePercent24h >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {stock.changePercent24h >= 0 ? "+" : ""}
            {stock.changePercent24h?.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">24h High</span>
          <div className="text-white font-medium">
            ${stock.high24h?.toFixed(2) || "0.00"}
          </div>
        </div>
        <div>
          <span className="text-gray-500">24h Low</span>
          <div className="text-white font-medium">
            ${stock.low24h?.toFixed(2) || "0.00"}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Volume (24h)</span>
          <div className="text-white font-medium">
            ${((stock.volume24h || 0) / 1e9).toFixed(2)}B
          </div>
        </div>
        <div>
          <span className="text-gray-500">Market Cap</span>
          <div className="text-white font-medium">
            ${((stock.marketCap || 0) / 1e9).toFixed(2)}B
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700/50 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center text-sm text-gray-400 mb-2">
              <Newspaper className="w-3 h-3 mr-1" />
              <span>{stock.newsMinutesAgo}m ago</span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-2">
              {stock.latestNews?.title}
            </p>
          </div>
          <a
            href={stock.newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <span className="text-sm text-gray-300">
            {expanded ? "Hide Details" : "Show Details"}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="text-sm text-gray-400 pt-2">{stock.description}</div>
        )}

        <button
          onClick={() => onAnalyze(stock)}
          disabled={hasAnalysis}
          className={`w-full py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
            hasAnalysis
              ? "bg-gray-700/30 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>{hasAnalysis ? "Analysis Complete" : "Analyze"}</span>
        </button>
      </div>

      {analysisResult && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">
              AI Analysis
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getSignalColor(
                analysisResult.signal
              )}`}
            >
              {analysisResult.signal?.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-gray-700/30 rounded">
              <div
                className={`text-lg font-bold ${
                  analysisResult.confidence >= 70
                    ? "text-green-400"
                    : analysisResult.confidence >= 40
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {analysisResult.confidence}%
              </div>
              <div className="text-sm text-gray-400">Confidence</div>
            </div>
            <div className="text-center p-2 bg-gray-700/30 rounded">
              <div
                className={`text-lg font-bold ${
                  analysisResult.next8Hours > 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {analysisResult.next8Hours > 0 ? "+" : ""}
                {analysisResult.next8Hours.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">8H Prediction</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Crypto Tab Component with WebSocket
export default function CryptoTab() {
  const [cryptoData, setCryptoData] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const subscriptionRef = useRef(new Set());

  // Default crypto symbols to subscribe to
  const DEFAULT_SYMBOLS = [
    "BTC",
    "ETH",
    "SOL",
    "USDC",
    "XRP",
    "ADA",
    "DOGE",
    "AVAX",
    "LINK",
    "MATIC",
    "DOT",
    "UNI",
    "ATOM",
    "LTC",
    "BCH",
    "ALGO",
    "XLM",
    "VET",
    "ICP",
    "SHIB",
    "CRO",
    "NEAR",
    "FIL",
    "APT",
    "ARB",
    "OP",
    "IMX",
    "GRT",
    "SAND",
    "MANA",
    "AXS",
    "AAVE",
  ];

  // Initialize 24h data for each crypto
  const init24hData = useCallback((symbol) => {
    const metadata = getCryptoMetadata(symbol);
    const mockNews = generateMockNews(symbol);

    return {
      ticker: symbol,
      name: metadata.name,
      description: metadata.description,
      currentPrice: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      marketCap: 0,
      open24h: 0,
      latestNews: { title: mockNews.title },
      newsMinutesAgo: mockNews.minutesAgo,
      newsUrl: mockNews.url,
      lastUpdate: Date.now(),
    };
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    try {
      wsRef.current = new WebSocket(WEBSOCKET_URL);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus("connected");
        reconnectAttempts.current = 0;
        setLoading(false);

        // Subscribe to ticker channels for all symbols
        const productIds = DEFAULT_SYMBOLS.map((symbol) => `${symbol}-USD`);

        const subscribeMessage = {
          type: "subscribe",
          product_ids: productIds,
          channels: ["ticker", "heartbeat"],
        };

        wsRef.current.send(JSON.stringify(subscribeMessage));
        console.log("Subscribed to:", productIds);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "ticker") {
          // Extract symbol from product_id (e.g., "BTC-USD" -> "BTC")
          const symbol = data.product_id.split("-")[0];

          setCryptoData((prev) => {
            const newData = new Map(prev);
            const existing = newData.get(symbol) || init24hData(symbol);

            // Calculate 24h change if we have open price
            const currentPrice = parseFloat(data.price);
            const open24h =
              existing.open24h || parseFloat(data.open_24h) || currentPrice;
            const changePercent24h = calculatePercentageChange(
              currentPrice,
              open24h
            );

            // Update with new ticker data
            newData.set(symbol, {
              ...existing,
              currentPrice,
              changePercent24h,
              high24h: parseFloat(data.high_24h) || existing.high24h,
              low24h: parseFloat(data.low_24h) || existing.low24h,
              volume24h: parseFloat(data.volume_24h) || existing.volume24h,
              open24h: open24h,
              marketCap: (parseFloat(data.volume_24h) || 0) * 100, // Rough estimate
              lastUpdate: Date.now(),
            });

            return newData;
          });

          setLastUpdate(new Date());
        } else if (data.type === "heartbeat") {
          // Heartbeat received - connection is alive
        } else if (data.type === "error") {
          console.error("WebSocket error:", data.message);
          setError(data.message);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        setConnectionStatus("error");
        setError("WebSocket connection error");
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus("disconnected");

        // Attempt to reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else {
          setError(
            "Unable to connect to Coinbase WebSocket after multiple attempts"
          );
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to connect to Coinbase WebSocket");
      setConnectionStatus("error");
    }
  }, [init24hData]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Subscribe to additional symbol
  const subscribeToSymbol = useCallback(
    (symbol) => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        !subscriptionRef.current.has(symbol)
      ) {
        const subscribeMessage = {
          type: "subscribe",
          product_ids: [`${symbol}-USD`],
          channels: ["ticker"],
        };
        wsRef.current.send(JSON.stringify(subscribeMessage));
        subscriptionRef.current.add(symbol);

        // Initialize data for new symbol
        setCryptoData((prev) => {
          const newData = new Map(prev);
          if (!newData.has(symbol)) {
            newData.set(symbol, init24hData(symbol));
          }
          return newData;
        });
      }
    },
    [init24hData]
  );

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const handleAnalyze = (stock) => {
    setActiveAnalysis(stock);
  };

  const handleAnalysisComplete = (ticker, result) => {
    setAnalyses((prev) => ({
      ...prev,
      [ticker]: result,
    }));
    setActiveAnalysis(null);
  };

  // Convert Map to sorted array for display
  const sortedCryptoData = Array.from(cryptoData.values())
    .filter((crypto) => crypto.currentPrice > 0) // Only show cryptos with price data
    .sort((a, b) => b.changePercent24h - a.changePercent24h);

  // Filter by search term
  const filteredCryptoData = sortedCryptoData.filter(
    (crypto) =>
      crypto.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && cryptoData.size === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">
          Connecting to Coinbase WebSocket...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .crypto-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .crypto-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        .crypto-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        .crypto-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>

      {/* Connection Status */}
      <div
        className={`mb-4 p-4 rounded-lg flex items-start space-x-3 ${
          connectionStatus === "connected"
            ? "bg-green-900/20 border border-green-700/30"
            : connectionStatus === "connecting"
            ? "bg-yellow-900/20 border border-yellow-700/30"
            : "bg-red-900/20 border border-red-700/30"
        }`}
      >
        {connectionStatus === "connected" ? (
          <Wifi className="w-5 h-5 text-green-400 mt-0.5" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-400 mt-0.5" />
        )}
        <div className="text-sm">
          <p
            className={`font-medium mb-1 ${
              connectionStatus === "connected"
                ? "text-green-300"
                : "text-red-300"
            }`}
          >
            {connectionStatus === "connected"
              ? "Connected to Coinbase WebSocket"
              : connectionStatus === "connecting"
              ? "Connecting to Coinbase WebSocket..."
              : "Disconnected from Coinbase WebSocket"}
          </p>
          <p
            className={
              connectionStatus === "connected"
                ? "text-green-400/80"
                : "text-red-400/80"
            }
          >
            Real-time price updates{" "}
            {connectionStatus === "connected" ? "active" : "inactive"}
          </p>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center">
            <Bitcoin className="w-7 h-7 mr-2 text-yellow-400" />
            Cryptocurrency Market
          </h2>
          <p className="text-gray-400 text-sm">
            Real-time crypto prices from Coinbase WebSocket
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="text-sm text-gray-400">
              <Clock className="w-4 h-4 inline mr-1" />
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={() => {
              disconnectWebSocket();
              setTimeout(connectWebSocket, 100);
            }}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-300 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search cryptocurrencies..."
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Add new symbol */}
      {isSearchFocused &&
        searchTerm &&
        !cryptoData.has(searchTerm.toUpperCase()) && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <button
              onClick={() => {
                subscribeToSymbol(searchTerm.toUpperCase());
                setSearchTerm("");
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add {searchTerm.toUpperCase()} to watchlist
            </button>
          </div>
        )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-center py-4">
          <AlertCircle className="w-6 h-6 text-red-400 mr-2" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Crypto Grid - Scrollable Container */}
      <div
        className="crypto-scrollbar relative h-[800px] overflow-y-auto overflow-x-hidden pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4B5563 #1F2937",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCryptoData.map((crypto, index) => (
            <StockCard
              key={crypto.ticker}
              stock={{ ...crypto, rank: index + 1 }}
              onAnalyze={handleAnalyze}
              hasAnalysis={!!analyses[crypto.ticker]}
              analysisResult={analyses[crypto.ticker]}
            />
          ))}
        </div>

        {filteredCryptoData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm
              ? "No cryptocurrencies found matching your search."
              : "Waiting for price data..."}
          </div>
        )}
      </div>

      {/* Analysis Modal */}
      {activeAnalysis && (
        <CryptoNews
          crypto={activeAnalysis}
          onClose={() => setActiveAnalysis(null)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {/* News Component if needed */}
      <CryptoNews />
    </div>
  );
}
