// src/components/CryptoTab.jsx - Updated with Coinbase API
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import CryptoNews from "./CryptoNews"; // Import the news component
// Removed AnalysisModal import - will create inline modal

// Coinbase API Configuration
const EXCHANGE_BASE_URL = "https://api.exchange.coinbase.com";
const V3_BASE_URL = "https://api.coinbase.com";
const API_KEY = import.meta.env.VITE_COINBASE_API_KEY;

// Helper function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calculate percentage change
function calculatePercentageChange(current, previous) {
  if (!current || !previous || previous === "0") return 0;
  const change =
    ((parseFloat(current) - parseFloat(previous)) / parseFloat(previous)) * 100;
  return change;
}

// Fetch all products from Exchange API
async function getExchangeProducts() {
  try {
    const response = await fetch(`${EXCHANGE_BASE_URL}/products`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Exchange API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Exchange products:", error.message);
    throw error;
  }
}

// Fetch market stats (24hr ticker) from Exchange API
async function getMarketStats(productId) {
  try {
    const [tickerResponse, statsResponse] = await Promise.all([
      fetch(`${EXCHANGE_BASE_URL}/products/${productId}/ticker`),
      fetch(`${EXCHANGE_BASE_URL}/products/${productId}/stats`),
    ]);

    if (!tickerResponse.ok || !statsResponse.ok) {
      return null;
    }

    const ticker = await tickerResponse.json();
    const stats = await statsResponse.json();

    return {
      price: ticker.price,
      volume_24h: stats.volume,
      high_24h: stats.high,
      low_24h: stats.low,
      open_24h: stats.open,
      last_24h: stats.last,
    };
  } catch (error) {
    return null;
  }
}

// Get crypto metadata (name, description, etc.)
function getCryptoMetadata(baseCurrency, displayName) {
  // Use display name from Coinbase if available, otherwise use ticker
  const name = displayName || baseCurrency;

  // Basic descriptions for popular cryptos, fallback to generic
  const descriptions = {
    BTC: "The world's first cryptocurrency, Bitcoin is a decentralized digital currency.",
    ETH: "A decentralized platform that runs smart contracts and decentralized applications.",
    SOL: "A high-performance blockchain supporting builders around the world.",
    USDC: "A digital stablecoin that is pegged to the United States dollar.",
    USDT: "A stablecoin that mirrors the price of the U.S. dollar.",
    XRP: "Digital payment protocol and cryptocurrency for financial transactions.",
    ADA: "A proof-of-stake blockchain platform founded on peer-reviewed research.",
    DOGE: "A cryptocurrency featuring a likeness of the Shiba Inu dog from the 'Doge' meme.",
    AVAX: "A layer one blockchain that functions as a platform for decentralized applications.",
    LINK: "A decentralized oracle network that provides real-world data to smart contracts.",
  };

  return {
    name: name,
    description: descriptions[baseCurrency] || `${name} - Trading on Coinbase`,
  };
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
            {Math.abs(stock.changePercent24h || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase">24h High</div>
          <div className="text-sm font-semibold text-gray-300">
            ${stock.high24h?.toFixed(2) || "0.00"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">24h Low</div>
          <div className="text-sm font-semibold text-gray-300">
            ${stock.low24h?.toFixed(2) || "0.00"}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Volume</div>
          <div className="text-sm font-semibold text-gray-300">
            $
            {stock.volume24h >= 1e9
              ? `${(stock.volume24h / 1e9).toFixed(2)}B`
              : stock.volume24h >= 1e6
              ? `${(stock.volume24h / 1e6).toFixed(2)}M`
              : stock.volume24h.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onAnalyze(stock)}
          disabled={hasAnalysis}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2
            ${
              hasAnalysis
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-105"
            }`}
        >
          <Brain className="w-4 h-4" />
          <span>{hasAnalysis ? "Analyzed" : "Predict 8H"}</span>
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Market Cap:</span>
              <span className="ml-2 text-gray-300">
                $
                {stock.marketCap >= 1e9
                  ? `${(stock.marketCap / 1e9).toFixed(2)}B`
                  : `${(stock.marketCap / 1e6).toFixed(2)}M`}
              </span>
            </div>
            <div>
              <span className="text-gray-500">24h Range:</span>
              <span className="ml-2 text-gray-300">
                ${stock.low24h?.toFixed(2)} - ${stock.high24h?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Latest News */}
          {stock.latestNews && (
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Newspaper className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">
                  Latest News
                </span>
                <span className="text-xs text-gray-500">
                  {stock.newsMinutesAgo}m ago
                </span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">
                {stock.latestNews.title}
              </p>
            </div>
          )}

          {stock.description && (
            <p className="text-sm text-gray-400 leading-relaxed">
              {stock.description}
            </p>
          )}

          <a
            href={stock.newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View More News</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Analysis Results */}
      {hasAnalysis && analysisResult && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase">AI Signal</div>
              <div
                className={`text-sm font-bold ${getSignalColor(
                  analysisResult.signal
                )} px-2 py-1 rounded inline-block`}
              >
                {analysisResult.signal?.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
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

// Main Crypto Tab Component
export default function CryptoTab() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch crypto data from Coinbase
  const fetchCryptoData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      console.log("Fetching cryptocurrency data from Coinbase...");

      // Step 1: Get all products
      const exchangeProducts = await getExchangeProducts();
      console.log(`Found ${exchangeProducts.length} products`);

      // Filter for active USD products
      const usdProducts = exchangeProducts.filter(
        (p) => p.quote_currency === "USD" && p.status === "online"
      );

      // We'll need to fetch market data for all products to sort by price change
      console.log(
        `Fetching market data for ${usdProducts.length} USD pairs...`
      );

      // Step 2: Enrich with market data
      const cryptoData = [];
      const batchSize = 5; // Increased batch size for faster loading

      for (let i = 0; i < usdProducts.length; i += batchSize) {
        const batch = usdProducts.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            usdProducts.length / batchSize
          )}...`
        );

        const batchPromises = batch.map(async (product) => {
          try {
            const marketStats = await getMarketStats(product.id);

            const metadata = getCryptoMetadata(
              product.base_currency,
              product.display_name
            );
            const mockNews = generateMockNews(product.base_currency);
            const changePercent = calculatePercentageChange(
              marketStats.price,
              marketStats.open_24h
            );

            // Calculate approximate market cap (simplified)
            const price = parseFloat(marketStats.price);
            const volume = parseFloat(marketStats.volume_24h);
            const estimatedMarketCap = volume * 100; // Very rough estimate

            return {
              ticker: product.base_currency,
              name: metadata.name,
              currentPrice: price,
              changePercent24h: changePercent,
              high24h: parseFloat(marketStats.high_24h),
              low24h: parseFloat(marketStats.low_24h),
              volume24h: volume,
              marketCap: estimatedMarketCap,
              latestNews: {
                title: mockNews.title,
              },
              newsMinutesAgo: mockNews.minutesAgo,
              newsUrl: mockNews.url,
              description: metadata.description,
              productId: product.id,
              displayName: product.display_name, // Keep original display name from Coinbase
            };
          } catch (error) {
            console.error(`Failed to enrich ${product.id}:`, error.message);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        cryptoData.push(...batchResults.filter((p) => p !== null));

        // Add delay between batches to avoid rate limits
        if (i + batchSize < usdProducts.length) {
          await delay(2000); // Reduced delay for faster loading
        }
      }

      // Sort by 24h percentage change (highest to lowest)
      const sortedCryptoData = cryptoData.sort(
        (a, b) => b.changePercent24h - a.changePercent24h
      );

      // Add rank based on sorted position
      sortedCryptoData.forEach((crypto, index) => {
        crypto.rank = index + 1;
      });

      setStocks(sortedCryptoData);
      setLastUpdate(new Date());
      console.log(
        `Successfully loaded ${sortedCryptoData.length} cryptocurrencies`
      );
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err.message || "Failed to fetch cryptocurrency data");

      // Set some fallback data for demo purposes
      setStocks([
        {
          ticker: "BTC",
          name: "Bitcoin",
          rank: 1,
          currentPrice: 42567.89,
          changePercent24h: 3.45,
          high24h: 43200.0,
          low24h: 41000.0,
          volume24h: 28945678900,
          marketCap: 834567890000,
          latestNews: {
            title:
              "Bitcoin ETF Sees Record Inflows as Institutional Adoption Grows",
          },
          newsMinutesAgo: 12,
          newsUrl: "https://www.coindesk.com/search?q=Bitcoin",
          description: "Bitcoin is a decentralized digital currency.",
        },
        {
          ticker: "ETH",
          name: "Ethereum",
          rank: 2,
          currentPrice: 2234.56,
          changePercent24h: 2.15,
          high24h: 2280.0,
          low24h: 2180.0,
          volume24h: 15678900000,
          marketCap: 268000000000,
          latestNews: {
            title: "Ethereum Layer 2 Solutions See Explosive Growth",
          },
          newsMinutesAgo: 25,
          newsUrl: "https://www.coindesk.com/search?q=Ethereum",
          description:
            "Ethereum is a decentralized platform for smart contracts.",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch crypto data on mount
  useEffect(() => {
    fetchCryptoData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCryptoData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Loading crypto data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ultra-glass p-6">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-400 mr-3" />
          <div>
            <span className="text-red-400">{error}</span>
            <button
              onClick={fetchCryptoData}
              className="ml-4 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
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
      {/* API Key Notice */}
      {!API_KEY && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-300">
            <p className="font-medium mb-1">No API Key Required</p>
            <p className="text-yellow-400/80">
              Using Coinbase Exchange public API (no authentication needed)
            </p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center">
            <Bitcoin className="w-7 h-7 mr-2 text-yellow-400" />
            Cryptocurrency Market
          </h2>
          <p className="text-gray-400 text-sm">
            Real-time crypto prices from Coinbase sorted by 24h gains
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
            onClick={fetchCryptoData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-300 flex items-center space-x-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stock Grid - Scrollable Container */}
      <div
        className="crypto-scrollbar relative h-[800px] overflow-y-auto overflow-x-hidden pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4B5563 #1F2937",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((stock) => (
            <StockCard
              key={stock.ticker}
              stock={stock}
              onAnalyze={handleAnalyze}
              hasAnalysis={!!analyses[stock.ticker]}
              analysisResult={analyses[stock.ticker]}
            />
          ))}
        </div>
      </div>

      {/* Crypto News Section */}
      <div className="mt-8">
        <CryptoNews />
      </div>

      {/* Analysis Modal */}
      {activeAnalysis && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setActiveAnalysis(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-400" />
                AI Analysis - {activeAnalysis.ticker}
              </h3>
              <button
                onClick={() => setActiveAnalysis(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-300 mb-2">
                  Analyzing {activeAnalysis.name} ({activeAnalysis.ticker})...
                </p>
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-gray-400">
                    Generating 8-hour prediction
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  This is a demo. Implement your AI analysis here.
                </p>
              </div>

              <button
                onClick={() => {
                  // Simulate analysis completion
                  setTimeout(() => {
                    handleAnalysisComplete(activeAnalysis.ticker, {
                      signal: Math.random() > 0.5 ? "buy" : "hold",
                      next8Hours: (Math.random() - 0.5) * 10,
                      buyPercentage: Math.floor(Math.random() * 40) + 40,
                    });
                  }, 2000);
                }}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
