import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  DollarSign,
  Activity,
  Bitcoin,
  Eye,
  RefreshCw,
  Settings,
  Filter,
} from "lucide-react";
import { useCryptoData } from "../hooks/useCryptoData";

const CryptoTab = () => {
  const {
    cryptoData,
    newsData,
    loading,
    error,
    lastUpdate,
    priceFilter,
    selectedCryptos,
    refresh,
    updatePriceFilter,
    getMarketStats,
    getTopPerformers,
    addCryptoToWatchlist,
    removeCryptoFromWatchlist,
  } = useCryptoData();

  const [showFilters, setShowFilters] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");

  // Handle adding new cryptocurrency to watchlist
  const handleAddCrypto = () => {
    if (newSymbol.trim()) {
      addCryptoToWatchlist(newSymbol.toUpperCase());
      setNewSymbol("");
    }
  };

  // Handle price filter change
  const handlePriceFilterChange = (min, max) => {
    updatePriceFilter(min, max);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (percent) => {
    return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  // Get FCAS color
  const getFcasColor = (grade) => {
    switch (grade) {
      case "S":
        return "text-purple-400 bg-purple-900/20";
      case "A":
        return "text-green-400 bg-green-900/20";
      case "B":
        return "text-blue-400 bg-blue-900/20";
      case "C":
        return "text-yellow-400 bg-yellow-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
        <span className="text-blue-400">Loading crypto data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={fetchCryptoData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 border border-gray-600/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Bitcoin className="w-8 h-8 mr-3 text-orange-400" />
            Cryptocurrency Market
          </h2>
          <button
            onClick={fetchCryptoData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Total Market Cap</span>
            </div>
            <div className="text-xl font-bold text-white">
              {marketStats
                ? formatCurrency(marketStats.totalMarketCap)
                : "Loading..."}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">24h Volume</span>
            </div>
            <div className="text-xl font-bold text-white">
              {marketStats
                ? formatCurrency(marketStats.totalVolume24h)
                : "Loading..."}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Gainers</span>
            </div>
            <div className="text-xl font-bold text-green-400">
              {marketStats ? marketStats.gainers : 0}
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <span className="text-gray-400 text-sm">Losers</span>
            </div>
            <div className="text-xl font-bold text-red-400">
              {marketStats ? marketStats.losers : 0}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="Add crypto (e.g., BTC)"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                onKeyPress={(e) => e.key === "Enter" && handleAddCrypto()}
              />
              <button
                onClick={handleAddCrypto}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Tracking {selectedCryptos.length} cryptocurrencies
          </div>
        </div>

        {/* Price Filter */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
            <h4 className="text-white font-semibold mb-3">
              Price Range Filter
            </h4>
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-gray-400 text-sm">Min Price ($)</label>
                <input
                  type="number"
                  value={priceFilter.min}
                  onChange={(e) =>
                    handlePriceFilterChange(
                      Number(e.target.value),
                      priceFilter.max
                    )
                  }
                  className="block w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Max Price ($)</label>
                <input
                  type="number"
                  value={priceFilter.max}
                  onChange={(e) =>
                    handlePriceFilterChange(
                      priceFilter.min,
                      Number(e.target.value)
                    )
                  }
                  className="block w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}

        {lastUpdate && (
          <div className="mt-4 text-xs text-gray-400">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </div>
        )}
      </div>

      {/* Crypto Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-600/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Cryptocurrency
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  24h Change
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Volume 24h
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  FCAS Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  News
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {cryptoData.map((crypto, index) => (
                <tr
                  key={crypto.id}
                  className="hover:bg-gray-700/50 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Cryptocurrency Name */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {crypto.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {crypto.name}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {crypto.symbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-white font-bold text-lg">
                      {crypto.price < 1
                        ? `$${crypto.price.toFixed(4)}`
                        : formatCurrency(crypto.price)}
                    </div>
                  </td>

                  {/* 24h Change */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div
                      className={`flex items-center space-x-1 ${
                        crypto.change24h > 0
                          ? "text-green-400"
                          : crypto.change24h < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {crypto.change24h > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-semibold">
                        {formatPercent(crypto.change24h)}
                      </span>
                    </div>
                  </td>

                  {/* Market Cap */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-white font-semibold">
                      {formatCurrency(crypto.marketCap)}
                    </div>
                  </td>

                  {/* Volume 24h */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-gray-300">
                      {formatCurrency(crypto.volume24h)}
                    </div>
                  </td>

                  {/* FCAS Score */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getFcasColor(
                          crypto.fcasGrade
                        )}`}
                      >
                        {crypto.fcasGrade}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {crypto.fcasScore}
                      </span>
                    </div>
                  </td>

                  {/* Remove Button */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <button
                      onClick={() => removeCryptoFromWatchlist(crypto.symbol)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from watchlist"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers Section */}
      {topPerformers.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-600/50 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
            Top 24h Performers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((crypto, index) => (
              <div key={crypto.id} className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">
                    {crypto.symbol}
                  </span>
                  <span className="text-green-400 font-bold">#{index + 1}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {formatPercent(crypto.change24h)}
                </div>
                <div className="text-gray-400 text-sm">
                  {crypto.price < 1
                    ? `${crypto.price.toFixed(4)}`
                    : formatCurrency(crypto.price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OHLCV Chart Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-600/50 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-400" />
          Price Charts & Technical Analysis
        </h3>
        <div className="bg-gray-900/50 rounded-lg p-8 text-center">
          <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">OHLCV Charts Coming Soon</p>
          <p className="text-sm text-gray-500">
            Integration with CoinMarketCap OHLCV data for detailed price
            analysis
          </p>
        </div>
      </div>

      {/* News Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-600/50 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <MessageSquare className="w-6 h-6 mr-2 text-orange-400" />
          Latest Crypto News
        </h3>
        <div className="bg-gray-900/50 rounded-lg p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">
            Crypto News Integration Coming Soon
          </p>
          <p className="text-sm text-gray-500">
            Real-time news from CoinMarketCap and other crypto news sources
          </p>
        </div>
      </div>
    </div>
  );
};

export default CryptoTab;
