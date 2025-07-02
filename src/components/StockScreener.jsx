import { Filter, RefreshCw, Play, Pause } from 'lucide-react';

export default function StockScreener({
  screeningCriteria,
  setScreeningCriteria,
  syncTechnicalData,
  loading,
  isDataSyncing,
  startDataSync,
  stopDataSync
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-2 text-blue-400" />
        Stock Screening Criteria
      </h3>
      
      {/* Price Filters */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-300 mb-2">Price Range</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Min Price ($)</label>
            <input
              type="number"
              value={screeningCriteria.minPrice}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                minPrice: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Max Price ($)</label>
            <input
              type="number"
              value={screeningCriteria.maxPrice}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                maxPrice: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="8"
            />
          </div>
        </div>
      </div>

      {/* Volume Filters */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-300 mb-2">Volume Range (K = thousands)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Min Volume (K)</label>
            <input
              type="number"
              value={screeningCriteria.minVolume}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                minVolume: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Max Volume (K)</label>
            <input
              type="number"
              value={screeningCriteria.maxVolume || ''}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                maxVolume: e.target.value === '' ? null : parseFloat(e.target.value) || null 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="Leave blank for no limit"
            />
          </div>
        </div>
      </div>

      {/* Market Cap Filters */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-300 mb-2">Market Cap Range (M = millions)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Min Market Cap (M)</label>
            <input
              type="number"
              value={screeningCriteria.minMarketCap}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                minMarketCap: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="Leave blank for no limit"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Max Market Cap (M)</label>
            <input
              type="number"
              value={screeningCriteria.maxMarketCap}
              onChange={(e) => setScreeningCriteria(prev => ({ 
                ...prev, 
                maxMarketCap: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
              }))}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              placeholder="Leave blank for no limit"
            />
          </div>
        </div>
      </div>

      {/* Exchange Selection */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-300 mb-2">Exchanges</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { code: 'XNYS', name: 'NYSE' },
            { code: 'XNAS', name: 'NASDAQ' },
            { code: 'XNGS', name: 'NASDAQ Global Select' },
            { code: 'ARCX', name: 'NYSE Arca' },
            { code: 'XASE', name: 'NYSE American' },
            { code: 'BATS', name: 'BATS' }
          ].map(exchange => (
            <button
              key={exchange.code}
              onClick={() => {
                const isSelected = screeningCriteria.exchanges.includes(exchange.code);
                setScreeningCriteria(prev => ({
                  ...prev,
                  exchanges: isSelected 
                    ? prev.exchanges.filter(e => e !== exchange.code)
                    : [...prev.exchanges, exchange.code]
                }));
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                screeningCriteria.exchanges.includes(exchange.code)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {exchange.name}
            </button>
          ))}
        </div>
      </div>

      {/* Industry/Sector Selection */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-300 mb-2">Industries (Optional)</h4>
        <div className="flex flex-wrap gap-2">
          {[
            'Technology',
            'Healthcare',
            'Financial Services',
            'Consumer Cyclical',
            'Consumer Defensive',
            'Energy',
            'Industrials',
            'Real Estate',
            'Materials',
            'Utilities',
            'Communication Services'
          ].map(industry => (
            <button
              key={industry}
              onClick={() => {
                const isSelected = screeningCriteria.industries.includes(industry);
                setScreeningCriteria(prev => ({
                  ...prev,
                  industries: isSelected 
                    ? prev.industries.filter(i => i !== industry)
                    : [...prev.industries, industry]
                }));
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                screeningCriteria.industries.includes(industry)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">Leave empty to include all industries</p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={syncTechnicalData}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50 flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading ? 'Screening...' : 'Screen Stocks'}
        </button>
        
        <button
          onClick={isDataSyncing ? stopDataSync : startDataSync}
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
          <span>{loading ? 'Loading...' : isDataSyncing ? 'Stop Monitoring' : 'Start Monitoring'}</span>
        </button>
        
        <button
          onClick={() => setScreeningCriteria({
            minPrice: 1,
            maxPrice: 8,
            minMarketCap: '',
            maxMarketCap: '',
            minVolume: 500,
            maxVolume: null,
            exchanges: ['XNYS', 'XNAS'],
            industries: []
          })}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}