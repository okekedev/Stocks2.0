import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export function TableFilters({ filters, onChange, stockCount }) {
  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({
      minPrice: '',
      maxPrice: '',
      minVolume: '',
      minNewsCount: 1,
      minSentiment: -1,
      minImpactScore: 0,
      search: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 1 && value !== -1 && value !== 0
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <span className="text-sm text-gray-400">({stockCount} results)</span>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search Ticker or News
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="e.g., AAPL, earnings, FDA..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Range ($)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', e.target.value)}
              placeholder="Min"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
            />
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              placeholder="Max"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Min Volume (K)
          </label>
          <input
            type="number"
            value={filters.minVolume}
            onChange={(e) => updateFilter('minVolume', e.target.value)}
            placeholder="e.g., 1000"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          />
        </div>

        {/* News Count */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Min News Count
          </label>
          <select
            value={filters.minNewsCount}
            onChange={(e) => updateFilter('minNewsCount', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value={1}>1+ articles</option>
            <option value={2}>2+ articles</option>
            <option value={3}>3+ articles</option>
            <option value={5}>5+ articles</option>
          </select>
        </div>

        {/* Sentiment */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Min Sentiment
          </label>
          <select
            value={filters.minSentiment}
            onChange={(e) => updateFilter('minSentiment', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value={-1}>Any sentiment</option>
            <option value={0}>Neutral+</option>
            <option value={0.2}>Positive</option>
            <option value={0.5}>Very positive</option>
          </select>
        </div>

        {/* Impact Score */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Min Impact Score
          </label>
          <select
            value={filters.minImpactScore}
            onChange={(e) => updateFilter('minImpactScore', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value={0}>Any impact</option>
            <option value={0.4}>Medium+</option>
            <option value={0.6}>High+</option>
            <option value={0.7}>Very high</option>
          </select>
        </div>
      </div>
    </div>
  );
}
