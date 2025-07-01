# Simple React + Express App

A clean, minimal setup with React frontend and Express backend.

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev
```

- **Frontend (React + Vite)**: http://localhost:3000
- **Backend (Express)**: http://localhost:3001

### Production
```bash
# Build and start production server
npm run build
npm start
```

Visit http://localhost:3001 for the production app.

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Backend**: Express.js
- **Development**: Concurrent dev servers
- **Production**: Single Express server serving built React app

## 📁 Project Structure

```
├── backend/
│   └── server.js          # Express server
├── index.html             # HTML template
├── main.jsx               # React entry point
├── App.jsx                # Main React component
├── style.css              # Tailwind CSS
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── Dockerfile             # Container configuration
```

## 🐳 Docker

```bash
# Build image
docker build -t simple-app .

# Run container
docker run -p 3001:3001 simple-app
```

## 📝 API Endpoints

- `GET /api/health` - Health check
- `GET /api/hello` - Simple test endpoint

## 🎯 Features

- ⚡ Fast development with Vite HMR
- 🎨 Tailwind CSS for styling
- 🔄 Automatic API proxy in development
- 📦 Single production build
- 🐳 Docker ready
- 📱 Responsive design

Ready to build something awesome! 🚀