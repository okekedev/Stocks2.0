import React, { useState, useEffect } from "react";
import {
  Newspaper,
  Clock,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Tag,
  Calendar,
  User,
  Hash,
  Filter,
  Search,
} from "lucide-react";

// CryptoCompare News API Configuration
const CRYPTOCOMPARE_NEWS_URL =
  "https://min-api.cryptocompare.com/data/v2/news/";

export default function CryptoNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [feeds, setFeeds] = useState([]); // Available news feeds
  const [selectedFeed, setSelectedFeed] = useState("all");

  // Predefined categories for crypto news
  const categories = [
    { value: "all", label: "All News", icon: Newspaper },
    { value: "BTC", label: "Bitcoin", icon: Hash },
    { value: "ETH", label: "Ethereum", icon: Hash },
    { value: "DeFi", label: "DeFi", icon: TrendingUp },
    { value: "NFT", label: "NFTs", icon: Tag },
    { value: "Regulation", label: "Regulation", icon: Filter },
    { value: "Trading", label: "Trading", icon: TrendingUp },
  ];

  // Calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const publishTime = timestamp * 1000; // Convert to milliseconds
    const diff = now - publishTime;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Fetch news from CryptoCompare API
  const fetchNews = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Build the URL based on selected options
      let url = CRYPTOCOMPARE_NEWS_URL;
      const params = new URLSearchParams();

      // Add feed filter if specific feed selected
      if (selectedFeed !== "all") {
        params.append("feeds", selectedFeed);
      }

      // Add category filter if specific category selected
      if (selectedCategory !== "all") {
        params.append("categories", selectedCategory);
      }

      // Add sorting - latest first
      params.append("sortOrder", "latest");

      if (params.toString()) {
        url += "?" + params.toString();
      }

      console.log("Fetching crypto news from:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("News API Response:", data);

      // Process articles
      const processedArticles = [];

      if (data.Data && Array.isArray(data.Data)) {
        data.Data.forEach((article) => {
          processedArticles.push({
            id: article.id || Math.random().toString(),
            title: article.title || "Untitled",
            description: article.body
              ? article.body.substring(0, 200) + "..."
              : "",
            url: article.url || article.guid || "#",
            imageUrl: article.imageurl || null,
            publishedAt: article.published_on || Date.now() / 1000,
            timeAgo: getTimeAgo(article.published_on || Date.now() / 1000),
            author: article.source || "Unknown",
            categories: article.categories ? article.categories.split("|") : [],
            tags: article.tags ? article.tags.split("|") : [],
            source: article.source_info?.name || article.source || "Unknown",
            upvotes: article.upvotes || 0,
            downvotes: article.downvotes || 0,
          });
        });
      }

      // Sort by publish date (most recent first)
      processedArticles.sort((a, b) => b.publishedAt - a.publishedAt);

      setArticles(processedArticles);
      console.log(`Loaded ${processedArticles.length} articles`);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.message || "Failed to fetch news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch available news feeds
  const fetchFeeds = async () => {
    try {
      const response = await fetch(
        "https://min-api.cryptocompare.com/data/news/feeds"
      );
      if (response.ok) {
        const data = await response.json();
        if (data.Data) {
          setFeeds(data.Data);
        }
      }
    } catch (err) {
      console.error("Error fetching feeds:", err);
    }
  };

  // Fetch news on mount and when filters change
  useEffect(() => {
    fetchNews();
    fetchFeeds();
  }, [selectedCategory, selectedFeed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Loading news...</span>
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
              onClick={fetchNews}
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
    <div className="space-y-6 mt-8">
      {/* News Header */}
      <div className="ultra-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center">
              <Newspaper className="w-6 h-6 mr-2 text-blue-400" />
              Latest Crypto News
            </h3>
            <p className="text-gray-400 text-sm">
              Real-time news from multiple crypto sources
            </p>
          </div>

          <button
            onClick={fetchNews}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-300 flex items-center space-x-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    selectedCategory === cat.value
                      ? "bg-blue-600 text-white shadow-lg transform scale-105"
                      : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* News Source Filter */}
          {feeds.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Source:</span>
              <select
                value={selectedFeed}
                onChange={(e) => setSelectedFeed(e.target.value)}
                className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Sources</option>
                {feeds.map((feed) => (
                  <option key={feed.key} value={feed.key}>
                    {feed.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <div
            key={article.id}
            className="ultra-glass p-6 hover:shadow-xl transition-all duration-300 group"
          >
            {/* Article Header */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                {article.title}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{article.timeAgo}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{article.author}</span>
                </div>
              </div>
            </div>

            {/* Article Image */}
            {article.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Article Description */}
            <p className="text-sm text-gray-400 mb-4 line-clamp-3">
              {article.description}
            </p>

            {/* Categories */}
            {article.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.categories.slice(0, 3).map((cat, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Article Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-500">Source: {article.source}</span>
                {(article.upvotes > 0 || article.downvotes > 0) && (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <span>👍 {article.upvotes}</span>
                    <span>👎 {article.downvotes}</span>
                  </div>
                )}
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Read More</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* No Articles Message */}
      {articles.length === 0 && !loading && (
        <div className="ultra-glass p-12 text-center">
          <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            No articles found. Try adjusting your filters.
          </p>
        </div>
      )}
    </div>
  );
}
