// src/hooks/usePricePolling.js - Simple API polling for price updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { polygonService } from '../services/PolygonService';

export function usePricePolling(stocks = [], pollingInterval = 60000) { // Default 1 minute
  const [priceData, setPriceData] = useState(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const previousPricesRef = useRef(new Map());
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);

  // Fetch current prices for all stocks
  const fetchPrices = useCallback(async () => {
    if (!stocks || stocks.length === 0) {
      return;
    }

    try {
      setConnectionStatus('updating');
      const tickers = stocks.map(s => s.ticker).filter(Boolean);
      
      if (tickers.length === 0) {
        return;
      }

      console.log(`[PricePolling] Fetching prices for ${tickers.length} tickers...`);
      
      // Use the existing getMarketData method
      const marketData = await polygonService.getMarketData(tickers);
      
      if (!isActiveRef.current) {
        return; // Component was unmounted
      }

      const newPriceData = new Map();
      
      marketData.forEach(snapshot => {
        if (snapshot.ticker) {
          const currentPrice = snapshot.lastTrade?.p || snapshot.day?.c;
          const changePercent = snapshot.todaysChangePerc || 0;
          
          if (currentPrice) {
            newPriceData.set(snapshot.ticker, {
              currentPrice,
              changePercent,
              volume: snapshot.day?.v || 0,
              lastTrade: snapshot.lastTrade ? {
                price: snapshot.lastTrade.p,
                size: snapshot.lastTrade.s,
                timestamp: snapshot.lastTrade.t,
                exchange: snapshot.exchange
              } : null,
              lastUpdated: Date.now(),
              source: 'api_poll'
            });
          }
        }
      });

      setPriceData(newPriceData);
      setLastUpdate(Date.now());
      setConnectionStatus('connected');
      
      console.log(`[PricePolling] Updated prices for ${newPriceData.size} tickers`);
      
    } catch (error) {
      console.error('[PricePolling] Failed to fetch prices:', error);
      setConnectionStatus('error');
    }
  }, [stocks]);

  // Start/stop polling based on stocks
  useEffect(() => {
    if (!stocks || stocks.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setConnectionStatus('disconnected');
      setIsPolling(false);
      return;
    }

    // Initial fetch
    fetchPrices();
    setIsPolling(true);

    // Set up polling interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchPrices();
      }
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [stocks, pollingInterval, fetchPrices]);

  // Cleanup on unmount
  useEffect(() => {
    isActiveRef.current = true;
    
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Calculate enhanced price data with change detection
  const enhancedPriceData = new Map();
  priceData.forEach((data, ticker) => {
    const stock = stocks.find(s => s.ticker === ticker);
    const previousClose = stock?.currentPrice || data.currentPrice;
    
    if (data.currentPrice && previousClose) {
      const changePercent = ((data.currentPrice - previousClose) / previousClose) * 100;
      enhancedPriceData.set(ticker, {
        ...data,
        changePercent: data.changePercent || changePercent,
        previousClose
      });
    } else {
      enhancedPriceData.set(ticker, data);
    }
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Get time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never';
    const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo}m ago`;
  };

  return {
    priceData: enhancedPriceData,
    isPolling,
    connectionStatus,
    lastUpdate,
    refresh,
    getTimeSinceUpdate,
    // Status info
    debug: {
      subscribedTickers: stocks.map(s => s.ticker).filter(Boolean),
      totalTickers: stocks.length,
      pollingInterval: pollingInterval / 1000 + 's'
    }
  };
}