import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import API routes
import stockRoutes from './backend/routes/stockRoutes.js';
import newsRoutes from './backend/routes/newsRoutes.js';
import healthRoutes from './backend/routes/healthRoutes.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple production detection
const distPath = path.join(__dirname, 'dist');
const isProduction = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (isProduction) {
  app.use(express.static(distPath));
  console.log('📦 Production mode - serving built React app from dist/');
} else {
  console.log('🔥 Development mode - Vite dev server handles frontend');
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/news', newsRoutes);

// Serve React app for all non-API routes (only in production)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Port configuration
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Neural Stock Radar Server running on port ${PORT}`);
  console.log(`🔌 Polygon.io API: Connected`);
  console.log(`📊 Features: Stock Screening | Technical Analysis | News Analysis`);
  
  if (isProduction) {
    console.log(`📱 Application: http://localhost:${PORT}`);
  } else {
    console.log(`📱 Frontend (Vite): http://localhost:3000`);
    console.log(`🔌 Backend API: http://localhost:${PORT}`);
    console.log(`🧪 Test Health: http://localhost:${PORT}/api/health`);
  }
});