import express from 'express';
import { getHistoricalData } from '../services/polygonService.js';
import { performStockScreening, getSingleStock, calculateTradingSignals } from '../services/technicalService.js';

const router = express.Router();

// Stock screening endpoint
router.post('/screen', async (req, res) => {
  try {
    const criteria = req.body;
    console.log('[INFO] Stock screening request:', criteria);
    
    const results = await performStockScreening(criteria);
    res.json(results);
    
  } catch (error) {
    console.error('[ERROR] Stock screening failed:', error.message);
    res.status(500).json({ 
      error: 'Stock screening failed', 
      message: error.message 
    });
  }
});

// Get single stock data
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    console.log(`[INFO] Single stock request: ${ticker}`);
    
    const stockData = await getSingleStock(ticker.toUpperCase());
    
    if (!stockData) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    res.json(stockData);
    
  } catch (error) {
    console.error(`[ERROR] Single stock request failed for ${req.params.ticker}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to get stock data', 
      message: error.message 
    });
  }
});

// Get historical data
router.get('/:ticker/history', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { timespan = 'day', from, to, limit = 120 } = req.query;
    
    console.log(`[INFO] Historical data request: ${ticker}`, { timespan, from, to, limit });
    
    const data = await getHistoricalData(ticker.toUpperCase(), timespan, from, to, parseInt(limit));
    res.json(data);
    
  } catch (error) {
    console.error(`[ERROR] Historical data failed for ${req.params.ticker}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to get historical data', 
      message: error.message 
    });
  }
});

// Get trading signals for a stock
router.get('/:ticker/signals', async (req, res) => {
  try {
    const { ticker } = req.params;
    console.log(`[INFO] Trading signals request: ${ticker}`);
    
    const stockData = await getSingleStock(ticker.toUpperCase());
    
    if (!stockData || !stockData.technicals) {
      return res.status(404).json({ error: 'Stock data or technical indicators not available' });
    }
    
    const signals = calculateTradingSignals(stockData.technicals);
    
    res.json({
      ticker: ticker.toUpperCase(),
      signals,
      technicals: stockData.technicals,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[ERROR] Trading signals failed for ${req.params.ticker}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to get trading signals', 
      message: error.message 
    });
  }
});

export default router;