// src/hooks/useCoinbaseWebSocket.js
import { useState, useEffect, useRef, useCallback } from "react";
import { sign } from "jsonwebtoken";
import crypto from "crypto";

// WebSocket Configuration
const WS_URL = "wss://advanced-trade-ws.coinbase.com";
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Generate JWT for authentication (if using CDP keys)
const generateJWT = (apiKey, signingKey) => {
  if (!apiKey || !signingKey) return null;

  return sign(
    {
      iss: "cdp",
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes
      sub: apiKey,
    },
    signingKey,
    {
      algorithm: "ES256",
      header: {
        kid: apiKey,
        nonce: crypto.randomBytes(16).toString("hex"),
      },
    }
  );
};

export const useCoinbaseWebSocket = ({
  channels = ["ticker", "market_trades"],
  productIds = ["BTC-USD", "ETH-USD"],
  useAuth = false,
  apiKey = null,
  signingKey = null,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [tickerData, setTickerData] = useState({});
  const [marketTrades, setMarketTrades] = useState({});
  const [error, setError] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const jwtRefreshIntervalRef = useRef(null);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "ticker":
          setTickerData((prev) => ({
            ...prev,
            [data.product_id]: {
              price: parseFloat(data.price),
              volume_24h: parseFloat(data.volume_24h),
              best_bid: parseFloat(data.best_bid),
              best_ask: parseFloat(data.best_ask),
              time: data.time,
              trade_id: data.trade_id,
              last_size: parseFloat(data.last_size),
              side: data.side,
            },
          }));
          break;

        case "match": // Market trades
          setMarketTrades((prev) => {
            const trades = prev[data.product_id] || [];
            const newTrade = {
              trade_id: data.trade_id,
              price: parseFloat(data.price),
              size: parseFloat(data.size),
              side: data.side,
              time: data.time,
            };

            // Keep only last 50 trades per product
            const updatedTrades = [newTrade, ...trades].slice(0, 50);

            return {
              ...prev,
              [data.product_id]: updatedTrades,
            };
          });
          break;

        case "subscriptions":
          console.log("Active subscriptions:", data.channels);
          break;

        case "error":
          console.error("WebSocket error:", data.message);
          setError(data.message);
          break;
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  }, []);

  // Subscribe to channels
  const subscribe = useCallback(
    (ws) => {
      channels.forEach((channel) => {
        const message = {
          type: "subscribe",
          product_ids: productIds,
          channel: channel,
        };

        // Add JWT if using authentication
        if (useAuth && apiKey && signingKey) {
          message.jwt = generateJWT(apiKey, signingKey);
        }

        ws.send(JSON.stringify(message));
      });
    },
    [channels, productIds, useAuth, apiKey, signingKey]
  );

  // Unsubscribe from channels
  const unsubscribe = useCallback(
    (ws) => {
      channels.forEach((channel) => {
        const message = {
          type: "unsubscribe",
          product_ids: productIds,
          channel: channel,
        };

        if (useAuth && apiKey && signingKey) {
          message.jwt = generateJWT(apiKey, signingKey);
        }

        ws.send(JSON.stringify(message));
      });
    },
    [channels, productIds, useAuth, apiKey, signingKey]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        setConnectionAttempts(0);
        subscribe(ws);

        // Set up JWT refresh if using auth
        if (useAuth && apiKey && signingKey) {
          jwtRefreshIntervalRef.current = setInterval(() => {
            unsubscribe(ws);
            subscribe(ws);
          }, 110000); // Refresh every 110 seconds (JWT expires at 120)
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;

        // Clear JWT refresh interval
        if (jwtRefreshIntervalRef.current) {
          clearInterval(jwtRefreshIntervalRef.current);
        }

        // Attempt reconnection
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          setConnectionAttempts((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError("Max reconnection attempts reached");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError(err.message);
    }
  }, [
    connectionAttempts,
    handleMessage,
    subscribe,
    unsubscribe,
    useAuth,
    apiKey,
    signingKey,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      unsubscribe(wsRef.current);
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (jwtRefreshIntervalRef.current) {
      clearInterval(jwtRefreshIntervalRef.current);
    }

    setIsConnected(false);
  }, [unsubscribe]);

  // Add/remove products dynamically
  const addProduct = useCallback(
    (productId) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        channels.forEach((channel) => {
          const message = {
            type: "subscribe",
            product_ids: [productId],
            channel: channel,
          };

          if (useAuth && apiKey && signingKey) {
            message.jwt = generateJWT(apiKey, signingKey);
          }

          wsRef.current.send(JSON.stringify(message));
        });
      }
    },
    [channels, useAuth, apiKey, signingKey]
  );

  const removeProduct = useCallback(
    (productId) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        channels.forEach((channel) => {
          const message = {
            type: "unsubscribe",
            product_ids: [productId],
            channel: channel,
          };

          if (useAuth && apiKey && signingKey) {
            message.jwt = generateJWT(apiKey, signingKey);
          }

          wsRef.current.send(JSON.stringify(message));
        });
      }
    },
    [channels, useAuth, apiKey, signingKey]
  );

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Only run on mount/unmount

  return {
    isConnected,
    tickerData,
    marketTrades,
    error,
    connect,
    disconnect,
    addProduct,
    removeProduct,
    connectionAttempts,
  };
};
