import express from 'express';
import { isPolygonConfigured } from '../config/polygonConfig.js';

const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    polygonApiConfigured: isPolygonConfigured()
  });
});

// Detailed health check
router.get('/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100
    },
    services: {
      polygonApi: isPolygonConfigured() ? 'configured' : 'not configured',
      server: 'running',
      websocket: 'active'
    },
    endpoints: {
      stocks: [
        'POST /api/stocks/screen',
        'GET /api/stocks/:ticker',
        'GET /api/stocks/:ticker/history',
        'GET /api/stocks/:ticker/signals'
      ],
      news: [
        'GET /api/news',
        'GET /api/news/sentiment',
        'GET /api/news/ticker/:ticker'
      ]
    }
  });
});

export default router;