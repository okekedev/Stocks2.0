import { TrendingUp, TrendingDown, Monitor, AlertTriangle, Activity, Newspaper } from 'lucide-react';

export default function MonitoringDashboard({
  monitoringList,
  removeFromMonitoring,
  setCurrentView
}) {
  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Monitoring Dashboard</h2>
        <div className="flex items-center space-x-2 text-gray-400">
          <Activity className="w-4 h-4" />
          <span>Real-time monitoring active</span>
        </div>
      </div>

      {monitoringList.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No stocks being monitored</h3>
          <p className="text-gray-400 mb-4">Use the screener to select stocks and add them to your monitoring list.</p>
          <button
            onClick={() => setCurrentView('screener')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
          >
            Go to Screener
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monitoringList.map((stock) => (
            <div key={stock.ticker} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-400">{stock.ticker}</h3>
                  <p className="text-sm text-gray-400">{stock.name}</p>
                </div>
                <button
                  onClick={() => removeFromMonitoring(stock.ticker)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
                  <div className={`flex items-center ${(stock.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(stock.changePercent || 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    <span>${Math.abs(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Volume</div>
                  <div className="font-semibold">{formatNumber(stock.volume * 1000)}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Technical</div>
                  <div className={`font-semibold ${getScoreColor(stock.technicalScore)}`}>
                    {stock.technicalScore.toFixed(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Sentiment</div>
                  <div className={`font-semibold ${getScoreColor(stock.sentimentScore)}`}>
                    {stock.sentimentScore.toFixed(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Volume</div>
                  <div className={`font-semibold ${getScoreColor(stock.volumeScore)}`}>
                    {stock.volumeScore.toFixed(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Momentum</div>
                  <div className={`font-semibold ${getScoreColor(stock.momentumScore)}`}>
                    {stock.momentumScore.toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Newspaper className={`w-4 h-4 ${getSentimentColor(stock.newsSentiment)}`} />
                  <span className="text-gray-400">News: {stock.lastNewsTime}</span>
                </div>
                <div className={`font-semibold ${getScoreColor(stock.overallScore)}`}>
                  Rank #{stock.overallRank}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}