"""
Polygon.io $29 Stocks Starter Plan - Complete Data Collection Script
This script pulls all available data types from Polygon.io's $29/month plan
including aggregates, snapshots, technical indicators, reference data, and news.
"""

import os
import json
import sqlite3
import requests
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
import pandas as pd
from polygon import RESTClient
from polygon.rest.models import Agg
import asyncio
import aiohttp

# Configuration
POLYGON_API_KEY = os.environ.get("POLYGON_API_KEY", "YOUR_API_KEY_HERE")
DB_PATH = "polygon_market_data.db"
LOG_FILE = "polygon_data_collection.log"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PolygonDataCollector:
    """Main class for collecting all available data from Polygon.io $29 plan"""
    
    def __init__(self, api_key: str, db_path: str = DB_PATH):
        self.api_key = api_key
        self.db_path = db_path
        self.client = RESTClient(api_key)
        self.session = requests.Session()
        self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        
        # Initialize database
        self.init_database()
        
    def init_database(self):
        """Create all necessary tables for storing Polygon data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Aggregates (bars) table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS aggregates (
            ticker TEXT,
            timestamp INTEGER,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            vwap REAL,
            timespan TEXT,
            multiplier INTEGER,
            transactions INTEGER,
            PRIMARY KEY (ticker, timestamp, timespan, multiplier)
        )
        """)
        
        # Snapshots table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            ticker TEXT,
            timestamp INTEGER,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            prev_close REAL,
            change REAL,
            change_percent REAL,
            updated_at INTEGER,
            PRIMARY KEY (ticker, timestamp)
        )
        """)
        
        # Technical indicators table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS technical_indicators (
            ticker TEXT,
            timestamp INTEGER,
            indicator_type TEXT,
            value REAL,
            signal_value REAL,
            histogram_value REAL,
            PRIMARY KEY (ticker, timestamp, indicator_type)
        )
        """)
        
        # Reference data - Tickers
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickers (
            ticker TEXT PRIMARY KEY,
            name TEXT,
            market TEXT,
            locale TEXT,
            primary_exchange TEXT,
            type TEXT,
            active BOOLEAN,
            currency_name TEXT,
            cik TEXT,
            composite_figi TEXT,
            share_class_figi TEXT,
            last_updated_utc TIMESTAMP
        )
        """)
        
        # News table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id TEXT PRIMARY KEY,
            ticker TEXT,
            title TEXT,
            author TEXT,
            published_utc TIMESTAMP,
            article_url TEXT,
            amp_url TEXT,
            image_url TEXT,
            description TEXT,
            keywords TEXT
        )
        """)
        
        # Dividends table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS dividends (
            ticker TEXT,
            ex_dividend_date DATE,
            payment_date DATE,
            record_date DATE,
            declared_date DATE,
            amount REAL,
            flag TEXT,
            currency TEXT,
            PRIMARY KEY (ticker, ex_dividend_date)
        )
        """)
        
        # Stock splits table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_splits (
            ticker TEXT,
            execution_date DATE,
            split_from REAL,
            split_to REAL,
            PRIMARY KEY (ticker, execution_date)
        )
        """)
        
        # Market holidays table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_holidays (
            date DATE PRIMARY KEY,
            name TEXT,
            exchange TEXT,
            status TEXT
        )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agg_ticker_time ON aggregates(ticker, timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_snap_ticker ON snapshots(ticker)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_ticker ON news(ticker)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_utc)")
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    
    def collect_all_tickers(self) -> List[Dict]:
        """Collect all available tickers from reference API"""
        logger.info("Collecting all available tickers...")
        all_tickers = []
        
        try:
            # Get all US stocks tickers (paginated)
            for ticker in self.client.list_tickers(
                market="stocks",
                type="CS",  # Common Stock
                active=True,
                limit=1000,
                all_pages=True
            ):
                all_tickers.append({
                    'ticker': ticker.ticker,
                    'name': ticker.name,
                    'market': ticker.market,
                    'locale': ticker.locale,
                    'primary_exchange': ticker.primary_exchange,
                    'type': ticker.type,
                    'active': ticker.active,
                    'currency_name': ticker.currency_name,
                    'cik': getattr(ticker, 'cik', None),
                    'composite_figi': getattr(ticker, 'composite_figi', None),
                    'share_class_figi': getattr(ticker, 'share_class_figi', None),
                    'last_updated_utc': getattr(ticker, 'last_updated_utc', None)
                })
            
            # Save to database
            self._save_tickers(all_tickers)
            logger.info(f"Collected {len(all_tickers)} tickers")
            
        except Exception as e:
            logger.error(f"Error collecting tickers: {e}")
            
        return all_tickers
    
    def collect_aggregates(self, ticker: str, from_date: str, to_date: str, 
                          timespan: str = "day", multiplier: int = 1):
        """Collect aggregate bars data for a ticker"""
        logger.info(f"Collecting {timespan} aggregates for {ticker} from {from_date} to {to_date}")
        
        try:
            aggs = []
            for agg in self.client.list_aggs(
                ticker=ticker,
                multiplier=multiplier,
                timespan=timespan,
                from_=from_date,
                to=to_date,
                adjusted=True,
                sort="asc",
                limit=50000  # Max allowed
            ):
                aggs.append({
                    'ticker': ticker,
                    'timestamp': agg.timestamp,
                    'open': agg.open,
                    'high': agg.high,
                    'low': agg.low,
                    'close': agg.close,
                    'volume': agg.volume,
                    'vwap': getattr(agg, 'vwap', None),
                    'timespan': timespan,
                    'multiplier': multiplier,
                    'transactions': getattr(agg, 'transactions', None)
                })
            
            if aggs:
                self._save_aggregates(aggs)
                logger.info(f"Saved {len(aggs)} aggregate records for {ticker}")
                
        except Exception as e:
            logger.error(f"Error collecting aggregates for {ticker}: {e}")
    
    def collect_snapshots(self, tickers: List[str] = None):
        """Collect current day snapshot data"""
        logger.info("Collecting market snapshots...")
        
        try:
            # Get all tickers snapshot if no specific tickers provided
            if not tickers:
                response = self.client.get_snapshot_all("stocks")
                snapshots = []
                
                for ticker_data in response:
                    if hasattr(ticker_data, 'day'):
                        snapshots.append({
                            'ticker': ticker_data.ticker,
                            'timestamp': getattr(ticker_data.day, 'timestamp', None),
                            'open': getattr(ticker_data.day, 'open', None),
                            'high': getattr(ticker_data.day, 'high', None),
                            'low': getattr(ticker_data.day, 'low', None),
                            'close': getattr(ticker_data.day, 'close', None),
                            'volume': getattr(ticker_data.day, 'volume', None),
                            'prev_close': getattr(ticker_data.prev_day, 'close', None) if hasattr(ticker_data, 'prev_day') else None,
                            'change': getattr(ticker_data, 'todays_change', None),
                            'change_percent': getattr(ticker_data, 'todays_change_percent', None),
                            'updated_at': datetime.now().timestamp()
                        })
                
                if snapshots:
                    self._save_snapshots(snapshots)
                    logger.info(f"Saved {len(snapshots)} snapshot records")
            
        except Exception as e:
            logger.error(f"Error collecting snapshots: {e}")
    
    def collect_technical_indicators(self, ticker: str, from_date: str, to_date: str):
        """Collect technical indicators for a ticker"""
        logger.info(f"Collecting technical indicators for {ticker}")
        
        indicators = ['sma', 'ema', 'rsi', 'macd']
        
        for indicator in indicators:
            try:
                url = f"https://api.polygon.io/v1/indicators/{indicator}/{ticker}"
                params = {
                    'timestamp.gte': from_date,
                    'timestamp.lte': to_date,
                    'timespan': 'day',
                    'adjusted': 'true',
                    'series_type': 'close',
                    'limit': 5000,
                    'apiKey': self.api_key
                }
                
                # Add indicator-specific parameters
                if indicator in ['sma', 'ema']:
                    params['window'] = 20
                elif indicator == 'rsi':
                    params['window'] = 14
                elif indicator == 'macd':
                    params['short_window'] = 12
                    params['long_window'] = 26
                    params['signal_window'] = 9
                
                response = self.session.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and 'values' in data['results']:
                        self._save_indicators(ticker, indicator, data['results']['values'])
                        logger.info(f"Saved {indicator} data for {ticker}")
                
            except Exception as e:
                logger.error(f"Error collecting {indicator} for {ticker}: {e}")
    
    def collect_news(self, ticker: str = None, limit: int = 1000):
        """Collect news articles"""
        logger.info(f"Collecting news{f' for {ticker}' if ticker else ' for all tickers'}...")
        
        try:
            params = {
                'limit': limit,
                'sort': 'published_utc',
                'order': 'desc',
                'apiKey': self.api_key
            }
            
            if ticker:
                params['ticker'] = ticker
            
            url = "https://api.polygon.io/v2/reference/news"
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                news_items = []
                
                for article in data.get('results', []):
                    # Handle multiple tickers per article
                    tickers = article.get('tickers', [])
                    ticker_str = tickers[0] if tickers else None
                    
                    news_items.append({
                        'id': article.get('id'),
                        'ticker': ticker_str,
                        'title': article.get('title'),
                        'author': article.get('author'),
                        'published_utc': article.get('published_utc'),
                        'article_url': article.get('article_url'),
                        'amp_url': article.get('amp_url'),
                        'image_url': article.get('image_url'),
                        'description': article.get('description'),
                        'keywords': json.dumps(article.get('keywords', []))
                    })
                
                if news_items:
                    self._save_news(news_items)
                    logger.info(f"Saved {len(news_items)} news articles")
                    
        except Exception as e:
            logger.error(f"Error collecting news: {e}")
    
    def collect_dividends(self, ticker: str = None):
        """Collect dividend data"""
        logger.info(f"Collecting dividends{f' for {ticker}' if ticker else ''}...")
        
        try:
            dividends = []
            params = {'limit': 1000}
            
            if ticker:
                params['ticker'] = ticker
            
            for dividend in self.client.list_dividends(**params):
                dividends.append({
                    'ticker': dividend.ticker,
                    'ex_dividend_date': dividend.ex_dividend_date,
                    'payment_date': dividend.payment_date,
                    'record_date': dividend.record_date,
                    'declared_date': getattr(dividend, 'declaration_date', None),
                    'amount': dividend.cash_amount,
                    'flag': getattr(dividend, 'dividend_type', None),
                    'currency': dividend.currency
                })
            
            if dividends:
                self._save_dividends(dividends)
                logger.info(f"Saved {len(dividends)} dividend records")
                
        except Exception as e:
            logger.error(f"Error collecting dividends: {e}")
    
    def collect_splits(self, ticker: str = None):
        """Collect stock split data"""
        logger.info(f"Collecting splits{f' for {ticker}' if ticker else ''}...")
        
        try:
            splits = []
            params = {'limit': 1000}
            
            if ticker:
                params['ticker'] = ticker
            
            for split in self.client.list_splits(**params):
                splits.append({
                    'ticker': split.ticker,
                    'execution_date': split.execution_date,
                    'split_from': split.split_from,
                    'split_to': split.split_to
                })
            
            if splits:
                self._save_splits(splits)
                logger.info(f"Saved {len(splits)} split records")
                
        except Exception as e:
            logger.error(f"Error collecting splits: {e}")
    
    def collect_market_holidays(self):
        """Collect market holiday data"""
        logger.info("Collecting market holidays...")
        
        try:
            holidays = []
            for holiday in self.client.get_market_holidays():
                holidays.append({
                    'date': holiday.date,
                    'name': holiday.name,
                    'exchange': holiday.exchange,
                    'status': holiday.status
                })
            
            if holidays:
                self._save_holidays(holidays)
                logger.info(f"Saved {len(holidays)} holiday records")
                
        except Exception as e:
            logger.error(f"Error collecting holidays: {e}")
    
    # Database save methods
    def _save_tickers(self, tickers: List[Dict]):
        """Save tickers to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO tickers 
            (ticker, name, market, locale, primary_exchange, type, active, 
             currency_name, cik, composite_figi, share_class_figi, last_updated_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(t['ticker'], t['name'], t['market'], t['locale'], 
               t['primary_exchange'], t['type'], t['active'], t['currency_name'],
               t['cik'], t['composite_figi'], t['share_class_figi'], 
               t['last_updated_utc']) for t in tickers])
        
        conn.commit()
        conn.close()
    
    def _save_aggregates(self, aggs: List[Dict]):
        """Save aggregate data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO aggregates 
            (ticker, timestamp, open, high, low, close, volume, vwap, 
             timespan, multiplier, transactions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(a['ticker'], a['timestamp'], a['open'], a['high'], a['low'], 
               a['close'], a['volume'], a['vwap'], a['timespan'], 
               a['multiplier'], a['transactions']) for a in aggs])
        
        conn.commit()
        conn.close()
    
    def _save_snapshots(self, snapshots: List[Dict]):
        """Save snapshot data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO snapshots 
            (ticker, timestamp, open, high, low, close, volume, prev_close, 
             change, change_percent, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(s['ticker'], s['timestamp'], s['open'], s['high'], s['low'], 
               s['close'], s['volume'], s['prev_close'], s['change'], 
               s['change_percent'], s['updated_at']) for s in snapshots])
        
        conn.commit()
        conn.close()
    
    def _save_indicators(self, ticker: str, indicator_type: str, values: List[Dict]):
        """Save technical indicator data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        data = []
        for value in values:
            data.append((
                ticker,
                value.get('timestamp'),
                indicator_type,
                value.get('value'),
                value.get('signal', None),
                value.get('histogram', None)
            ))
        
        cursor.executemany("""
            INSERT OR REPLACE INTO technical_indicators 
            (ticker, timestamp, indicator_type, value, signal_value, histogram_value)
            VALUES (?, ?, ?, ?, ?, ?)
        """, data)
        
        conn.commit()
        conn.close()
    
    def _save_news(self, news_items: List[Dict]):
        """Save news data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR IGNORE INTO news 
            (id, ticker, title, author, published_utc, article_url, 
             amp_url, image_url, description, keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(n['id'], n['ticker'], n['title'], n['author'], n['published_utc'],
               n['article_url'], n['amp_url'], n['image_url'], n['description'],
               n['keywords']) for n in news_items])
        
        conn.commit()
        conn.close()
    
    def _save_dividends(self, dividends: List[Dict]):
        """Save dividend data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO dividends 
            (ticker, ex_dividend_date, payment_date, record_date, 
             declared_date, amount, flag, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [(d['ticker'], d['ex_dividend_date'], d['payment_date'], 
               d['record_date'], d['declared_date'], d['amount'], 
               d['flag'], d['currency']) for d in dividends])
        
        conn.commit()
        conn.close()
    
    def _save_splits(self, splits: List[Dict]):
        """Save split data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO stock_splits 
            (ticker, execution_date, split_from, split_to)
            VALUES (?, ?, ?, ?)
        """, [(s['ticker'], s['execution_date'], s['split_from'], 
               s['split_to']) for s in splits])
        
        conn.commit()
        conn.close()
    
    def _save_holidays(self, holidays: List[Dict]):
        """Save holiday data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT OR REPLACE INTO market_holidays 
            (date, name, exchange, status)
            VALUES (?, ?, ?, ?)
        """, [(h['date'], h['name'], h['exchange'], h['status']) for h in holidays])
        
        conn.commit()
        conn.close()
    
    def run_complete_collection(self, tickers: List[str] = None, days_back: int = 30):
        """Run a complete data collection for specified tickers"""
        start_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')
        
        logger.info(f"Starting complete data collection from {start_date} to {end_date}")
        
        # Collect reference data
        if not tickers:
            all_tickers = self.collect_all_tickers()
            tickers = [t['ticker'] for t in all_tickers[:100]]  # Limit for demo
        
        # Collect market-wide data
        self.collect_market_holidays()
        self.collect_snapshots()
        self.collect_news(limit=1000)
        self.collect_dividends()
        self.collect_splits()
        
        # Collect per-ticker data
        for i, ticker in enumerate(tickers):
            logger.info(f"Processing {ticker} ({i+1}/{len(tickers)})")
            
            # Collect different timeframes
            self.collect_aggregates(ticker, start_date, end_date, 'day', 1)
            self.collect_aggregates(ticker, start_date, end_date, 'hour', 1)
            self.collect_aggregates(ticker, start_date, end_date, 'minute', 5)
            
            # Collect technical indicators
            self.collect_technical_indicators(ticker, start_date, end_date)
            
            # Collect ticker-specific news
            self.collect_news(ticker, limit=50)
            
            # Be respectful of rate limits (even though $29 plan has unlimited)
            time.sleep(0.1)
        
        logger.info("Complete data collection finished!")
        self.generate_summary_report()
    
    def generate_summary_report(self):
        """Generate a summary report of collected data"""
        conn = sqlite3.connect(self.db_path)
        
        summary = {
            'tickers': conn.execute("SELECT COUNT(*) FROM tickers").fetchone()[0],
            'aggregates': conn.execute("SELECT COUNT(*) FROM aggregates").fetchone()[0],
            'snapshots': conn.execute("SELECT COUNT(*) FROM snapshots").fetchone()[0],
            'indicators': conn.execute("SELECT COUNT(*) FROM technical_indicators").fetchone()[0],
            'news': conn.execute("SELECT COUNT(*) FROM news").fetchone()[0],
            'dividends': conn.execute("SELECT COUNT(*) FROM dividends").fetchone()[0],
            'splits': conn.execute("SELECT COUNT(*) FROM stock_splits").fetchone()[0],
            'holidays': conn.execute("SELECT COUNT(*) FROM market_holidays").fetchone()[0]
        }
        
        logger.info("=== Data Collection Summary ===")
        for table, count in summary.items():
            logger.info(f"{table}: {count:,} records")
        
        # Get date ranges
        date_range = conn.execute("""
            SELECT MIN(timestamp), MAX(timestamp) 
            FROM aggregates 
            WHERE timestamp IS NOT NULL
        """).fetchone()
        
        if date_range[0]:
            logger.info(f"Date range: {datetime.fromtimestamp(date_range[0]/1000)} to {datetime.fromtimestamp(date_range[1]/1000)}")
        
        conn.close()


def main():
    """Main execution function"""
    # Create collector instance
    collector = PolygonDataCollector(POLYGON_API_KEY)
    
    # Option 1: Collect data for specific tickers
    # tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    # collector.run_complete_collection(tickers=tickers, days_back=30)
    
    # Option 2: Collect data for top 100 most active stocks
    collector.run_complete_collection(tickers=None, days_back=30)
    
    # Option 3: Collect only specific data types
    # collector.collect_all_tickers()
    # collector.collect_snapshots()
    # collector.collect_news(limit=5000)
    
    logger.info("Data collection completed!")


if __name__ == "__main__":
    main()