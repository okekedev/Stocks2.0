import { getSingleStock, performStockScreening, calculateTradingSignals } from '../services/technicalService.js';
import { getTickerNews } from '../services/newsService.js';

// Setup WebSocket server
export function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('[INFO] WebSocket client connected');
    
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Stock Trading WebSocket',
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('[INFO] WebSocket message received:', data.type);
        
        switch (data.type) {
          case 'subscribe_stock':
            // Handle stock subscription
            const stockData = await getSingleStock(data.ticker);
            ws.send(JSON.stringify({
              type: 'stock_update',
              ticker: data.ticker,
              data: stockData,
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'screen_stocks':
            // Handle real-time screening
            try {
              ws.send(JSON.stringify({
                type: 'screening_started',
                message: 'Stock screening in progress...',
                timestamp: new Date().toISOString()
              }));
              
              const results = await performStockScreening(data.criteria);
              ws.send(JSON.stringify({
                type: 'screening_completed',
                data: results,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'screening_error',
                message: `Screening failed: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case 'get_news':
            // Handle news requests
            try {
              const { ticker, days = 7 } = data;
              const newsData = await getTickerNews(ticker, { days, limit: 10 });
              ws.send(JSON.stringify({
                type: 'news_update',
                ticker,
                data: newsData,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'news_error',
                message: `News request failed: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case 'get_signals':
            // Handle trading signals requests
            try {
              const stockData = await getSingleStock(data.ticker);
              const signals = stockData?.technicals ? calculateTradingSignals(stockData.technicals) : null;
              ws.send(JSON.stringify({
                type: 'signals_update',
                ticker: data.ticker,
                signals,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'signals_error',
                message: `Signals request failed: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        console.error('[ERROR] WebSocket message error:', error.message);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      console.log('[INFO] WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[ERROR] WebSocket error:', error.message);
    });
  });
  
  console.log('[INFO] WebSocket server setup completed');
}