import { Clock, AlertTriangle } from 'lucide-react';

export default function Header({ 
  lastSyncTime, 
  stocksCount, 
  error 
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
            Neural Stock Radar
          </h1>
          <p className="text-gray-400">Real-time news-driven technical analysis with algorithmic ranking</p>
        </div>
        
        {/* Sync Status - moved to top right */}
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">
              Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
            </span>
          </div>
          
          <div className="text-2xl font-bold text-blue-400">{stocksCount}</div>
          <div className="text-gray-400">Qualifying Stocks Found</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">Error: {error}</span>
          </div>
        </div>
      )}
    </div>
  );
}