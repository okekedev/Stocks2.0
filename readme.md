# Stocks2 - Advanced Stock News & AI Analysis Platform

An intelligent stock monitoring and analysis platform that combines real-time market news with AI-powered predictions to help traders make informed decisions.

## 🎯 What Stocks2 Does

**Stocks2** is a comprehensive financial analysis tool that:
- **Monitors Breaking News**: Fetches the latest market news from Polygon.io every 5 minutes
- **Filters for Positive Sentiment**: Automatically identifies stocks with positive news coverage
- **Provides Real-Time Prices**: Updates stock prices every minute with live market data
- **AI-Powered Predictions**: Uses Google Gemini AI to generate 8-hour price forecasts
- **Technical Analysis**: Incorporates chart patterns and market data for comprehensive analysis
- **Dividend Calendar**: Shows upcoming dividend dates with yield calculations

## 🚀 Core Features

### 📰 **Smart News Monitoring**
- Fetches news from the last 4 hours across all major exchanges
- Extracts stock tickers mentioned in news articles
- Filters for positive sentiment and recent coverage (under 2 hours)
- Displays news recency with minute-level precision

### 🤖 **AI-Powered Analysis**
- **8-Hour Price Predictions** using Google Gemini 2.5 Flash
- Full article content analysis for deeper insights
- Technical pattern recognition and anomaly detection
- Confidence scoring for each prediction
- Persistent analysis storage across sessions

### 💹 **Real-Time Market Data**
- Live price updates every minute
- Price change animations with visual indicators
- Volume, exchange, and percentage change tracking
- Price filtering to focus on specific ranges
- Support for all major US exchanges

### 📊 **Advanced Features**
- **Dividend Calendar**: Next week's ex-dividend dates with yield analysis
- **Interactive Analysis Terminal**: Real-time AI analysis with detailed logs
- **Sorting & Filtering**: By price, news recency, AI signals, or alphabetical
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern UI framework with hooks
- **Vite 5** - Fast development and optimized builds
- **Tailwind CSS** - Utility-first styling with custom animations
- **Lucide React** - Beautiful, consistent icons

### **APIs & Services**
- **Polygon.io** - Real-time market data and news
- **Google Gemini AI** - Advanced natural language processing
- **Article Fetcher** - Full content extraction from news sources
- **Enhanced Technical Service** - Pattern analysis and anomaly detection

### **Deployment**
- **Docker** - Containerized deployment
- **Azure Container Apps** - Cloud hosting
- **GitHub Actions** - Automated CI/CD pipeline

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.jsx              # App header with live updates
│   ├── FilteringStats.jsx      # Stock count and filtering
│   ├── NewsTable.jsx           # Main data table with sorting
│   ├── AIWorker.jsx            # AI analysis terminal
│   ├── DividendCalendar.jsx    # Dividend tracking
│   ├── LoadingSpinner.jsx      # Loading states
│   ├── ErrorDisplay.jsx       # Error handling
│   └── Footer.jsx              # App footer
├── hooks/
│   └── useNewsData.jsx         # Main data management hook
├── services/
│   ├── PolygonService.jsx      # Market data API
│   ├── GeminiService.jsx       # AI analysis service
│   ├── NewsProcessor.jsx       # News filtering logic
│   ├── ArticleFetcher.jsx      # Content extraction
│   └── EnhancedTechnicalService.jsx # Technical analysis
├── styles/
│   └── style.css               # Tailwind + custom CSS
├── App.jsx                     # Main application component
└── main.jsx                    # React entry point
```

## 🔧 Installation & Setup

### **Prerequisites**
- Node.js 18+
- Polygon.io API key
- Google Gemini API key

### **Environment Variables**
Create a `.env` file:
```env
VITE_POLYGON_API_KEY=your_polygon_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### **Development**
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
- **Development**: http://localhost:5173

### **Production**
```bash
# Build for production
npm run build

# Start production server
npm start
```
- **Production**: http://localhost:3000

## 🐳 Docker Deployment

### **Local Docker**
```bash
# Build image
docker build -t stocks2 .

# Run container
docker run -p 3000:3000 \
  -e VITE_POLYGON_API_KEY=your_key \
  -e VITE_GEMINI_API_KEY=your_key \
  stocks2
```

### **Azure Container Apps**
The app includes automated deployment via GitHub Actions:
- Builds Docker image on push to main
- Deploys to Azure Container Apps
- Uses private GitHub Container Registry
- Automatic health checks and scaling

## 🎮 How to Use

### **1. Monitor Breaking News**
- View stocks with recent positive news coverage
- See how many minutes ago news broke
- Filter by price range to focus on your budget

### **2. AI Analysis**
- Click "Predict 8H" on any stock for AI analysis
- Watch real-time analysis in the terminal interface
- Get 8-hour price predictions with confidence scores
- View detailed reasoning and technical patterns

### **3. Track Dividends**
- Check upcoming dividend ex-dates
- See dividend yields and amounts
- Sort by yield to find best income opportunities

### **4. Real-Time Monitoring**
- Prices update every minute automatically
- News refreshes every 5 minutes
- Visual indicators show price changes
- Persistent AI analysis across sessions

## 📊 Key Metrics Displayed

- **Stock Price**: Real-time with change percentage
- **News Recency**: Minutes since latest positive news
- **AI Signal**: BUY/HOLD/SELL with percentage confidence
- **8-Hour Forecast**: Predicted price movement
- **Volume**: Current trading activity
- **Dividend Info**: Upcoming payments and yields

## 🔒 Security & Privacy

- API keys stored securely in environment variables
- No sensitive data persisted in browser storage
- HTTPS-only communication with all APIs
- Container-based deployment for isolation

## 📈 Performance

- **Sub-second loading** with optimized Vite builds
- **Efficient API usage** with intelligent caching
- **Real-time updates** without full page refreshes
- **Mobile-optimized** responsive design

## 🚀 Future Enhancements

- Options chain analysis
- Portfolio tracking
- Price alerts and notifications
- Extended prediction timeframes
- Social sentiment integration
- Advanced charting capabilities

---

**Stocks2** - Making smart investment decisions through AI-powered market analysis.

*Built for traders who want to stay ahead of the market with intelligent automation and real-time insights.*