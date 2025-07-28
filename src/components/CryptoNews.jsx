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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// CryptoCompare News API Configuration
const CRYPTOCOMPARE_NEWS_URL =
  "https://min-api.cryptocompare.com/data/v2/news/";

// CoinDesk API Configuration
const COINDESK_API_KEY = import.meta.env.VITE_COINDESK_API_KEY;
const COINDESK_BASE_URL = "https://data-api.coindesk.com/news/v1/article/list";

export default function CryptoNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [feeds, setFeeds] = useState([]); // Available news feeds
  const [selectedFeed, setSelectedFeed] = useState("all");
  const [expandedArticles, setExpandedArticles] = useState(new Set());

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

  // Toggle expanded state for an article
  const toggleExpanded = (articleId) => {
    setExpandedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

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

  // Fetch news from CoinDesk API
  const fetchCoinDeskNews = async () => {
    if (!COINDESK_API_KEY) {
      console.log("CoinDesk API key not configured, skipping CoinDesk fetch");
      return [];
    }

    try {
      const params = new URLSearchParams({
        lang: "EN",
        limit: "50", // Reasonable limit for frontend
        api_key: COINDESK_API_KEY,
      });

      const response = await fetch(`${COINDESK_BASE_URL}?${params}`);

      if (!response.ok) {
        console.error(`CoinDesk API error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.Data || !Array.isArray(data.Data)) {
        console.error("Invalid CoinDesk response format");
        return [];
      }

      // Transform CoinDesk articles to our format
      return data.Data.map((article) => ({
        id: article.GUID || Math.random().toString(),
        title: article.TITLE || "Untitled",
        description: article.BODY ? article.BODY.substring(0, 200) + "..." : "",
        fullText: article.BODY || "", // Store full article body
        url: article.URL || "#",
        imageUrl: article.IMAGE_URL || null,
        publishedAt: article.PUBLISHED_ON || Date.now() / 1000,
        timeAgo: getTimeAgo(article.PUBLISHED_ON || Date.now() / 1000),
        author: "CoinDesk",
        categories: article.CATEGORIES || [],
        tags: article.TAGS || [],
        source: "coindesk",
      }));
    } catch (error) {
      console.error("Error fetching CoinDesk news:", error);
      return [];
    }
  };

  // Fetch news from CryptoCompare API
  const fetchCryptoCompareNews = async () => {
    try {
      // Build the URL based on selected options
      let url = CRYPTOCOMPARE_NEWS_URL;
      const params = new URLSearchParams();

      // Add category filter if specific category selected
      if (selectedCategory !== "all") {
        params.append("categories", selectedCategory);
      }

      // Add sorting - latest first
      params.append("sortOrder", "latest");

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.Data || !Array.isArray(data.Data)) {
        throw new Error("Invalid response format");
      }

      // Transform CryptoCompare articles to our format
      return data.Data.map((article) => ({
        id: article.id || Math.random().toString(),
        title: article.title || "Untitled",
        description: article.body ? article.body.substring(0, 200) + "..." : "",
        fullText: article.body || "", // Store full article body
        url: article.url || article.guid || "#",
        imageUrl: article.imageurl || null,
        publishedAt: article.published_on || Date.now() / 1000,
        timeAgo: getTimeAgo(article.published_on || Date.now() / 1000),
        author: article.source || "Unknown",
        categories: article.categories ? article.categories.split("|") : [],
        tags: article.tags ? article.tags.split("|") : [],
        source: "cryptocompare",
      }));
    } catch (error) {
      console.error("Error fetching CryptoCompare news:", error);
      throw error;
    }
  };

  // Main fetch function that combines both sources
  const fetchNews = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch from both sources in parallel
      const [coindeskArticles, cryptocompareArticles] = await Promise.all([
        fetchCoinDeskNews(),
        fetchCryptoCompareNews(),
      ]);

      // Combine articles from both sources
      let allArticles = [...coindeskArticles, ...cryptocompareArticles];

      // Filter by selected feed/source
      if (selectedFeed !== "all") {
        allArticles = allArticles.filter(
          (article) => article.source === selectedFeed
        );
      }

      // Sort by publish date (newest first)
      allArticles.sort((a, b) => b.publishedAt - a.publishedAt);

      // Remove duplicates based on title similarity
      const uniqueArticles = [];
      const seenTitles = new Set();

      for (const article of allArticles) {
        const titleKey = article.title.toLowerCase().substring(0, 50);
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          uniqueArticles.push(article);
        }
      }

      setArticles(uniqueArticles);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.message || "Failed to fetch news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch news on mount and when category/feed changes
  useEffect(() => {
    fetchNews();
  }, [selectedCategory, selectedFeed]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Loading crypto news...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ultra-glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-blue-400" />
              Crypto News Feed
            </h2>
            <p className="text-gray-400 mt-1">
              Latest updates from multiple sources
            </p>
          </div>
          <button
            onClick={fetchNews}
            disabled={refreshing}
            className="cyber-button px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Source Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedFeed("all")}
            className={`filter-button ${
              selectedFeed === "all" ? "active" : ""
            }`}
          >
            All Sources
          </button>
          {COINDESK_API_KEY && (
            <button
              onClick={() => setSelectedFeed("coindesk")}
              className={`filter-button ${
                selectedFeed === "coindesk" ? "active" : ""
              }`}
            >
              CoinDesk
            </button>
          )}
          <button
            onClick={() => setSelectedFeed("cryptocompare")}
            className={`filter-button ${
              selectedFeed === "cryptocompare" ? "active" : ""
            }`}
          >
            CryptoCompare
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`filter-button ${
                  selectedCategory === category.value ? "active" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="ultra-glass p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="grid gap-4">
        {articles.length === 0 ? (
          <div className="ultra-glass p-8 text-center">
            <p className="text-gray-400">No articles found.</p>
            <p className="text-gray-500 text-sm mt-2">
              Try selecting a different category or refreshing the feed.
            </p>
          </div>
        ) : (
          articles.map((article, index) => (
            <article
              key={article.id}
              className="news-card hover:scale-[1.02] transition-all duration-300"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex gap-4">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                        {article.description}
                      </p>

                      {/* Expandable full text section */}
                      {article.fullText && article.fullText.length > 200 && (
                        <>
                          <button
                            onClick={() => toggleExpanded(article.id)}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mb-2 transition-colors"
                          >
                            {expandedArticles.has(article.id) ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Read full article
                              </>
                            )}
                          </button>

                          {expandedArticles.has(article.id) && (
                            <div className="mt-3 p-4 bg-black/30 rounded-lg border border-gray-700/50">
                              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {article.fullText}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.timeAgo}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {article.author}
                        </span>
                        {article.categories.length > 0 && (
                          <div className="flex gap-1">
                            {article.categories.slice(0, 3).map((cat, idx) => (
                              <span key={idx} className="tag-badge">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cyber-button p-2 hover:scale-110 transition-transform"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Status */}
      {articles.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          Showing {articles.length} articles • Last updated{" "}
          {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
