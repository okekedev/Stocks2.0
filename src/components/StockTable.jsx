import { TrendingUp, TrendingDown, Eye, Newspaper, Star } from 'lucide-react';

export default function StockTable({
  rankedStocks,
  selectedStocks,
  setSelectedStocks,
  addToMonitoring
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
      {/* Stock Selection and Actions */}
      {selectedStocks.size > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">
              {selectedStocks.size} stock{selectedStocks.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={addToMonitoring}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Add to Monitoring</span>
              </button>
              <button
                onClick={() => setSelectedStocks(new Set())}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStocks(new Set(rankedStocks.map(s => s.ticker)));
                      } else {
                        setSelectedStocks(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Ticker</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Change</th>
                <th className="px-4 py-3 text-left">Volume</th>
                <th className="px-4 py-3 text-left">Technical</th>
                <th className="px-4 py-3 text-left">Sentiment</th>
                <th className="px-4 py-3 text-left">Volume Score</th>
                <th className="px-4 py-3 text-left">Momentum</th>
                <th className="px-4 py-3 text-left">Overall Score</th>
                <th className="px-4 py-3 text-left">News</th>
              </tr>
            </thead>
            <tbody>
              {rankedStocks.map((stock) => (
                <tr key={stock.ticker} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedStocks.has(stock.ticker)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedStocks);
                        if (e.target.checked) {
                          newSelected.add(stock.ticker);
                        } else {
                          newSelected.delete(stock.ticker);
                        }
                        setSelectedStocks(newSelected);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {stock.overallRank <= 3 && <Star className="w-4 h-4 text-yellow-400 mr-1" />}
                      <span className="font-semibold">#{stock.overallRank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-blue-400">{stock.ticker}</div>
                      <div className="text-xs text-gray-400 truncate max-w-32">{stock.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">${stock.price.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center ${(stock.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(stock.changePercent || 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      <span>${Math.abs(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatNumber(stock.volume * 1000)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${getScoreColor(stock.technicalScore)}`}>
                      {stock.technicalScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${getScoreColor(stock.sentimentScore)}`}>
                      {stock.sentimentScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${getScoreColor(stock.volumeScore)}`}>
                      {stock.volumeScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${getScoreColor(stock.momentumScore)}`}>
                      {stock.momentumScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-lg ${getScoreColor(stock.overallScore)}`}>
                      {stock.overallScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Newspaper className={`w-4 h-4 ${getSentimentColor(stock.newsSentiment)}`} />
                      <span className="text-xs text-gray-400">{stock.lastNewsTime}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}