import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Newspaper, Play, Pause, Clock, Flame, Zap, AlertCircle, LineChart, Search, Filter } from 'lucide-react';

export default function NewsDriverStockDashboard() {
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [qualifyingStocks, setQualifyingStocks] = useState([]);
  const [newsWithTechnicals, setNewsWithTechnicals] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningCriteria, setScreeningCriteria] = useState({
    minPrice: 10,
    maxPrice: 500,
    minMarketCap: 100,
    maxMarketCap: 100000,
    minVolume: 1000,
    exchanges: ['XNYS', 'XNAS', 'XNGS']
  });
  const syncIntervalRef = useRef(null);

  // Calculate news-driven score using backend technical analysis
  const calculateNewsScore = (stock, technicalAnalysis, newsData) => {
    let score = 50; // Base score
    
    if (technicalAnalysis) {
      // Technical indicators (40% weight)
      const rsiScore = technicalAnalysis.rsi > 70 ? 20 : technicalAnalysis.rsi < 30 ? -15 : 
                      (technicalAnalysis.rsi - 50) * 0.3;
      
      const volumeScore = technicalAnalysis.volumeSurge > 150 ? 15 : 
                         technicalAnalysis.volumeSurge > 100 ? 10 : 0;
      
      const momentumScore = technicalAnalysis.hourMomentum > 2 ? 15 : 
                           technicalAnalysis.hourMomentum > 0 ? 10 : 
                           technicalAnalysis.hourMomentum < -2 ? -10 : 0;
      
      const vwapScore = technicalAnalysis.priceVsVWAP > 1 ? 10 : 
                       technicalAnalysis.priceVsVWAP > 0 ? 5 : -5;
      
      const buyingPressureScore = technicalAnalysis.buyingPressure?.score ? 
                                 (technicalAnalysis.buyingPressure.score - 50) * 0.2 : 0;
      
      score += (rsiScore + volumeScore + momentumScore + vwapScore + buyingPressureScore) * 0.4;
    }
    
    // News sentiment (60% weight) - only positive news from backend
    if (newsData && newsData.length > 0) {
      const newsImpact = newsData.length * 8; // Each positive news adds 8 points
      const recencyBonus = newsData.filter(news => {
        const age = Date.now() - new Date(news.time).getTime();
        return age < 10 * 60 * 1000; // Last 10 minutes
      }).length * 5; // Recent news gets bonus
      
      score += (newsImpact + recencyBonus) * 0.6;
    }
    
    // Price change boost
    if (technicalAnalysis?.dayChangePercent) {
      score += technicalAnalysis.dayChangePercent * 2;
    }
    
    // Ensure realistic distribution (5-95 range)
    return Math.round(Math.max(5, Math.min(95, score)));
  };

  // Get API base URL based on environment
  const getApiBaseUrl = () => {
    // In development, Vite runs on 3000, Express on 3001
    // In production, Express serves everything on 3000
    return window.location.hostname === 'localhost' && window.location.port === '3000' 
      ? 'http://localhost:3001' 
      : '';
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
      setQualifyingStocks(data.qualifyingStocks || []);
      
      return data.qualifyingStocks || [];
    } catch (err) {
      setError(`Screening error: ${err.message}`);
      return [];
    }
  };

  // Get news with technical analysis using backend API
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

  // Main sync function
  const syncData = async () => {
    try {
      setError(null);
      
      // 1. Screen qualifying stocks
      const stocks = await screenStocks();
      if (stocks.length === 0) {
        setTopMovers([]);
        setLastSyncTime(new Date());
        return;
      }
      
      // 2. Get tickers for news analysis
      const tickers = stocks.map(s => s.ticker);
      
      // 3. Get news with technical analysis
      const newsData = await getNewsWithTechnicals(tickers);
      setNewsWithTechnicals(newsData);
      
      // 4. Calculate scores and create top movers
      const stocksWithScores = stocks.map(stock => {
        const stockNews = newsData.filter(news => news.ticker === stock.ticker);
        const technicalAnalysis = stockNews.length > 0 ? stockNews[0].technicalAnalysis : null;
        
        const newsScore = calculateNewsScore(stock, technicalAnalysis, stockNews);
        
        return {
          ...stock,
          newsScore,
          technicalAnalysis,
          relatedNews: stockNews,
          chartData: generateMockChartData(stock.price, technicalAnalysis?.dayChangePercent || 0)
        };
      });
      
      // Sort by news score and get top 5
      const top5 = stocksWithScores
        .sort((a, b) => b.newsScore - a.newsScore)
        .slice(0, 5);
      
      setTopMovers(top5);
      setLastSyncTime(new Date());
      
    } catch (err) {
      setError(`Sync error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock chart data for visualization
  const generateMockChartData = (currentPrice, changePercent) => {
    const points = [];
    const startPrice = currentPrice / (1 + (changePercent || 0) / 100);
    
    for (let i = 0; i < 20; i++) {
      const progress = i / 19;
      const trend = startPrice + (currentPrice - startPrice) * progress;
      const volatility = (Math.random() - 0.5) * currentPrice * 0.02;
      points.push(Math.max(0, trend + volatility));
    }
    return points;
  };

  // Toggle sync
  const toggleSync = () => {
    if (isDataSyncing) {
      clearInterval(syncIntervalRef.current);
      setIsDataSyncing(false);
    } else {
      setIsDataSyncing(true);
      syncData(); // Initial sync
      syncIntervalRef.current = setInterval(syncData, 60000); // Every minute
    }
  };

  // Initial load
  useEffect(() => {
    syncData();
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Mini chart component
  const MiniChart = ({ data, positive }) => (
    <div className="w-full h-16 relative">
      <svg className="w-full h-full" viewBox="0 0 200 64">
        <defs>
          <linearGradient id={`gradient-${positive ? 'green' : 'red'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        
        {data.length > 1 && (
          <>
            <path
              d={`M 0,${64 - ((data[0] - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 48} ${data.map((point, i) => 
                `L ${(i / (data.length - 1)) * 200},${64 - ((point - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 48}`
              ).join(' ')}`}
              fill="none"
              stroke={positive ? "#10b981" : "#ef4444"}
              strokeWidth="2"
            />
            <path
              d={`M 0,64 L 0,${64 - ((data[0] - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 48} ${data.map((point, i) => 
                `L ${(i / (data.length - 1)) * 200},${64 - ((point - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * 48}`
              ).join(' ')} L 200,64 Z`}
              fill={`url(#gradient-${positive ? 'green' : 'red'})`}
            />
          </>
        )}
      </svg>
    </div>
  );

  // Heat map color based on score
  const getHeatColor = (score) => {
    if (score >= 80) return 'from-red-500 to-orange-400'; // Hot
    if (score >= 70) return 'from-orange-400 to-yellow-400'; // Warm  
    if (score >= 60) return 'from-yellow-400 to-green-400'; // Neutral-warm
    if (score >= 40) return 'from-blue-400 to-cyan-400'; // Cool
    if (score >= 30) return 'from-cyan-400 to-blue-500'; // Cold
    return 'from-blue-600 to-purple-600'; // Very cold
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              Neural Stock Radar
            </h1>
            <p className="text-gray-400">Real-time positive sentiment news + technical analysis</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">
                {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            
            <button
              onClick={toggleSync}
              disabled={loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDataSyncing 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : isDataSyncing ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{loading ? 'Loading...' : isDataSyncing ? 'Stop' : 'Start'} Sync</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">Error: {error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Screening Criteria */}
      <div className="mb-6 bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-blue-400" />
          Stock Screening Criteria
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Min Price ($)</label>
            <input
              type="number"
              value={screeningCriteria.minPrice}
              onChange={(e) => setScreeningCriteria(prev => ({ ...prev, minPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Price ($)</label>
            <input
              type="number"
              value={screeningCriteria.maxPrice}
              onChange={(e) => setScreeningCriteria(prev => ({ ...prev, maxPrice: parseFloat(e.target.value) || 1000 }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Min Volume (K)</label>
            <input
              type="number"
              value={screeningCriteria.minVolume}
              onChange={(e) => setScreeningCriteria(prev => ({ ...prev, minVolume: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Min Market Cap (M)</label>
            <input
              type="number"
              value={screeningCriteria.minMarketCap}
              onChange={(e) => setScreeningCriteria(prev => ({ ...prev, minMarketCap: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={syncData}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4 inline mr-2" />
              Re-screen
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{qualifyingStocks.length}</div>
          <div className="text-gray-400">Qualifying Stocks</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{newsWithTechnicals.length}</div>
          <div className="text-gray-400">Positive News Items</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{topMovers.length}</div>
          <div className="text-gray-400">Top Ranked Movers</div>
        </div>
      </div>

      {/* Stock Charts */}
      {topMovers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <LineChart className="w-5 h-5 mr-2 text-blue-400" />
            Live Charts - Top News-Driven Stocks
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topMovers.map((stock) => (
              <div key={stock.ticker} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-blue-400">{stock.ticker}</h3>
                    <p className="text-xs text-gray-400">${stock.price}</p>
                  </div>
                  <div className={`text-right ${(stock.technicalAnalysis?.dayChangePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(stock.technicalAnalysis?.dayChangePercent || 0) >= 0 ? 
                      <TrendingUp className="w-4 h-4" /> : 
                      <TrendingDown className="w-4 h-4" />
                    }
                    <p className="text-xs">{(stock.technicalAnalysis?.dayChangePercent || 0).toFixed(2)}%</p>
                  </div>
                </div>
                
                <MiniChart 
                  data={stock.chartData || []} 
                  positive={(stock.technicalAnalysis?.dayChangePercent || 0) >= 0} 
                />
                
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Vol: {stock.volume}K</span>
                  <span className="text-purple-400">Score: {stock.newsScore}</span>
                </div>
                
                {stock.technicalAnalysis && (
                  <div className="mt-2 text-xs text-gray-400">
                    RSI: {stock.technicalAnalysis.rsi} | VWAP: {stock.technicalAnalysis.priceVsVWAP}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Heat Map */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Flame className="w-5 h-5 mr-2 text-orange-400" />
          Top 5 News-Driven Heat Map
        </h2>
        
        {topMovers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-gray-400">No qualifying stocks found with current criteria</div>
            <button
              onClick={syncData}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              Try Different Criteria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {topMovers.slice(0, 5).map((stock, index) => (
              <div 
                key={stock.ticker} 
                className={`relative overflow-hidden rounded-lg p-6 bg-gradient-to-br ${getHeatColor(stock.newsScore)} transform hover:scale-105 transition-all duration-300`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-white">#{index + 1}</span>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">{stock.ticker}</h3>
                    <p className="text-white/80 text-sm">${stock.price}</p>
                    <p className="text-white/60 text-xs">{stock.name}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-sm">News Score</span>
                      <span className="text-2xl font-bold text-white">{stock.newsScore}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-sm">Change</span>
                      <span className="text-white font-semibold">
                        {(stock.technicalAnalysis?.dayChangePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-sm">Volume</span>
                      <span className="text-white font-semibold">{stock.volume}K</span>
                    </div>
                    
                    {stock.relatedNews.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">News Items</span>
                        <span className="text-white font-semibold">{stock.relatedNews.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {stock.relatedNews && stock.relatedNews.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <Newspaper className="w-4 h-4 text-white" />
                        <span className="text-white/80 text-xs">Latest Positive News</span>
                      </div>
                      <p className="text-white text-xs line-clamp-2">
                        {stock.relatedNews[0].title}
                      </p>
                    </div>
                  )}
                  
                  {stock.technicalAnalysis && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <div className="text-white/80 text-xs">
                        RSI: {stock.technicalAnalysis.rsi} | Vol Surge: {stock.technicalAnalysis.volumeSurge}%
                      </div>
                      {stock.technicalAnalysis.signals && stock.technicalAnalysis.signals.length > 0 && (
                        <div className="text-white/60 text-xs mt-1">
                          {stock.technicalAnalysis.signals[0].message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}