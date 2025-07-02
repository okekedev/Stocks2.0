import { useState, useEffect, useRef } from 'react';
import { Search, Monitor } from 'lucide-react';

// Import components from the components folder
import Header from './components/Header';
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

  // Screen stocks using backend API with positive news monitoring
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
      return data.results || [];
    } catch (err) {
      setError(`Screening error: ${err.message}`);
      return [];
    }
  };

  // Start positive news monitoring
  const startPositiveNewsMonitoring = async (tickers) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/news/monitor/positive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers,
          hours: 2 // 2-hour window
        })
      });
      
      if (!response.ok) throw new Error(`Monitoring failed: ${response.status}`);
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Monitoring error:', err);
      return null;
    }
  };

  // Update technical data for watchlist
  const updateTechnicalData = async (tickers) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/news/update/technicals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      
      if (!response.ok) throw new Error(`Technical update failed: ${response.status}`);
      
      const data = await response.json();
      return data.updates || [];
    } catch (err) {
      console.error('Technical update error:', err);
      return [];
    }
  };

  // Check for new positive news
  const checkForNewNews = async (currentWatchlist, lastCheck) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/news/check/new-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentWatchlist: currentWatchlist.map(stock => stock.ticker),
          lastCheck 
        })
      });
      
      if (!response.ok) throw new Error(`News check failed: ${response.status}`);
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('News check error:', err);
      return null;
    }
  };

  // Enhanced sync function - initial screening and positive news monitoring
  const syncTechnicalData = async () => {
    try {
      setLastSyncTime(new Date());
      
      // 1. Screen for qualifying stocks
      console.log('Starting stock screening...');
      const qualifyingStocks = await screenStocks();
      console.log(`Found ${qualifyingStocks.length} qualifying stocks`);
      
      if (qualifyingStocks.length === 0) {
        setStocks([]);
        return;
      }

      // Update stocks list immediately with screening results
      setStocks(qualifyingStocks);

      // 2. Start positive news monitoring for screened stocks
      const tickers = qualifyingStocks.map(s => s.ticker);
      console.log('Starting positive news monitoring...');
      const monitoringData = await startPositiveNewsMonitoring(tickers);
      
      if (monitoringData && monitoringData.watchlist && monitoringData.watchlist.length > 0) {
        // Update monitoring list with stocks that have positive news
        setMonitoringList(monitoringData.watchlist);
        console.log(`Added ${monitoringData.watchlist.length} stocks with positive news to monitoring`);
      }
      
    } catch (err) {
      setError(`Sync error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start continuous monitoring system
  const startDataSync = () => {
    setIsDataSyncing(true);
    syncTechnicalData(); // Initial sync
    
    // Set up monitoring intervals
    const newsCheckInterval = setInterval(async () => {
      if (monitoringList.length > 0) {
        console.log('Checking for new positive news...');
        const newNewsData = await checkForNewNews(monitoringList, new Date(Date.now() - 5 * 60 * 1000));
        
        if (newNewsData && newNewsData.newNewsCount > 0) {
          console.log(`Found ${newNewsData.newNewsCount} new positive news articles`);
          // Could trigger re-analysis or UI updates here
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    const technicalUpdateInterval = setInterval(async () => {
      if (monitoringList.length > 0) {
        console.log('Updating technical data for watchlist...');
        const tickers = monitoringList.map(stock => stock.ticker);
        const updates = await updateTechnicalData(tickers);
        
        if (updates.length > 0) {
          // Update monitoring list with new technical data
          setMonitoringList(prev => 
            prev.map(stock => {
              const update = updates.find(u => u.ticker === stock.ticker);
              return update ? { ...stock, ...update } : stock;
            })
          );
        }
      }
    }, 60 * 1000); // Every minute
    
    // Store interval references for cleanup
    syncIntervalRef.current = {
      newsCheck: newsCheckInterval,
      technicalUpdate: technicalUpdateInterval
    };
  };

  // Stop data sync
  const stopDataSync = () => {
    setIsDataSyncing(false);
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current.newsCheck);
      clearInterval(syncIntervalRef.current.technicalUpdate);
    }
  };

  // Initialize without automatic screening - let user choose when to start
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current.newsCheck);
        clearInterval(syncIntervalRef.current.technicalUpdate);
      }
    };
  }, []);

  // Process stocks for display (backend now handles all scoring)
  const rankedStocks = stocks
    .map((stock, index) => ({
      ...stock,
      overallRank: index + 1,
      // Add display formatting
      lastNewsTime: stock.technicals?.newsCorrelation?.events?.length > 0 
        ? `${stock.technicals.newsCorrelation.events[0].minutesAgo}min ago` 
        : 'No recent news',
      newsSentiment: stock.technicals?.newsCorrelation?.events?.length > 0
        ? stock.technicals.newsCorrelation.events[0].sentimentScore > 0 ? 'positive' : 'negative'
        : 'neutral'
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