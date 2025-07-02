import { BarChart3 } from 'lucide-react';

export default function RankingWeights({ 
  rankingMetrics, 
  setRankingMetrics 
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
        Algorithmic Ranking Weights
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(rankingMetrics).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium text-gray-300 capitalize">
              {key.replace('Score', ' Score')}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={value}
              onChange={(e) => setRankingMetrics(prev => ({
                ...prev,
                [key]: parseFloat(e.target.value)
              }))}
              className="w-full"
            />
            <span className="text-xs text-gray-400">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}