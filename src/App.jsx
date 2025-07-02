import { useState, useEffect, useRef } from 'react';
import { Search, Monitor } from 'lucide-react';

// Import components from the components folder
import Header from './components/Header';
import RankingWeights from './components/RankingWeights';
import StockScreener from './components/StockScreener';
import StockTable from './components/StockTable';
import MonitoringDashboard from './components/MonitoringDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('screener'); // 'screener' or 'monitoring'
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [monitoringList, setMonitoringList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rankingMetrics, setRankingMetrics] = useState({
    technicalScore: 0.2,    // Lower weight - news is more important for big moves
    sentimentScore: 0.5,    // Higher weight - news sentiment drives big movements
    volumeScore: 0.2,       // Moderate weight - volume confirms momentum
    momentumScore: 0.1      // Lower weight - we want early detection, not late momentum
  });
  const [screeningCriteria, setScreeningCriteria] = useState({
    minPrice: 1,            // Lower prices for bigger % movements
    maxPrice: 8,           // Cap at $8 for optimal volatility
    minMarketCap: '',      // Leave blank - small caps can move more
    maxMarketCap: '',      // Leave blank - don't limit upside
    minVolume: 500,        // 500K minimum for liquidity
    maxVolume: null,       // No max - high volume is good
    exchanges: ['XNYS', 'XNAS'],
    industries: []
  });
  const [selectedStocks, setSelectedStocks] = useState(new Set());
  const syncIntervalRef = useRef(null);

  // Get API base URL based on environment
  const getApiBaseUrl = () => {
    return window.location.hostname === 'localhost' && window.location.port === '3000' 
      ? 'http://localhost:3001' 
      : '';
  };

  // Calculate overall ranking based on weighted scores and real data
  const calculateOverallRank = (stock) => {
    const { technicalScore, sentimentScore, volumeScore, momentumScore } = stock;
    const { technicalScore: tWeight, sentimentScore: sWeight, volumeScore: vWeight, momentumScore: mWeight } = rankingMetrics;
    
    return (
      technicalScore * tWeight +
      sentimentScore * sWeight +
      volumeScore * vWeight +
      momentumScore * mWeight
    );
  };

  // Enhanced scoring function optimized for news-driven breakouts
  const calculateStockScores = (stock, technicalAnalysis, newsData) => {
    // Technical Score - focus on breakout indicators
    let technicalScore = 50;
    if (technicalAnalysis) {
      // RSI - favor stocks not overbought (room to run)
      const rsiScore = technicalAnalysis.rsi > 80 ? 30 :  // Overbought - penalize
                      technicalAnalysis.rsi > 60 ? 85 :   // Strong but not overbought - ideal
                      technicalAnalysis.rsi > 40 ? 70 :   // Neutral - good
                      20; // Oversold - risky for momentum plays
      
      // VWAP - favor stocks breaking above VWAP with momentum
      const vwapScore = technicalAnalysis.priceVsVWAP > 3 ? 95 :    // Strong breakout
                       technicalAnalysis.priceVsVWAP > 1 ? 85 :     // Good momentum  
                       technicalAnalysis.priceVsVWAP > 0 ? 65 :     // Above VWAP
                       30; // Below VWAP - less likely for breakout
      
      // Volume surge - critical for news-driven moves
      const volumeComponent = technicalAnalysis.volumeSurge > 300 ? 95 :  // Massive surge
                             technicalAnalysis.volumeSurge > 200 ? 85 :   // Strong surge
                             technicalAnalysis.volumeSurge > 150 ? 75 :   // Good surge
                             technicalAnalysis.volumeSurge > 100 ? 60 :   // Moderate
                             40; // Low volume - less likely to move
      
      // Buying pressure - shows institutional interest
      const pressureScore = technicalAnalysis.buyingPressure?.score || 50;
      
      technicalScore = (rsiScore * 0.25 + vwapScore * 0.25 + volumeComponent * 0.35 + pressureScore * 0.15);
    }

    // Sentiment Score - heavily weighted for news-driven moves
    let sentimentScore = 30; // Start lower - no news is bad for our use case
    if (newsData && newsData.length > 0) {
      const positiveNews = newsData.filter(news => news.sentiment === 'positive').length;
      const totalNews = newsData.length;
      
      // Recent news gets massive boost (last 15 minutes)
      const veryRecentNews = newsData.filter(news => {
        const age = Date.now() - new Date(news.time).getTime();
        return age < 15 * 60 * 1000; // Last 15 minutes
      }).length;
      
      // Breaking news boost (last 5 minutes)
      const breakingNews = newsData.filter(news => {
        const age = Date.now() - new Date(news.time).getTime();
        return age < 5 * 60 * 1000; // Last 5 minutes
      }).length;
      
      sentimentScore = 40 + (positiveNews / totalNews) * 30 + 
                      veryRecentNews * 15 + breakingNews * 20;
      sentimentScore = Math.min(98, sentimentScore); // Cap at 98
    }

    // Volume Score - confirms news impact
    let volumeScore = 40;
    if (technicalAnalysis?.volumeSurge) {
      // Exponential scoring for volume - big moves need big volume
      volumeScore = technicalAnalysis.volumeSurge > 500 ? 95 :
                   technicalAnalysis.volumeSurge > 300 ? 90 :
                   technicalAnalysis.volumeSurge > 200 ? 80 :
                   technicalAnalysis.volumeSurge > 150 ? 70 :
                   technicalAnalysis.volumeSurge > 100 ? 60 : 40;
    }

    // Momentum Score - early detection focus
    let momentumScore = 50;
    if (technicalAnalysis?.hourMomentum !== undefined) {
      // Favor early momentum, not late-stage moves
      momentumScore = technicalAnalysis.hourMomentum > 8 ? 75 :  // Strong but not parabolic
                     technicalAnalysis.hourMomentum > 4 ? 85 :   // Ideal momentum
                     technicalAnalysis.hourMomentum > 1 ? 70 :   // Early momentum
                     technicalAnalysis.hourMomentum > -2 ? 55 :  // Neutral
                     30; // Negative momentum
    }

    return {
      technicalScore: Math.round(Math.max(10, Math.min(95, technicalScore))),
      sentimentScore: Math.round(Math.max(10, Math.min(95, sentimentScore))),
      volumeScore: Math.round(Math.max(10, Math.min(95, volumeScore))),
      momentumScore: Math.round(Math.max(10, Math.min(95, momentumScore)))
    };
  };

  // Screen stocks using backend API
  const screenStocks = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`${getApiBaseUrl()}/api/stocks/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(screeningCriteria)
      });
      
      if (!response.ok) throw new Error(`Screening failed: ${response.status}`);
      
      const data = await response.json();
      return data.qualifyingStocks || [];
    } catch (err) {
      setError(`Screening error: ${err.message}`);
      return [];
    }
  };

  // Get news with technical analysis
  const getNewsWithTechnicals = async (tickers) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/news/check-with-technicals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      
      if (!response.ok) throw new Error(`News analysis failed: ${response.status}`);
      
      const data = await response.json();
      return data.news || [];
    } catch (err) {
      console.error('News analysis error:', err);
      return [];
    }
  };

  // Enhanced sync function that combines screening and news
  const syncTechnicalData = async () => {
    try {
      setLastSyncTime(new Date());
      
      // 1. Screen for qualifying stocks
      const qualifyingStocks = await screenStocks();
      if (qualifyingStocks.length === 0) {
        setStocks([]);
        return;
      }

      // 2. Get news with technical analysis for these stocks
      const tickers = qualifyingStocks.map(s => s.ticker);
      const newsData = await getNewsWithTechnicals(tickers);

      // 3. Enhance stocks with scores and technical data
      const enhancedStocks = qualifyingStocks.map(stock => {
        // Find related news for this stock
        const stockNews = newsData.filter(news => news.ticker === stock.ticker);
        const technicalAnalysis = stockNews.length > 0 ? stockNews[0].technicalAnalysis : null;
        
        // Calculate scores
        const scores = calculateStockScores(stock, technicalAnalysis, stockNews);
        
        // Get latest news info
        const latestNews = stockNews[0];
        const newsAge = latestNews ? Math.floor((Date.now() - new Date(latestNews.time).getTime()) / 60000) : null;
        
        return {
          ...stock,
          ...scores,
          // Technical indicators
          rsi: technicalAnalysis?.rsi || 50,
          macd: technicalAnalysis?.priceVsVWAP || 0,
          movingAvg20: technicalAnalysis?.sma20 || stock.price,
          movingAvg50: technicalAnalysis?.sma50 || stock.price,
          // News info
          lastNewsTime: newsAge ? `${newsAge}min ago` : 'No recent news',
          newsSentiment: latestNews?.sentiment || 'neutral',
          relatedNews: stockNews,
          technicalAnalysis
        };
      });

      setStocks(enhancedStocks);
      
    } catch (err) {
      setError(`Sync error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start minute-by-minute data sync
  const startDataSync = () => {
    setIsDataSyncing(true);
    syncTechnicalData(); // Initial sync
    
    syncIntervalRef.current = setInterval(() => {
      syncTechnicalData();
    }, 60000); // Every minute
  };

  // Stop data sync
  const stopDataSync = () => {
    setIsDataSyncing(false);
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
  };

  // FIXED: Initialize without automatic screening - let user choose when to start
  useEffect(() => {
    // Don't auto-screen on load - wait for user action
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // All filtering is now done at the backend level, so just use the stocks directly
  const rankedStocks = stocks
    .map(stock => ({
      ...stock,
      overallScore: calculateOverallRank(stock)
    }))
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((stock, index) => ({
      ...stock,
      overallRank: index + 1
    }));

  // Add selected stocks to monitoring list
  const addToMonitoring = () => {
    const stocksToAdd = rankedStocks.filter(stock => selectedStocks.has(stock.ticker));
    setMonitoringList(prev => {
      const existing = new Set(prev.map(s => s.ticker));
      const newStocks = stocksToAdd.filter(s => !existing.has(s.ticker));
      return [...prev, ...newStocks];
    });
    setSelectedStocks(new Set());
  };

  // Remove from monitoring list
  const removeFromMonitoring = (ticker) => {
    setMonitoringList(prev => prev.filter(stock => stock.ticker !== ticker));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white p-4">
      {/* Header Component */}
      <Header 
        lastSyncTime={lastSyncTime}
        stocksCount={stocks.length}
        error={error}
      />

      {/* Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setCurrentView('screener')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            currentView === 'screener'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Screener</span>
        </button>
        
        <button
          onClick={() => setCurrentView('monitoring')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            currentView === 'monitoring'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Monitoring ({monitoringList.length})</span>
        </button>
      </div>

      {currentView === 'screener' && (
        <div className="space-y-6">
          {/* Ranking Weights Component */}
          <RankingWeights 
            rankingMetrics={rankingMetrics}
            setRankingMetrics={setRankingMetrics}
          />

          {/* Stock Screener Component */}
          <StockScreener
            screeningCriteria={screeningCriteria}
            setScreeningCriteria={setScreeningCriteria}
            syncTechnicalData={syncTechnicalData}
            loading={loading}
            isDataSyncing={isDataSyncing}
            startDataSync={startDataSync}
            stopDataSync={stopDataSync}
          />

          {/* Stock Table Component */}
          <StockTable
            rankedStocks={rankedStocks}
            selectedStocks={selectedStocks}
            setSelectedStocks={setSelectedStocks}
            addToMonitoring={addToMonitoring}
          />
        </div>
      )}

      {currentView === 'monitoring' && (
        <MonitoringDashboard
          monitoringList={monitoringList}
          removeFromMonitoring={removeFromMonitoring}
          setCurrentView={setCurrentView}
        />
      )}
    </div>
  );
}