// src/hooks/useWebSocketPrices.js - Hook for WebSocket price updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { polygonWebSocketService } from '../services/PolygonWebSocketService';

export function useWebSocketPrices(stocks = []) {
  const [priceData, setPriceData] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const subscriptionIdRef = useRef(null);
  const previousTickersRef = useRef(new Set());

  // Handle incoming WebSocket data
  const handleWebSocketData = useCallback((data) => {
    if (data.type === 'trade') {
      setPriceData(prevData => {
        const newData = new Map(prevData);
        const currentData = newData.get(data.ticker) || {};
        
        newData.set(data.ticker, {
          ...currentData,
          currentPrice: data.price,
          lastTrade: {
            price: data.price,
            size: data.size,
            timestamp: data.timestamp,
            exchange: data.exchange
          },
          lastUpdated: Date.now()
        });
        
        return newData;
      });
    } else if (data.type === 'quote') {
      setPriceData(prevData => {
        const newData = new Map(prevData);
        const currentData = newData.get(data.ticker) || {};
        
        newData.set(data.ticker, {
          ...currentData,
          bid: data.bidPrice,
          bidSize: data.bidSize,
          ask: data.askPrice,
          askSize: data.askSize,
          spread: data.askPrice - data.bidPrice,
          lastUpdated: Date.now()
        });
        
        return newData;
      });
    }
  }, []);

  // Connect to WebSocket and subscribe to price updates
  useEffect(() => {
    if (!stocks || stocks.length === 0) {
      return;
    }

    const currentTickers = new Set(stocks.map(s => s.ticker));
    const previousTickers = previousTickersRef.current;

    // Only reconnect if tickers have changed
    if (!areSetsEqual(currentTickers, previousTickers)) {
      setConnectionStatus('connecting');
      
      polygonWebSocketService.connect()
        .then(() => {
          setIsConnected(true);
          setConnectionStatus('connected');
          
          // Subscribe to new tickers
          const tickers = Array.from(currentTickers);
          polygonWebSocketService.subscribeToTickers(tickers);
          
          // Set up message subscription
          if (subscriptionIdRef.current) {
            polygonWebSocketService.unsubscribe(subscriptionIdRef.current);
          }
          subscriptionIdRef.current = polygonWebSocketService.subscribe(handleWebSocketData);
          
          previousTickersRef.current = currentTickers;
        })
        .catch(error => {
          console.error('[WebSocket] Connection failed:', error);
          setIsConnected(false);
          setConnectionStatus('error');
        });
    }

    return () => {
      if (subscriptionIdRef.current) {
        polygonWebSocketService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [stocks, handleWebSocketData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionIdRef.current) {
        polygonWebSocketService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, []);

  // Calculate change percentages from previous day's close
  const enhancedPriceData = new Map();
  priceData.forEach((data, ticker) => {
    const stock = stocks.find(s => s.ticker === ticker);
    const previousClose = stock?.currentPrice || data.currentPrice;
    
    if (data.currentPrice && previousClose) {
      const changePercent = ((data.currentPrice - previousClose) / previousClose) * 100;
      enhancedPriceData.set(ticker, {
        ...data,
        changePercent,
        previousClose
      });
    } else {
      enhancedPriceData.set(ticker, data);
    }
  });

  return {
    priceData: enhancedPriceData,
    isConnected,
    connectionStatus,
    reconnect: () => {
      setConnectionStatus('connecting');
      polygonWebSocketService.connect().catch(error => {
        console.error('[WebSocket] Manual reconnection failed:', error);
        setConnectionStatus('error');
      });
    }
  };
}

// Helper function to compare sets
function areSetsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}