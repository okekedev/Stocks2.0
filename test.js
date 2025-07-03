// debug-ticker-mismatch.js
// Check for mismatches between tickers array and insights

import https from 'https';
import fs from 'fs';

const API_KEY = process.env.VITE_POLYGON_API_KEY || 'XdjkNaeEDf5dSrjflNopslWWJdG_xZZm';

if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ Please set VITE_POLYGON_API_KEY environment variable');
  process.exit(1);
}

function getRecentNews() {
  return new Promise((resolve) => {
    const url = new URL('https://api.polygon.io/v2/reference/news');
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('limit', 200);
    url.searchParams.set('order', 'desc');
    url.searchParams.set('sort', 'published_utc');
    
    console.log('🔍 Fetching recent news to debug ticker mismatches...');
    
    https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          console.log(`❌ Parse Error: ${error.message}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ HTTP Error: ${err.message}`);
      resolve(null);
    });
  });
}

function analyzeMismatches(articles) {
  console.log('\n🔍 Analyzing ticker vs insights mismatches...');
  
  let totalArticles = 0;
  let articlesWithMismatches = 0;
  let missedTickers = new Set();
  let tickerOnlyInInsights = new Map(); // ticker -> count
  
  const examples = [];
  
  articles.forEach(article => {
    if (!article.insights || !article.tickers) return;
    
    totalArticles++;
    
    // Get all tickers mentioned in insights
    const insightTickers = article.insights.map(insight => insight.ticker);
    const articleTickers = article.tickers.map(t => t.toString().toUpperCase());
    
    // Find tickers in insights but not in article.tickers
    const missingFromTickers = insightTickers.filter(ticker => 
      !articleTickers.includes(ticker.toUpperCase())
    );
    
    if (missingFromTickers.length > 0) {
      articlesWithMismatches++;
      
      missingFromTickers.forEach(ticker => {
        missedTickers.add(ticker);
        tickerOnlyInInsights.set(ticker, (tickerOnlyInInsights.get(ticker) || 0) + 1);
      });
      
      // Save example
      if (examples.length < 5) {
        const insightsForMissed = article.insights.filter(insight => 
          missingFromTickers.includes(insight.ticker)
        );
        
        examples.push({
          title: article.title?.slice(0, 60) + '...',
          articleTickers: articleTickers,
          insightTickers: insightTickers,
          missedTickers: missingFromTickers,
          missedInsights: insightsForMissed
        });
      }
    }
  });
  
  return {
    totalArticles,
    articlesWithMismatches,
    missedTickers: Array.from(missedTickers),
    tickerCounts: Array.from(tickerOnlyInInsights.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20),
    examples
  };
}

function createCombinedTickerAnalysis(articles) {
  console.log('\n🔧 Creating COMBINED ticker analysis (tickers + insights)...');
  
  const tickerData = new Map();
  
  articles.forEach(article => {
    if (!article.insights) return;
    
    const minutesAgo = Math.floor((Date.now() - new Date(article.published_utc)) / (1000 * 60));
    
    // Get ALL tickers - from both tickers array AND insights
    const allTickers = new Set();
    
    // Add from tickers array
    if (article.tickers) {
      article.tickers.forEach(ticker => {
        const clean = ticker.toString().toUpperCase().trim();
        if (clean.length <= 5 && /^[A-Z]+$/.test(clean)) {
          allTickers.add(clean);
        }
      });
    }
    
    // Add from insights
    article.insights.forEach(insight => {
      if (insight.ticker) {
        const clean = insight.ticker.toString().toUpperCase().trim();
        if (clean.length <= 5 && /^[A-Z]+$/.test(clean)) {
          allTickers.add(clean);
        }
      }
    });
    
    // Process each unique ticker
    allTickers.forEach(ticker => {
      if (!tickerData.has(ticker)) {
        tickerData.set(ticker, {
          positive: [],
          neutral: [],
          negative: [],
          total: 0,
          mostRecentMinutes: Infinity
        });
      }
      
      // Find sentiment for this ticker
      const tickerInsight = article.insights.find(insight => 
        insight.ticker?.toUpperCase() === ticker
      );
      
      const sentiment = tickerInsight?.sentiment || 'unknown';
      
      const data = tickerData.get(ticker);
      data.total++;
      data.mostRecentMinutes = Math.min(data.mostRecentMinutes, minutesAgo);
      
      const articleSummary = {
        title: article.title?.slice(0, 50) + '...',
        sentiment: sentiment,
        minutesAgo: minutesAgo,
        reasoning: tickerInsight?.sentiment_reasoning || 'No specific insight',
        inTickersArray: article.tickers?.includes(ticker) || false
      };
      
      if (sentiment === 'positive') {
        data.positive.push(articleSummary);
      } else if (sentiment === 'neutral') {
        data.neutral.push(articleSummary);
      } else if (sentiment === 'negative') {
        data.negative.push(articleSummary);
      }
    });
  });
  
  return tickerData;
}

// Main execution
console.log('🚀 Starting ticker mismatch analysis...');

const rawData = await getRecentNews();

if (!rawData || !rawData.results) {
  console.log('❌ No data received');
  process.exit(1);
}

console.log(`📊 Analyzing ${rawData.results.length} articles...`);

// Analyze mismatches
const mismatchAnalysis = analyzeMismatches(rawData.results);

console.log('\n📋 MISMATCH ANALYSIS RESULTS:');
console.log(`Total articles: ${mismatchAnalysis.totalArticles}`);
console.log(`Articles with mismatches: ${mismatchAnalysis.articlesWithMismatches}`);
console.log(`Mismatch rate: ${((mismatchAnalysis.articlesWithMismatches / mismatchAnalysis.totalArticles) * 100).toFixed(1)}%`);
console.log(`Total missed tickers: ${mismatchAnalysis.missedTickers.length}`);

console.log('\n🏆 TOP MISSED TICKERS (only in insights):');
mismatchAnalysis.tickerCounts.slice(0, 10).forEach(([ticker, count]) => {
  console.log(`${ticker}: ${count} times`);
});

console.log('\n📝 EXAMPLES OF MISMATCHES:');
mismatchAnalysis.examples.forEach((example, i) => {
  console.log(`\n${i + 1}. ${example.title}`);
  console.log(`   Article tickers: [${example.articleTickers.join(', ')}]`);
  console.log(`   Insight tickers: [${example.insightTickers.join(', ')}]`);
  console.log(`   MISSED: [${example.missedTickers.join(', ')}]`);
  
  example.missedInsights.forEach(insight => {
    console.log(`   → ${insight.ticker}: ${insight.sentiment} - ${insight.sentiment_reasoning?.slice(0, 60)}...`);
  });
});

// Create combined analysis
const combinedData = createCombinedTickerAnalysis(rawData.results);

// Filter for positive sentiment
const goodTickers = [];
combinedData.forEach((data, ticker) => {
  const positiveRatio = data.positive.length / data.total;
  if (data.positive.length > 0 && positiveRatio >= 0.5) {
    goodTickers.push({
      ticker,
      total: data.total,
      positive: data.positive.length,
      positiveRatio,
      mostRecent: data.mostRecentMinutes
    });
  }
});

goodTickers.sort((a, b) => b.positive - a.positive);

console.log('\n🎯 COMBINED ANALYSIS - GOOD TICKERS:');
console.log(`Found ${goodTickers.length} tickers with positive sentiment`);

console.log('\nTop 15 by positive count:');
goodTickers.slice(0, 15).forEach((ticker, i) => {
  console.log(`${i + 1}. ${ticker.ticker}: ${ticker.positive} positive out of ${ticker.total} total (${(ticker.positiveRatio * 100).toFixed(1)}%)`);
});

// Save detailed analysis
const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
const filename = `mismatch-analysis-${timestamp}.json`;

const detailedReport = {
  summary: mismatchAnalysis,
  combined_ticker_data: Object.fromEntries(combinedData),
  good_tickers: goodTickers
};

fs.writeFileSync(filename, JSON.stringify(detailedReport, null, 2));
console.log(`\n💾 Detailed analysis saved to: ${filename}`);

console.log('\n✅ Analysis complete!');
console.log(`🔑 Key finding: We're missing ${mismatchAnalysis.missedTickers.length} tickers that only appear in insights!`);