// =============================================================================
// POLYGON.IO API SERVICE
// =============================================================================

import { makePolygonRequest, isPolygonConfigured } from '../config/polygonConfig.js';

// Re-export configuration check
export { isPolygonConfigured };

// Get 1-minute OHLCV data for past hour
export async function getMinuteData(ticker, hours = 1) {
  const toDate = new Date().toISOString().split('T')[0]; // Today
  const fromDate = new Date(Date.now() - hours * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // X hours ago
  
  const params = {
    adjusted: true,
    sort: 'asc',
    limit: hours * 60 // 60 minutes per hour
  };
  
  return await makePolygonRequest(`/v2/aggs/ticker/${ticker}/range/1/minute/${fromDate}/${toDate}`, params);
}

// Get real-time trades for detailed analysis
export async function getRecentTrades(ticker, timestamp = null) {
  const params = {
    limit: 1000, // Get last 1000 trades
    order: 'desc',
    sort: 'timestamp'
  };
  
  if (timestamp) {
    params['timestamp.gte'] = timestamp;
  }
  
  return await makePolygonRequest(`/v3/trades/${ticker}`, params);
}

// Get all tickers with filtering
export async function getFilteredTickers(filters = {}) {
  const params = {
    market: 'stocks',
    active: true,
    limit: 1000,
    sort: 'ticker',
    order: 'asc',
    ...filters
  };
  
  return await makePolygonRequest('/v3/reference/tickers', params);
}

// Get market snapshots for multiple tickers
export async function getMarketSnapshots(tickers = null) {
  const params = {};
  
  // IMPORTANT: Only add tickers parameter if we have specific tickers
  if (tickers && Array.isArray(tickers) && tickers.length > 0) {
    params.tickers = tickers.join(',');
    console.log(`[DEBUG] Requesting snapshots for specific tickers: ${tickers.slice(0, 5).join(', ')}${tickers.length > 5 ? ` and ${tickers.length - 5} more` : ''}`);
  } else {
    console.log(`[DEBUG] Requesting ALL market snapshots (no ticker filter)`);
  }
  
  return await makePolygonRequest('/v2/snapshot/locale/us/markets/stocks/tickers', params);
}

// Get single ticker snapshot
export async function getSingleTickerSnapshot(ticker) {
  return await makePolygonRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
}

// Get historical aggregates (OHLCV data)
export async function getHistoricalData(ticker, timespan = 'day', from, to, limit = 120) {
  const params = {
    adjusted: true,
    sort: 'asc',
    limit
  };
  
  if (from) params.from = from;
  if (to) params.to = to;
  
  return await makePolygonRequest(`/v2/aggs/ticker/${ticker}/range/1/${timespan}/${from}/${to}`, params);
}

// Get market news from Polygon
export async function getPolygonNews(filters = {}) {
  const params = {
    limit: filters.limit || 50,
    order: 'desc',
    sort: 'published_utc'
  };
  
  if (filters.ticker) params['ticker'] = filters.ticker;
  if (filters.from) params['published_utc.gte'] = filters.from;
  if (filters.to) params['published_utc.lte'] = filters.to;
  
  return await makePolygonRequest('/v2/reference/news', params);
}

// Get ticker details
export async function getTickerDetails(ticker) {
  return await makePolygonRequest(`/v3/reference/tickers/${ticker}`);
}

// Get market status
export async function getMarketStatus() {
  return await makePolygonRequest('/v1/marketstatus/now');
}

// Get trades for a ticker (real-time/delayed)
export async function getTrades(ticker, timestamp = null) {
  const params = {};
  if (timestamp) params.timestamp = timestamp;
  
  return await makePolygonRequest(`/v3/trades/${ticker}`, params);
}

// Get quotes for a ticker
export async function getQuotes(ticker, timestamp = null) {
  const params = {};
  if (timestamp) params.timestamp = timestamp;
  
  return await makePolygonRequest(`/v3/quotes/${ticker}`, params);
}