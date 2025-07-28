import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Newspaper,
  AlertCircle,
  Brain,
  Loader2,
  RefreshCw,
  Activity,
  BarChart3,
  Target,
  Globe,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Terminal,
  CheckCircle,
  X,
  Zap,
  Bitcoin,
  Info,
} from "lucide-react";
import CryptoNews from "./CryptoNews"; // Import the news component

// CoinDesk API Configuration
const API_KEY = import.meta.env.VITE_COINDESK_API_KEY;
const COINDESK_BASE_URL = "https://data-api.coindesk.com";

// Since CoinDesk API doesn't provide the same comprehensive market data,
// we'll use CryptoCompare for price data (free tier, no key needed for basic requests)
const CRYPTOCOMPARE_URL =
  "https://min-api.cryptocompare.com/data/top/mktcapfull";

// Mock Gemini Service for AI Analysis (replace with your actual service)
const geminiService = {
  async analyzeStock(stock, onProgress) {
    // Simulate API call with progress updates
    onProgress?.("📊 Analyzing price movements...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onProgress?.("📰 Processing market sentiment...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onProgress?.("🧠 Generating 8-hour prediction...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock result
    const basePrice = stock.currentPrice || 100;
    return {
      buyPercentage: Math.floor(Math.random() * 40) + 40,
      signal: Math.random() > 0.5 ? "buy" : "hold",
      reasoning: "Based on recent momentum and market sentiment analysis",
      next8Hours: (Math.random() - 0.5) * 10,
      confidence: Math.random() * 0.3 + 0.6,
      patternsFound: [
        "Bullish Flag",
        `Support at $${(basePrice * 0.95).toFixed(2)}`,
      ],
      analysisTimestamp: new Date().toISOString(),
    };
  },
};

// AI Analysis Worker Component
function AIWorker({ stock, onAnalysisComplete, onClose, isActive }) {
  const [logs, setLogs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState(null);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const performAnalysis = async () => {
    setAnalyzing(true);
    setLogs([]);

    addLog(
      `🤖 Starting 8-hour prediction analysis for ${stock.ticker}...`,
      "system"
    );
    addLog(
      `📊 Current Price: $${stock.currentPrice?.toFixed(2)} (${
        stock.changePercent24h > 0 ? "+" : ""
      }${stock.changePercent24h?.toFixed(2)}%)`,
      "info"
    );
    addLog(`📰 Analyzing recent market activity...`, "info");

    try {
      const aiResult = await geminiService.analyzeStock(
        stock,
        (progressMessage) => {
          addLog(progressMessage, "progress");
        }
      );

      addLog("✅ 8-hour prediction complete", "success");
      addLog(
        `🎯 Signal: ${aiResult.signal.toUpperCase()} (${
          aiResult.buyPercentage
        }%)`,
        "result"
      );
      addLog(`💭 ${aiResult.reasoning}`, "reasoning");

      const predictionDirection =
        aiResult.next8Hours > 0 ? "📈" : aiResult.next8Hours < 0 ? "📉" : "➡️";
      addLog(
        `${predictionDirection} 8-Hour Prediction: ${
          aiResult.next8Hours > 0 ? "+" : ""
        }${aiResult.next8Hours.toFixed(1)}%`,
        "forecast"
      );

      setResult(aiResult);
      setComplete(true);
      onAnalysisComplete?.(stock.ticker, aiResult);
    } catch (error) {
      addLog(`❌ Analysis failed: ${error.message}`, "error");
      setComplete(true);
    }

    setAnalyzing(false);
  };

  useEffect(() => {
    if (isActive && !analyzing && !complete) {
      performAnalysis();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  AI Analysis Engine
                </h3>
                <p className="text-sm text-gray-300">
                  8-Hour Price Prediction for {stock.ticker}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-black/90 p-6 h-96 overflow-y-auto font-mono text-sm space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`${
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "success"
                  ? "text-green-400"
                  : log.type === "system"
                  ? "text-blue-400"
                  : log.type === "result"
                  ? "text-yellow-400"
                  : log.type === "reasoning"
                  ? "text-purple-400"
                  : log.type === "forecast"
                  ? "text-cyan-400"
                  : "text-gray-300"
              }`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span>{" "}
              {log.message}
            </div>
          ))}
          {analyzing && (
            <div className="flex items-center space-x-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {complete && result && (
          <div className="border-t border-gray-700 p-6 bg-gray-800/50">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    result.signal === "buy"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {result.signal.toUpperCase()}
                </div>
                <div className="text-sm text-gray-400">Signal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {result.buyPercentage}%
                </div>
                <div className="text-sm text-gray-400">Confidence</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    result.next8Hours > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {result.next8Hours > 0 ? "+" : ""}
                  {result.next8Hours.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">8H Prediction</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stock Card Component (matching crypto section style)
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
              ? `${(stock.volume24h / 1e9).toFixed(1)}B`
              : stock.volume24h >= 1e6
              ? `${(stock.volume24h / 1e6).toFixed(1)}M`
              : `${(stock.volume24h / 1e3).toFixed(1)}K`}
          </div>
        </div>
      </div>

      {/* AI Analysis Result */}
      {hasAnalysis && analysisResult && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">
                AI Prediction
              </span>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${getSignalColor(
                analysisResult.signal
              )}`}
            >
              {analysisResult.signal?.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">8H Forecast:</span>
              <span
                className={`ml-1 font-medium ${
                  analysisResult.next8Hours > 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {analysisResult.next8Hours > 0 ? "+" : ""}
                {analysisResult.next8Hours?.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Confidence:</span>
              <span className="ml-1 font-medium text-blue-400">
                {analysisResult.buyPercentage}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Latest News */}
      {stock.latestNews && (
        <div className="mb-4">
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

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onAnalyze(stock)}
          disabled={hasAnalysis}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${
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
            <span>Read Full Article</span>
            <ExternalLink className="w-3 h-3" />
          </a>
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

  // Fetch crypto data from multiple sources
  const fetchCryptoData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      if (!API_KEY) {
        throw new Error(
          "CoinDesk API key not found. Please add VITE_COINDESK_API_KEY to your .env file"
        );
      }

      // First, get list of cryptocurrencies and their 24hr data from CryptoCompare
      // (CoinDesk API is primarily for news, not comprehensive market data)
      const cryptoParams = new URLSearchParams({
        limit: 50,
        tsym: "USD",
      });

      const cryptoUrl = `${CRYPTOCOMPARE_URL}?${cryptoParams}`;

      console.log("Fetching cryptocurrency market data...");
      const marketResponse = await fetch(cryptoUrl);

      if (!marketResponse.ok) {
        throw new Error(
          `Market API Error: ${marketResponse.status} ${marketResponse.statusText}`
        );
      }

      const marketData = await marketResponse.json();

      if (marketData.Response === "Error") {
        throw new Error(marketData.Message || "Market API Error");
      }

      // Transform the data into our component format
      const cryptoData = [];

      if (marketData.Data && Array.isArray(marketData.Data)) {
        // Process each cryptocurrency
        for (let i = 0; i < Math.min(marketData.Data.length, 20); i++) {
          const crypto = marketData.Data[i];
          if (crypto.RAW && crypto.RAW.USD) {
            const data = crypto.RAW.USD;
            const coinInfo = crypto.CoinInfo;

            // Try to fetch news from CoinDesk for this cryptocurrency
            let latestNews = null;

            // Skip news fetching for now since we're getting 404 errors
            // We'll use mock news until we can verify the correct endpoint
            const newsOptions = [
              `${coinInfo.Name} shows strong momentum amid institutional interest`,
              `Technical analysis suggests bullish pattern for ${coinInfo.Name}`,
              `${coinInfo.Name} network activity reaches new highs`,
              `Major upgrade announced for ${coinInfo.Name} ecosystem`,
              `${coinInfo.Name} trading volume surges on positive sentiment`,
            ];

            latestNews = {
              title:
                newsOptions[Math.floor(Math.random() * newsOptions.length)],
              url: `https://www.coindesk.com/search?q=${coinInfo.Name}`,
              minutesAgo: Math.floor(Math.random() * 60) + 1,
            };

            cryptoData.push({
              ticker: coinInfo.Name,
              name: coinInfo.FullName,
              rank: i + 1,
              currentPrice: data.PRICE,
              changePercent24h: data.CHANGEPCT24HOUR,
              high24h: data.HIGH24HOUR,
              low24h: data.LOW24HOUR,
              volume24h: data.VOLUME24HOUR,
              marketCap: data.MKTCAP,
              latestNews: {
                title: latestNews.title,
              },
              newsMinutesAgo: latestNews.minutesAgo,
              newsUrl: latestNews.url,
              description: `${
                coinInfo.FullName
              } is a digital asset with a market cap of ${(
                data.MKTCAP / 1e9
              ).toFixed(2)}B.`,
              // Additional data
              supply: data.SUPPLY,
              totalVolume24h: data.TOTALVOLUME24H,
              openDay: data.OPENDAY,
              changeDay: data.CHANGEDAY,
            });
          }
        }
      }

      setStocks(cryptoData);
      setLastUpdate(new Date());
      console.log(`Successfully loaded ${cryptoData.length} cryptocurrencies`);
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
      {/* API Key Notice */}
      {!API_KEY && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700/30 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-sm text-red-300">
            <p className="font-medium mb-1">CoinDesk API Key Missing</p>
            <p className="text-red-400/80">
              Add{" "}
              <code className="bg-gray-800 px-1 rounded">
                VITE_COINDESK_API_KEY=your_key
              </code>{" "}
              to your .env file
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
            Real-time crypto prices with AI-powered 8-hour predictions
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Cryptos</p>
              <p className="text-2xl font-bold text-white">{stocks.length}</p>
            </div>
            <Bitcoin className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Gainers</p>
              <p className="text-2xl font-bold text-green-400">
                {stocks.filter((s) => s.changePercent24h > 0).length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Losers</p>
              <p className="text-2xl font-bold text-red-400">
                {stocks.filter((s) => s.changePercent24h < 0).length}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">AI Analyzed</p>
              <p className="text-2xl font-bold text-purple-400">
                {Object.keys(analyses).length}
              </p>
            </div>
            <Brain className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Stocks Grid */}
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

      {/* AI Analysis Modal */}
      {activeAnalysis && (
        <AIWorker
          stock={activeAnalysis}
          onAnalysisComplete={handleAnalysisComplete}
          onClose={() => setActiveAnalysis(null)}
          isActive={true}
        />
      )}

      {/* CoinDesk News Section */}
      <CryptoNews />
    </div>
  );
}
