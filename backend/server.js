import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Simple production detection: check if dist folder exists and has files
const distPath = path.join(__dirname, 'dist');
const isProduction = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (isProduction) {
  // Production: serve built React app
  app.use(express.static(distPath));
  console.log('📦 Production mode - serving built React app from dist/');
} else {
  // Development: don't serve static files (Vite dev server handles this)
  console.log('🔥 Development mode - Vite dev server handles frontend');
}

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// Simple API route example
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello from the backend!',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes (only in production)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Port configuration: 3001 for development, 3000 for production
const PORT = isProduction ? 3000 : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple React App Server running on port ${PORT}`);
  
  if (isProduction) {
    console.log(`📱 Application: http://localhost:${PORT}`);
  } else {
    console.log(`📱 Frontend (Vite): http://localhost:3000`);
    console.log(`🔌 Backend API: http://localhost:${PORT}`);
  }
});