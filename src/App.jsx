// src/App.jsx - Updated with Authentication
import React from "react";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import { LoginPage } from "./components/LoginPage";
import { useNewsData } from "./hooks/useNewsData";
import { Header } from "./components/Header";
import { FilteringStats } from "./components/FilteringStats";
import { NewsTable } from "./components/NewsTable";
import { DividendCalendar } from "./components/DividendCalendar";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { Footer } from "./components/Footer";

// Main App Component (authenticated)
function AuthenticatedApp() {
  const {
    newsData,
    newsLoading,
    analysisLoading,
    analysisPerformed,
    error,
    refresh,
    performAnalysis,
    updateSingleAnalysis,
    persistentAnalyses,
    clearAnalyses,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sentimentFilter,
    setSentimentFilter,
  } = useNewsData();

  const handleAnalysisComplete = (ticker, result) => {
    updateSingleAnalysis(ticker, result);
  };

  const handleAnalyzeAll = async (stocks) => {
    if (stocks && stocks.length > 0) {
      await performAnalysis(stocks);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <Header lastUpdate={newsData?.timestamp} />

      <div className="container mx-auto px-4 py-6">
        {/* News Loading State */}
        {newsLoading && (
          <div className="flex items-center justify-center py-8 mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
            <span className="text-blue-400">
              Fetching latest market news...
            </span>
          </div>
        )}

        {/* AI Analysis Loading State */}
        {analysisLoading && <LoadingSpinner />}

        {/* Error State */}
        {error && <ErrorDisplay error={error} onRetry={refresh} />}

        {/* Main Content */}
        {newsData && !newsLoading && (
          <>
            {/* Stats Overview with Price and Sentiment Filters */}
            <FilteringStats
              newsData={newsData}
              loading={false}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              sentimentFilter={sentimentFilter}
              setSentimentFilter={setSentimentFilter}
            />

            {/* News Table */}
            <NewsTable
              stocks={newsData.stocks}
              allArticles={newsData.articles}
              onAnalyzeAll={handleAnalyzeAll}
              persistentAnalyses={persistentAnalyses}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* Dividend Calendar */}
            <DividendCalendar />
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Loading Component
function AppLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <div className="text-white text-lg">Loading Stocks2...</div>
        <div className="text-gray-400 text-sm mt-2">
          Initializing authentication
        </div>
      </div>
    </div>
  );
}

// App Router Component
function AppRouter() {
  const { isAuthenticated, isLoading, loginLoading, login } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <AppLoading />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} isLoading={loginLoading} />;
  }

  // Show main app if authenticated
  return <AuthenticatedApp />;
}

// Root App Component
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
