// =============================================================================
// POLYGON.IO API CONFIGURATION
// =============================================================================

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from backend folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

// Polygon API configuration
export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'your_api_key_here';
export const POLYGON_BASE_URL = 'https://api.polygon.io';

// Check if Polygon API is configured
export function isPolygonConfigured() {
  return POLYGON_API_KEY && POLYGON_API_KEY !== 'your_api_key_here';
}

// Make Polygon API request - shared logic
export async function makePolygonRequest(endpoint, params = {}) {
  try {
    const url = new URL(endpoint, POLYGON_BASE_URL);
    
    // Add API key to params
    params.apikey = POLYGON_API_KEY;
    
    // Add all params to URL
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`[INFO] Polygon API request: ${endpoint}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[INFO] Polygon API response: ${data.status}, count: ${data.count || 0}`);
    
    return data;
  } catch (error) {
    console.error('[ERROR] Polygon API request failed:', error.message);
    throw error;
  }
}