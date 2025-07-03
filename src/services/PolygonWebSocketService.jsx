// src/services/PolygonWebSocketService.js - Fixed WebSocket service for real-time data
class PolygonWebSocketService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.subscribedTickers = new Set();
    this.isAuthenticated = false;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Polygon WebSocket endpoint - Use delayed data (15-minute delay)
        this.ws = new WebSocket('wss://delayed.polygon.io/stocks');
        
        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to Polygon.io');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Authenticate with correct format
          this.send({
            action: 'auth',
            params: this.apiKey
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.isAuthenticated = false;
          
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          this.isConnected = false;
          this.isAuthenticated = false;
          reject(error);
        };

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        reject(error);
      }
    });
  }

  handleMessage(data) {
    // Handle different message types
    if (Array.isArray(data)) {
      data.forEach(message => this.processMessage(message));
    } else {
      this.processMessage(data);
    }
  }

  processMessage(message) {
    switch (message.ev) {
      case 'status':
        console.log('[WebSocket] Status:', message.message);
        if (message.status === 'auth_success') {
          console.log('[WebSocket] Authentication successful');
          this.isAuthenticated = true;
          // Resubscribe to any previously subscribed tickers
          if (this.subscribedTickers.size > 0) {
            this.subscribeToTickers(Array.from(this.subscribedTickers));
          }
        } else if (message.status === 'auth_failed') {
          console.error('[WebSocket] Authentication failed:', message.message);
          this.isAuthenticated = false;
        } else if (message.status === 'not_authorized') {
          console.error('[WebSocket] Not authorized:', message.message);
          this.isAuthenticated = false;
          // Try to re-authenticate
          setTimeout(() => {
            if (this.isConnected) {
              console.log('[WebSocket] Attempting re-authentication...');
              this.send({
                action: 'auth',
                params: this.apiKey
              });
            }
          }, 1000);
        }
        break;

      case 'T': // Trade message
        console.log('[WebSocket] Trade received:', message.sym, message.p);
        this.notifySubscribers({
          type: 'trade',
          ticker: message.sym,
          price: message.p,
          size: message.s,
          timestamp: message.t,
          exchange: message.x
        });
        break;

      case 'Q': // Quote message
        console.log('[WebSocket] Quote received:', message.sym, message.bp, message.ap);
        this.notifySubscribers({
          type: 'quote',
          ticker: message.sym,
          bidPrice: message.bp,
          bidSize: message.bs,
          askPrice: message.ap,
          askSize: message.as,
          timestamp: message.t,
          exchange: message.x
        });
        break;

      case 'A': // Aggregate (minute bar)
        console.log('[WebSocket] Aggregate received:', message.sym, message.c);
        this.notifySubscribers({
          type: 'aggregate',
          ticker: message.sym,
          open: message.o,
          high: message.h,
          low: message.l,
          close: message.c,
          volume: message.v,
          timestamp: message.s,
          endTimestamp: message.e
        });
        break;

      default:
        console.log('[WebSocket] Unknown message type:', message.ev, message);
    }
  }

  subscribeToTickers(tickers) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.warn('[WebSocket] Not connected or not authenticated, queuing subscription...');
      tickers.forEach(ticker => this.subscribedTickers.add(ticker));
      return;
    }

    // Subscribe to trades and quotes for each ticker
    const subscriptions = [];
    
    tickers.forEach(ticker => {
      this.subscribedTickers.add(ticker);
      subscriptions.push(`T.${ticker}`); // Trades
      subscriptions.push(`Q.${ticker}`); // Quotes
      // Also subscribe to aggregates for more data
      subscriptions.push(`A.${ticker}`); // Minute aggregates
    });

    if (subscriptions.length > 0) {
      this.send({
        action: 'subscribe',
        params: subscriptions.join(',')
      });
      
      console.log(`[WebSocket] Subscribed to ${tickers.length} tickers:`, tickers);
      console.log(`[WebSocket] Total subscriptions:`, subscriptions.length);
    }
  }

  unsubscribeFromTickers(tickers) {
    if (!this.isConnected || !this.isAuthenticated) return;

    const subscriptions = [];
    
    tickers.forEach(ticker => {
      this.subscribedTickers.delete(ticker);
      subscriptions.push(`T.${ticker}`);
      subscriptions.push(`Q.${ticker}`);
      subscriptions.push(`A.${ticker}`);
    });

    if (subscriptions.length > 0) {
      this.send({
        action: 'unsubscribe',
        params: subscriptions.join(',')
      });
      
      console.log(`[WebSocket] Unsubscribed from ${tickers.length} tickers:`, tickers);
    }
  }

  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.subscribers.set(id, callback);
    console.log(`[WebSocket] Added subscriber, total: ${this.subscribers.size}`);
    return id;
  }

  unsubscribe(id) {
    this.subscribers.delete(id);
    console.log(`[WebSocket] Removed subscriber, total: ${this.subscribers.size}`);
  }

  notifySubscribers(data) {
    console.log(`[WebSocket] Notifying ${this.subscribers.size} subscribers of ${data.type} for ${data.ticker}`);
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[WebSocket] Error in subscriber callback:', error);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending:', data);
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message, connection not open');
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.subscribedTickers.clear();
    this.subscribers.clear();
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      subscribedTickers: Array.from(this.subscribedTickers),
      subscriberCount: this.subscribers.size
    };
  }
}

export const polygonWebSocketService = new PolygonWebSocketService();