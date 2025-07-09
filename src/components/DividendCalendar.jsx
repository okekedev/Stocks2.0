// src/components/DividendCalendar.jsx - Weekly Dividend Calendar with Yield Analysis
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Percent,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { dividendService } from '../services/DividendService';

export function DividendCalendar() {
  const [dividends, setDividends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sortBy, setSortBy] = useState('yield'); // Default sort by yield
  const [sortOrder, setSortOrder] = useState('desc');

  // Get next week's date range
  const getNextWeekRange = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const endOfNextWeek = new Date(nextWeek);
    endOfNextWeek.setDate(nextWeek.getDate() + 6);
    
    return {
      start: nextWeek.toISOString().split('T')[0],
      end: endOfNextWeek.toISOString().split('T')[0]
    };
  };

  // Fetch dividend data for next week using the clean dividend service
  const fetchDividends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { start, end } = getNextWeekRange();
      console.log(`[DividendCalendar] Fetching dividends from ${start} to ${end}`);
      
      // Use the new clean dividend service
      const dividends = await dividendService.getNextWeekDividends();
      
      setDividends(dividends);
      setLastUpdate(new Date().toISOString());
      
      console.log(`[DividendCalendar] Successfully loaded ${dividends.length} high-yield US dividends`);
      
    } catch (err) {
      console.error('[DividendCalendar] Failed to fetch dividends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load dividends on mount
  useEffect(() => {
    fetchDividends();
  }, []);

  // Sorting logic
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'ex_dividend_date' ? 'asc' : 'desc');
    }
  };

  // Sort dividends
  const sortedDividends = [...dividends].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'yield':
        aVal = a.dividendYield || 0;
        bVal = b.dividendYield || 0;
        break;
      case 'ticker':
        return sortOrder === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      case 'currentPrice':
        aVal = a.currentPrice || 0;
        bVal = b.currentPrice || 0;
        break;
      case 'cash_amount':
        aVal = a.cash_amount || 0;
        bVal = b.cash_amount || 0;
        break;
      case 'annualizedAmount':
        aVal = a.annualizedAmount || 0;
        bVal = b.annualizedAmount || 0;
        break;
      case 'ex_dividend_date':
        aVal = new Date(a.ex_dividend_date).getTime();
        bVal = new Date(b.ex_dividend_date).getTime();
        break;
      default:
        aVal = a.dividendYield || 0;
        bVal = b.dividendYield || 0;
    }
    
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get frequency description
  const getFrequencyText = (frequency) => {
    switch (frequency) {
      case 0: return 'One-time';
      case 1: return 'Annual';
      case 2: return 'Semi-annual';
      case 4: return 'Quarterly';
      case 12: return 'Monthly';
      case 24: return 'Bi-monthly';
      case 52: return 'Weekly';
      default: return `${frequency}x/year`;
    }
  };

  // Get dividend type description
  const getDividendTypeInfo = (type) => {
    switch (type) {
      case 'CD':
        return { name: 'Regular', color: 'text-green-400', bg: 'bg-green-900/20' };
      case 'SC':
        return { name: 'Special', color: 'text-blue-400', bg: 'bg-blue-900/20' };
      case 'LT':
        return { name: 'LT Gains', color: 'text-purple-400', bg: 'bg-purple-900/20' };
      case 'ST':
        return { name: 'ST Gains', color: 'text-orange-400', bg: 'bg-orange-900/20' };
      default:
        return { name: type || 'Unknown', color: 'text-gray-400', bg: 'bg-gray-900/20' };
    }
  };

  // Get yield color based on percentage (for single dividend payment)
  const getYieldColor = (yield_pct) => {
    if (yield_pct >= 2) return 'text-purple-400';    // Very high yield (2%+ per payment)
    if (yield_pct >= 1.25) return 'text-green-400';  // High yield (1.25%+ per payment)  
    if (yield_pct >= 0.75) return 'text-blue-400';   // Good yield (0.75%+ per payment)
    if (yield_pct >= 0.25) return 'text-yellow-400'; // Low yield (0.25%+ per payment)
    return 'text-gray-400';                          // Very low yield
  };

  // Format yield percentage
  const formatYield = (yield_pct) => {
    if (!yield_pct || yield_pct === 0) return 'N/A';
    return `${yield_pct.toFixed(2)}%`;
  };

  // Sort header component
  const SortHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {sortBy === field && (
          <div className={`p-1 rounded ${sortOrder === 'asc' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
            {sortOrder === 'asc' ? 
              <ChevronUp className="w-3 h-3 text-blue-400" /> : 
              <ChevronDown className="w-3 h-3 text-purple-400" />
            }
          </div>
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mt-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          <span className="text-purple-400">Loading dividend calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl mt-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 px-6 py-6 border-b border-gray-600/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center">
                High-Yield Dividend Calendar - Next Week
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <div className="text-sm text-green-100">
                  {sortedDividends.length} high-yield US dividends (2%+ per payment)
                </div>
                <div className="w-px h-4 bg-green-300"></div>
                <div className="text-sm text-green-200">
                  Sorted by: {sortBy === 'yield' ? 'Dividend Yield' : 
                            sortBy === 'ticker' ? 'Stock Symbol' :
                            sortBy === 'currentPrice' ? 'Stock Price' :
                            sortBy === 'cash_amount' ? 'Dividend Amount' :
                            sortBy === 'annualizedAmount' ? 'Annual Dividend' :
                            'Ex-Dividend Date'}
                </div>
                {lastUpdate && (
                  <>
                    <div className="w-px h-4 bg-green-300"></div>
                    <div className="text-sm text-green-200">
                      Updated: {new Date(lastUpdate).toLocaleTimeString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDividends}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-900/20 border-b border-red-700/30">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">Failed to load dividends: {error}</span>
            <button 
              onClick={fetchDividends}
              className="text-red-400 hover:text-red-300 underline ml-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Dividend Table */}
      {sortedDividends.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/50">
              <tr>
                <SortHeader field="ticker">Stock</SortHeader>
                <SortHeader field="currentPrice">Stock Price</SortHeader>
                <SortHeader field="cash_amount">Dividend</SortHeader>
                <SortHeader field="yield">Yield %</SortHeader>
                <SortHeader field="ex_dividend_date">Buy By / Sell After</SortHeader>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Last Dividend
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Pay Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {sortedDividends.map((dividend, index) => {
                const typeInfo = getDividendTypeInfo(dividend.dividend_type);
                
                return (
                  <tr 
                    key={dividend.id || `${dividend.ticker}-${index}`}
                    className="hover:bg-gray-700/50 transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Stock */}
                    <td className="px-6 py-5 whitespace-nowrap relative">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <div className="text-white font-bold text-lg">{dividend.ticker}</div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                            {typeInfo.name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {getFrequencyText(dividend.frequency)} dividend
                        </div>
                      </div>
                    </td>

                    {/* Stock Price */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-white font-bold text-lg">
                        {dividend.currentPrice ? formatCurrency(dividend.currentPrice) : 'N/A'}
                      </div>
                    </td>

                    {/* Dividend Amount */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-white font-bold text-lg">
                          {formatCurrency(dividend.cash_amount)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Annual: {formatCurrency(dividend.annualizedAmount)}
                        </div>
                      </div>
                    </td>

                    {/* Dividend Yield */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Percent className="w-4 h-4 text-gray-400" />
                          <div className={`text-xl font-bold ${getYieldColor(dividend.dividendYield)}`}>
                            {formatYield(dividend.dividendYield)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          This payment: {getFrequencyText(dividend.frequency).toLowerCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Annual: {formatYield(dividend.annualizedYield)}
                        </div>
                      </div>
                      {dividend.dividendYield >= 2 && (
                        <div className="text-xs text-purple-300 mt-1">Very High</div>
                      )}
                      {dividend.dividendYield >= 1.25 && dividend.dividendYield < 2 && (
                        <div className="text-xs text-green-300 mt-1">High Yield</div>
                      )}
                    </td>

                    {/* Buy By / Sell After Dates */}
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        {/* Buy By Date */}
                        <div className="bg-green-900/20 rounded-lg p-2 border border-green-700/30">
                          <div className="text-xs text-green-300 mb-1">📈 Buy By (Last Trading Day)</div>
                          <div className="text-white font-medium">
                            {formatDate(dividend.buyByDate)}
                          </div>
                          <div className="text-xs text-green-400 mt-1">
                            {Math.ceil((new Date(dividend.buyByDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </div>
                        
                        {/* Sell After Date */}
                        <div className="bg-blue-900/20 rounded-lg p-2 border border-blue-700/30">
                          <div className="text-xs text-blue-300 mb-1">📉 Can Sell After</div>
                          <div className="text-white font-medium">
                            {formatDate(dividend.sellAfterDate)}
                          </div>
                          <div className="text-xs text-blue-400 mt-1">
                            Ex-dividend date
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Last Dividend Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="group cursor-pointer relative">
                        {dividend.lastDividend ? (
                          <div className="space-y-1">
                            <div className="text-sm text-purple-400 font-medium">
                              ${dividend.lastDividend.amount.toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(dividend.lastDividend.exDate)}
                            </div>
                            <div className="text-xs text-blue-300">
                              {getFrequencyText(dividend.lastDividend.frequency)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            No dividend data
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Pay Date */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-gray-300">
                          {dividend.pay_date ? formatDate(dividend.pay_date) : 'TBD'}
                        </div>
                        {dividend.daysUntilPay && (
                          <div className="text-sm text-green-400">
                            💰 {dividend.daysUntilPay} days to pay
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No High-Yield US Dividends Next Week</h3>
          <p className="text-gray-400">No US stocks have dividend yields of 2%+ per payment in the next 7 days</p>
          <p className="text-gray-500 text-sm mt-2">Only showing US dividend payments with 2%+ yield to filter out tiny dividends</p>
        </div>
      )}
    </div>
  );
}