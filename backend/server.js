import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import route handlers
import healthRoutes from './routes/healthRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import { setupWebSocket } from './routes/websocketHandler.js';

// Import Polygon configuration for startup checks
import { isPolygonConfigured } from './config/polygonConfig.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Environment detection
const parentDir = path.dirname(__dirname);
const distPath = path.join(parentDir, 'dist');
const isProduction = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (isProduction) {
  app.use(express.static(distPath));
  console.log('📦 Production mode - serving built React app from dist/');
} else {
  console.log('🔥 Development mode - Vite dev server handles frontend');
}

// =============================================================================
// API ROUTES
// =============================================================================

// Mount route handlers
app.use('/api', healthRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/news', newsRoutes);

// =============================================================================
// WEBSOCKET SETUP
// =============================================================================

setupWebSocket(wss);

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Serve React app for all non-API routes (only in production)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = isProduction ? 3000 : 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stock Trading Backend running on port ${PORT}`);
  console.log(`📊 Polygon.io API: ${isPolygonConfigured() ? 'Configured ✅' : 'Not configured ❌ - Set POLYGON_API_KEY'}`);
  
  if (isProduction) {
    console.log(`📱 Application: http://localhost:${PORT}`);
  } else {
    console.log(`📱 Frontend (Vite): http://localhost:3000`);
    console.log(`🔌 Backend API: http://localhost:${PORT}`);
  }
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  
  // API endpoints summary
  console.log('\n📋 Available API Endpoints:');
  console.log('   GET  /api/health - Health check');
  console.log('   GET  /api/health/detailed - Detailed health check');
  console.log('   POST /api/stocks/screen - Stock screening');
  console.log('   GET  /api/stocks/:ticker - Single stock data');
  console.log('   GET  /api/stocks/:ticker/history - Historical data');
  console.log('   GET  /api/stocks/:ticker/signals - Trading signals');
  console.log('   GET  /api/news - Market news');
  console.log('   GET  /api/news/sentiment - News sentiment');
  console.log('   GET  /api/news/ticker/:ticker - Ticker news');
});