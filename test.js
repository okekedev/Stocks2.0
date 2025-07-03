// react-pipeline-diagnostic.js
// Debug what's happening between API data and React display

import https from 'https';
import fs from 'fs';

const API_KEY = process.env.VITE_POLYGON_API_KEY || 'XdjkNaeEDf5dSrjflNopslWWJdG_xZZm';

// Your dashboard tickers (what's actually showing)
const DASHBOARD_TICKERS = [
  'MS', 'WFC', 'C', 'MARA', 'AMAT', 'MU', 'ECX', 'ECXWW', 
  'CLF', 'ET', 'TRIP', 'DDOG'
];

function getRecentNews() {
  return new Promise((resolve) => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const url = new URL('https://api.polygon.io/v2/reference/news');
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('limit', 1000);
    url.searchParams.set('order', 'desc');
    url.searchParams.set('sort', 'published_utc');
    url.searchParams.set('published_utc.gte', fourHoursAgo);
    
    https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
}

function getMarketData(tickers) {
  return new Promise((resolve) => {
    const url = new URL('https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers');
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('tickers', tickers.join(','));
    
    https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData.tickers || []);
        } catch (error) {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      resolve([]);
    });
  });
}

// Simulate your current NewsProcessor logic
function simulateCurrentNewsProcessor(articles) {
  const stocksWithNews = new Map();
  
  console.log('\n📊 SIMULATING CURRENT NEWS PROCESSOR...');
  
  // Filter for positive sentiment articles first (current system)
  const positiveArticles = articles.filter(article => 
    article.insights && 
    article.insights.some(insight => insight.sentiment === 'positive')
  );
  
  console.log(`   Pre-filtered: ${positiveArticles.length} positive articles`);
  
  positiveArticles.forEach(article => {
    if (!article.tickers || article.tickers.length === 0) return;
    
    const tickers = article.tickers
      .map(t => t.toString().toUpperCase().trim())
      .filter(ticker => ticker.length <= 5 && /^[A-Z]+$/.test(ticker));
    
    const minutesAgo = Math.floor(
      (Date.now() - new Date(article.published_utc).getTime()) / 60000
    );
    
    tickers.forEach(ticker => {
      // Check if this ticker has positive sentiment
      const hasPositiveSentiment = article.insights?.some(insight => 
        insight.ticker?.toUpperCase() === ticker && insight.sentiment === 'positive'
      );
      
      if (!hasPositiveSentiment) return;
      
      if (!stocksWithNews.has(ticker)) {
        stocksWithNews.set(ticker, {
          ticker,
          articles: [],
          newsCount: 0,
          latestMinutesAgo: Infinity
        });
      }
      
      const stock = stocksWithNews.get(ticker);
      stock.articles.push({
        id: article.id,
        title: article.title,
        minutesAgo: minutesAgo
      });
      stock.newsCount++;
      stock.latestMinutesAgo = Math.min(stock.latestMinutesAgo, minutesAgo);
    });
  });
  
  const stocks = Array.from(stocksWithNews.values());
  stocks.sort((a, b) => a.latestMinutesAgo - b.latestMinutesAgo);
  
  console.log(`   Result: ${stocks.length} stocks with positive sentiment`);
  
  return stocks;
}

// Simulate adding price data
async function simulateAddPriceData(stocks) {
  console.log('\n💰 SIMULATING PRICE DATA ADDITION...');
  
  const tickers = stocks.map(s => s.ticker);
  const marketData = await getMarketData(tickers);
  
  console.log(`   Fetched prices for ${marketData.length} tickers`);
  
  const stocksWithPrices = stocks.map(stock => {
    const snapshot = marketData.find(m => m.ticker === stock.ticker);
    
    return {
      ...stock,
      currentPrice: snapshot?.lastTrade?.p || snapshot?.day?.c || null,
      changePercent: snapshot?.todaysChangePerc || 0,
      volume: snapshot?.day?.v || 0,
      exchange: snapshot?.exchange || 'Unknown',
      hasPrice: !!(snapshot?.lastTrade?.p || snapshot?.day?.c)
    };
  });
  
  const withPrices = stocksWithPrices.filter(s => s.hasPrice);
  const withoutPrices = stocksWithPrices.filter(s => !s.hasPrice);
  
  console.log(`   Stocks with prices: ${withPrices.length}`);
  console.log(`   Stocks without prices: ${withoutPrices.length}`);
  
  if (withoutPrices.length > 0) {
    console.log(`   Tickers without prices: ${withoutPrices.map(s => s.ticker).join(', ')}`);
  }
  
  return withPrices;
}

// Simulate price filtering
function simulatePriceFiltering(stocks, minPrice = '', maxPrice = '') {
  console.log('\n🔍 SIMULATING PRICE FILTERING...');
  
  const min = minPrice === '' ? 0 : parseFloat(minPrice) || 0;
  const max = maxPrice === '' ? Infinity : parseFloat(maxPrice) || Infinity;
  
  console.log(`   Price range: $${min} - $${max === Infinity ? '∞' : max}`);
  
  const filtered = stocks.filter(stock => {
    if (!stock.currentPrice) return false;
    return stock.currentPrice >= min && stock.currentPrice <= max;
  });
  
  console.log(`   After price filtering: ${filtered.length} stocks`);
  
  return filtered;
}

// Analyze what might be filtering out stocks
function analyzeFiltering(processedStocks, finalStocks, dashboardTickers) {
  console.log('\n🔍 ANALYZING FILTERING PIPELINE...');
  console.log('=' .repeat(50));
  
  const processedTickers = new Set(processedStocks.map(s => s.ticker));
  const finalTickers = new Set(finalStocks.map(s => s.ticker));
  const dashboardSet = new Set(dashboardTickers);
  
  console.log(`📊 PIPELINE STAGES:`);
  console.log(`   1. After news processing: ${processedStocks.length} stocks`);
  console.log(`   2. After price addition: ${finalStocks.length} stocks`);
  console.log(`   3. Showing on dashboard: ${dashboardTickers.length} stocks`);
  
  // Check for preferred shares
  const preferredShares = finalStocks.filter(s => 
    s.ticker.includes('P') && s.ticker.length >= 4
  );
  console.log(`   Preferred shares found: ${preferredShares.length}`);
  
  // Check for low-price stocks
  const lowPriceStocks = finalStocks.filter(s => s.currentPrice < 5);
  console.log(`   Stocks under $5: ${lowPriceStocks.length}`);
  
  // Check for high-price stocks
  const highPriceStocks = finalStocks.filter(s => s.currentPrice > 100);
  console.log(`   Stocks over $100: ${highPriceStocks.length}`);
  
  console.log(`\n❌ STOCKS NOT ON DASHBOARD:`);
  finalStocks.forEach(stock => {
    if (!dashboardSet.has(stock.ticker)) {
      const priceStr = stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : 'No price';
      console.log(`   ${stock.ticker}: ${priceStr}, ${stock.latestMinutesAgo}min ago`);
    }
  });
  
  console.log(`\n✅ DASHBOARD STOCKS ANALYSIS:`);
  dashboardTickers.forEach(ticker => {
    const stock = finalStocks.find(s => s.ticker === ticker);
    if (stock) {
      const priceStr = stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : 'No price';
      console.log(`   ✓ ${ticker}: ${priceStr}, ${stock.latestMinutesAgo}min ago`);
    } else {
      console.log(`   ✗ ${ticker}: NOT FOUND in processed data`);
    }
  });
  
  return {
    processedCount: processedStocks.length,
    finalCount: finalStocks.length,
    dashboardCount: dashboardTickers.length,
    preferredShares: preferredShares.length,
    lowPriceStocks: lowPriceStocks.length,
    highPriceStocks: highPriceStocks.length
  };
}

// Generate specific recommendations
function generateRecommendations(analysis, finalStocks) {
  console.log('\n🔧 SPECIFIC RECOMMENDATIONS:');
  console.log('=' .repeat(40));
  
  const gap = analysis.finalCount - analysis.dashboardCount;
  
  if (gap > 0) {
    console.log(`1. 🎯 MAIN ISSUE: Dashboard missing ${gap} stocks`);
    console.log(`   - API provides ${analysis.finalCount} valid stocks`);
    console.log(`   - Dashboard only shows ${analysis.dashboardCount}`);
    console.log(`   - Check React component filtering logic`);
  }
  
  if (analysis.preferredShares > 0) {
    console.log(`\n2. 📊 PREFERRED SHARES: ${analysis.preferredShares} found`);
    console.log(`   - These might be getting filtered out`);
    console.log(`   - Consider if you want to include them`);
  }
  
  console.log(`\n3. 🔍 DEBUG YOUR REACT COMPONENTS:`);
  console.log(`   - Check useNewsData hook filtering`);
  console.log(`   - Check FilteringStats component`);
  console.log(`   - Check if price filtering is too restrictive`);
  console.log(`   - Check if there's a display limit (like .slice(0, 12))`);
  
  console.log(`\n4. 📝 IMMEDIATE ACTIONS:`);
  console.log(`   - Add console.log in useNewsData to see stock count`);
  console.log(`   - Check if there's a hardcoded limit in display`);
  console.log(`   - Verify price filtering logic`);
  
  // Show top stocks that should be displayed
  console.log(`\n5. 🎯 TOP STOCKS THAT SHOULD BE SHOWN:`);
  finalStocks.slice(0, 20).forEach((stock, i) => {
    const priceStr = stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : 'No price';
    console.log(`   ${i + 1}. ${stock.ticker}: ${priceStr}, ${stock.latestMinutesAgo}min ago`);
  });
}

// Main execution
async function main() {
  console.log('🚀 REACT PIPELINE DIAGNOSTIC');
  console.log('=' .repeat(50));
  
  const rawData = await getRecentNews();
  
  if (!rawData || !rawData.results) {
    console.log('❌ No data received');
    return;
  }
  
  console.log(`📨 Raw articles: ${rawData.results.length}`);
  
  // Step 1: Simulate current news processing
  const processedStocks = simulateCurrentNewsProcessor(rawData.results);
  
  // Step 2: Simulate adding price data
  const stocksWithPrices = await simulateAddPriceData(processedStocks);
  
  // Step 3: Simulate price filtering (no filters)
  const finalStocks = simulatePriceFiltering(stocksWithPrices);
  
  // Step 4: Analyze the pipeline
  const analysis = analyzeFiltering(processedStocks, finalStocks, DASHBOARD_TICKERS);
  
  // Step 5: Generate recommendations
  generateRecommendations(analysis, finalStocks);
  
  // Save report
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const report = {
    timestamp: new Date().toISOString(),
    analysis,
    processedStocks: processedStocks.slice(0, 20),
    finalStocks: finalStocks.slice(0, 20),
    dashboardTickers: DASHBOARD_TICKERS,
    recommendations: [
      'Check React component filtering logic',
      'Look for hardcoded display limits',
      'Verify price filtering is not too restrictive',
      'Add debugging to useNewsData hook'
    ]
  };
  
  const filename = `react-pipeline-diagnostic-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Report saved to: ${filename}`);
  console.log(`\n✅ Analysis complete!`);
  console.log(`🎯 Key finding: Check React components for filtering logic or display limits`);
}

main().catch(console.error);