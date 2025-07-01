import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, TrendingUp, DollarSign, Activity, Zap, Globe, Filter } from 'lucide-react';

function StockNewsRadar() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [criteria, setCriteria] = useState({
    minPrice: 1.00,
    maxPrice: 8.00,
    minMarketCap: 100,
    maxMarketCap: 3000,
    minVolume: 500,
    exchanges: ['NASDAQ', 'NYSE'],
    sectors: 'all'
  });
  const [qualifyingStocks, setQualifyingStocks] = useState([]);
  const [newsStream, setNewsStream] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalScanned: 0,
    newsFound: 0,
    avgSentiment: 0
  });
  const newsEndRef = useRef(null);

  const availableExchanges = [
    { code: 'NASDAQ', name: 'NASDAQ', tradeable: true },
    { code: 'NYSE', name: 'NYSE', tradeable: true },
    { code: 'NYSEARCA', name: 'NYSE Arca', tradeable: true },
    { code: 'BATS', name: 'BATS', tradeable: true },
    { code: 'OTC', name: 'OTC Markets', tradeable: false },
    { code: 'PINK', name: 'Pink Sheets', tradeable: false }
  ];

  useEffect(() => {
    newsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [newsStream]);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      checkForNews();
    }, 60000);

    checkForNews();
    return () => clearInterval(interval);
  }, [isMonitoring, qualifyingStocks]);

  const findQualifyingStocks = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Screening stocks with real data...');
      
      const response = await fetch('/api/stocks/screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          minPrice: criteria.minPrice,
          maxPrice: criteria.maxPrice,
          minMarketCap: criteria.minMarketCap,
          maxMarketCap: criteria.maxMarketCap,
          minVolume: criteria.minVolume,
          exchanges: criteria.exchanges
        })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Real stocks found:', data.qualifyingStocks.length);
      
      setQualifyingStocks(data.qualifyingStocks || []);
      setStats(prev => ({
        ...prev,
        totalScanned: data.totalScanned || 0
      }));
      
    } catch (error) {
      console.error('❌ Error finding real stocks:', error);
      // Fallback to empty array on error
      setQualifyingStocks([]);
      setStats(prev => ({
        ...prev,
        totalScanned: 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNews = async () => {
    if (qualifyingStocks.length === 0) return;

    try {
      console.log(`📰 Checking real news + technicals for ${qualifyingStocks.length} stocks...`);
      
      const tickers = qualifyingStocks.map(stock => stock.ticker);
      
      const response = await fetch('/api/news/check-with-technicals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tickers })
      });
      
      if (!response.ok) {
        throw new Error(`News API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📈 Real positive news + technicals found:', data.news.length);
      
      if (data.news && data.news.length > 0) {
        // Add new news to the top of the stream
        setNewsStream(prev => [...data.news, ...prev].slice(0, 50));
        
        setStats(prev => ({
          ...prev,
          newsFound: prev.newsFound + data.news.length,
          avgSentiment: 1.0 // All positive since we filter for positive only
        }));
        
        console.log(`✅ Added ${data.news.length} positive news + technical analysis to stream`);
      }
      
    } catch (error) {
      console.error('❌ Error checking real news + technicals:', error);
    }
  };

  const startMonitoring = () => {
    if (qualifyingStocks.length === 0) {
      findQualifyingStocks().then(() => {
        setIsMonitoring(true);
      });
    } else {
      setIsMonitoring(true);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatMarketCap = (cap) => {
    if (cap >= 1000) return `$${(cap/1000).toFixed(1)}B`;
    return `$${cap}M`;
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'positive': return 'text-emerald';
      case 'negative': return 'text-rose';
      default: return 'text-amber';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Technology': return <Zap className="w-4 h-4" />;
      case 'Earnings': return <TrendingUp className="w-4 h-4" />;
      case 'Business': return <DollarSign className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const TechnicalAnalysisCard = ({ analysis, ticker }) => {
    if (!analysis) return null;
    
    const getBuyingPressureColor = (score) => {
      if (score >= 70) return 'text-emerald';
      if (score >= 50) return 'text-amber';
      return 'text-rose';
    };
    
    const getSignalStrengthColor = (strength) => {
      switch(strength) {
        case 'high': return 'bg-emerald/20 text-emerald border-emerald/30';
        case 'medium': return 'bg-amber/20 text-amber border-amber/30';
        default: return 'bg-rose/20 text-rose border-rose/30';
      }
    };
    
    return (
      <div className="ultra-glass p-4 mt-3 space-y-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-electric" />
          <span className="text-electric font-semibold text-sm">TECHNICAL ANALYSIS</span>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="text-center">
            <div className="text-primary font-bold">${analysis.currentPrice?.toFixed(2)}</div>
            <div className="text-muted">Current</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${analysis.hourMomentum > 0 ? 'text-emerald' : 'text-rose'}`}>
              {analysis.hourMomentum?.toFixed(1)}%
            </div>
            <div className="text-muted">1H Momentum</div>
          </div>
          <div className="text-center">
            <div className="text-violet font-bold">{analysis.volumeSurge?.toFixed(0)}%</div>
            <div className="text-muted">Volume Surge</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${getBuyingPressureColor(analysis.buyingPressure?.score)}`}>
              {analysis.buyingPressure?.score || 0}
            </div>
            <div className="text-muted">Buy Pressure</div>
          </div>
        </div>
        
        {/* Technical Signals */}
        {analysis.signals && analysis.signals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-electric font-medium">SIGNALS:</div>
            <div className="flex flex-wrap gap-1">
              {analysis.signals.slice(0, 3).map((signal, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-xs border ${getSignalStrengthColor(signal.strength)}`}
                >
                  {signal.message}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Buying Pressure Details */}
        {analysis.buyingPressure?.signals && analysis.buyingPressure.signals.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-emerald font-medium">BUYING PRESSURE:</div>
            {analysis.buyingPressure.signals.slice(0, 2).map((signal, idx) => (
              <div key={idx} className="text-xs text-secondary">• {signal}</div>
            ))}
          </div>
        )}
        
        {/* Additional Metrics */}
        <div className="flex justify-between text-xs text-muted border-t border-white/5 pt-2">
          <span>RSI: <span className="text-secondary">{analysis.rsi}</span></span>
          <span>vs VWAP: <span className={analysis.priceVsVWAP > 0 ? 'text-emerald' : 'text-rose'}>
            {analysis.priceVsVWAP > 0 ? '+' : ''}{analysis.priceVsVWAP}%
          </span></span>
          <span>Vol: <span className="text-secondary">{(analysis.currentVolume / 1000).toFixed(0)}K</span></span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-electric to-violet rounded-2xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-electric via-violet to-emerald bg-clip-text text-transparent">
              Neural Stock Radar
            </h1>
          </div>
          <p className="text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
            Advanced momentum detection system powered by real-time sentiment analysis 
            and institutional-grade market data intelligence
          </p>
          
          {/* Live Stats */}
          <div className="flex justify-center space-x-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-electric">{stats.totalScanned}</div>
              <div className="text-sm text-muted">Stocks Monitored</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald">{stats.newsFound}</div>
              <div className="text-sm text-muted">News Events</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-violet">{(stats.avgSentiment * 100).toFixed(0)}%</div>
              <div className="text-sm text-muted">Avg Sentiment</div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="ultra-glass p-8">
          <div className="flex items-center space-x-4 mb-8">
            <Filter className="w-6 h-6 text-electric" />
            <h2 className="text-2xl font-bold text-primary">Screening Parameters</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            
            {/* Price Range */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-electric uppercase tracking-wider">
                Price Range
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-muted text-sm w-8">Min</span>
                  <input
                    type="number"
                    step="0.01"
                    value={criteria.minPrice}
                    onChange={(e) => setCriteria(prev => ({...prev, minPrice: parseFloat(e.target.value)}))}
                    className="neo-input flex-1"
                    placeholder="1.00"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-muted text-sm w-8">Max</span>
                  <input
                    type="number"
                    step="0.01"
                    value={criteria.maxPrice}
                    onChange={(e) => setCriteria(prev => ({...prev, maxPrice: parseFloat(e.target.value)}))}
                    className="neo-input flex-1"
                    placeholder="8.00"
                  />
                </div>
              </div>
            </div>

            {/* Market Cap */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-violet uppercase tracking-wider">
                Market Cap (M)
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-muted text-sm w-8">Min</span>
                  <input
                    type="number"
                    value={criteria.minMarketCap}
                    onChange={(e) => setCriteria(prev => ({...prev, minMarketCap: parseInt(e.target.value)}))}
                    className="neo-input flex-1"
                    placeholder="100"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-muted text-sm w-8">Max</span>
                  <input
                    type="number"
                    value={criteria.maxMarketCap}
                    onChange={(e) => setCriteria(prev => ({...prev, maxMarketCap: parseInt(e.target.value)}))}
                    className="neo-input flex-1"
                    placeholder="3000"
                  />
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-emerald uppercase tracking-wider">
                Min Volume (K)
              </label>
              <input
                type="number"
                value={criteria.minVolume}
                onChange={(e) => setCriteria(prev => ({...prev, minVolume: parseInt(e.target.value)}))}
                className="neo-input w-full"
                placeholder="500"
              />
            </div>

            {/* Exchanges */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-amber uppercase tracking-wider">
                Exchanges
              </label>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {availableExchanges.filter(ex => ex.tradeable).map(exchange => (
                  <label key={exchange.code} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={criteria.exchanges.includes(exchange.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCriteria(prev => ({
                            ...prev, 
                            exchanges: [...prev.exchanges, exchange.code]
                          }));
                        } else {
                          setCriteria(prev => ({
                            ...prev,
                            exchanges: prev.exchanges.filter(ex => ex !== exchange.code)
                          }));
                        }
                      }}
                      className="neo-checkbox"
                    />
                    <span className="text-secondary group-hover:text-primary transition-colors">
                      {exchange.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Control Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {!isMonitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={isLoading}
                  className="neo-button flex items-center space-x-3 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  <span>{isLoading ? 'Scanning Markets...' : 'Start Neural Scan'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsMonitoring(false)}
                  className="neo-button flex items-center space-x-3"
                  style={{
                    background: 'linear-gradient(135deg, #F43F5E, #EF4444)'
                  }}
                >
                  <Pause className="w-5 h-5" />
                  <span>Stop Monitoring</span>
                </button>
              )}
            </div>
            
            {qualifyingStocks.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className={`neo-status ${isMonitoring ? '' : 'inactive'}`}></div>
                <span className="text-secondary">
                  Neural network monitoring <span className="text-electric font-bold text-lg">{qualifyingStocks.length}</span> targets
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Qualifying Stocks Grid */}
        {qualifyingStocks.length > 0 && (
          <div className="ultra-glass p-8">
            <div className="flex items-center space-x-4 mb-6">
              <Globe className="w-6 h-6 text-violet" />
              <h3 className="text-2xl font-bold text-primary">
                Active Targets ({qualifyingStocks.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {qualifyingStocks.map(stock => (
                <div key={stock.ticker} className="neo-stock-tag">
                  <div className="flex flex-col">
                    <span className="font-bold text-primary text-lg">{stock.ticker}</span>
                    <span className="text-secondary text-sm">${stock.price}</span>
                    <span className="text-muted text-xs">{formatMarketCap(stock.marketCap)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live News Terminal */}
        <div className="neo-terminal">
          <div className="neo-terminal-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`neo-status ${isMonitoring ? '' : 'inactive'}`}></div>
                <span className="text-electric font-bold text-lg">NEURAL FEED</span>
                {isMonitoring && (
                  <span className="text-emerald text-sm font-mono">ACTIVE_SCAN</span>
                )}
              </div>
              <div className="text-muted text-sm font-mono">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="neo-terminal-content">
            {newsStream.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                {isMonitoring ? (
                  <>
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-electric/30 border-t-electric rounded-full animate-spin"></div>
                      <Activity className="w-8 h-8 text-electric absolute top-4 left-4" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-primary">Neural networks are scanning...</p>
                      <p className="text-sm text-secondary">Monitoring {qualifyingStocks.length} targets across multiple data streams</p>
                      <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-muted">
                        <span>• Real-time sentiment analysis</span>
                        <span>• Market momentum detection</span>
                        <span>• Volume spike monitoring</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Activity className="w-16 h-16 text-muted mx-auto mb-4" />
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-primary">Neural Feed Offline</p>
                      <p className="text-sm text-secondary">Configure parameters and start monitoring to see live market intelligence</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {newsStream.map((news, index) => (
                  <div key={index} className="neo-news-item">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <span className="text-electric font-mono text-sm font-bold">
                          {formatTime(news.time)}
                        </span>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(news.category)}
                          <span className="text-violet font-bold px-3 py-1 bg-violet/10 rounded-lg">
                            {news.ticker}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald text-xs font-medium px-2 py-1 rounded bg-emerald/10">
                          POSITIVE
                        </span>
                        {news.technicalAnalysis && (
                          <span className="text-electric text-xs font-medium px-2 py-1 rounded bg-electric/10">
                            TECHNICAL ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="text-primary font-medium mb-1 leading-relaxed">
                      {news.title}
                    </h4>
                    {news.sentimentReasoning && (
                      <p className="text-secondary text-sm mb-2 italic">
                        "{news.sentimentReasoning}"
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-muted mb-2">
                      <span>Source: <span className="text-secondary font-medium">{news.source}</span></span>
                      <span>Category: <span className="text-secondary">{news.category}</span></span>
                      {news.url && (
                        <a 
                          href={news.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-electric hover:text-violet transition-colors"
                        >
                          Read Full Article →
                        </a>
                      )}
                    </div>
                    
                    {/* Technical Analysis Card */}
                    <TechnicalAnalysisCard 
                      analysis={news.technicalAnalysis} 
                      ticker={news.ticker} 
                    />
                  </div>
                ))}
                <div ref={newsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockNewsRadar;