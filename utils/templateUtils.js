// utils/templateUtils.js - Simplified Version

import fs from 'fs';
import path from 'path';

export async function createTemplateFiles(payload, workflowType = 'public', azureConfig = null) {
  // Base template files (unchanged)
  const templateFiles = [
    {
      path: 'package.json',
      content: generatePackageJson(payload)
    },
    {
      path: 'Dockerfile',
      content: generateDockerfile()
    },
    {
      path: 'vite.config.js',
      content: generateViteConfig()
    },
    {
      path: 'tailwind.config.js',
      content: generateTailwindConfig()
    },
    {
      path: 'postcss.config.js',
      content: generatePostcssConfig()
    },
    {
      path: 'index.html',
      content: generateIndexHtml()
    },
    {
      path: 'main.jsx',
      content: generateMainJsx()
    },
    {
      path: 'App.jsx',
      content: generateAppJsx()
    },
    {
      path: 'style.css',
      content: generateStyleCss()
    },
    {
      path: '.gitignore',
      content: generateGitignore()
    },
    {
      path: '.dockerignore',
      content: generateDockerignore()
    },
    {
      path: 'README.md',
      content: generateReadme(payload)
    }
  ];

  // ALWAYS include the public workflow by default
  // Users will have this immediately when they clone/download
  templateFiles.push({
    path: '.github/workflows/build.yml',
    content: generatePublicWorkflow(payload)
  });

  return templateFiles;
}

// Default public workflow - no placeholders, ready to use
function generatePublicWorkflow(payload = {}) {
  const repoName = payload.repoName || '{{REPO_NAME}}'; // Fallback to placeholder
  
  return `name: Build and Push Container Image

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Login to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: \${{ github.actor }}
        password: \${{ secrets.GITHUB_TOKEN }}
        
    - name: Create short SHA
      id: short_sha
      run: echo "sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
    - name: Extract metadata for Docker
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ghcr.io/\${{ github.repository_owner }}/${repoName}
        tags: |
          type=raw,value=latest,enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=v\${{ github.run_number }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=\${{ steps.short_sha.outputs.sha }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=ref,event=pr
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        
    - name: Display image information
      if: github.ref == 'refs/heads/main'
      run: |
        echo "🎉 Docker image built and pushed successfully!"
        echo ""
        echo "📦 Image Details:"
        echo "- Repository: ghcr.io/\${{ github.repository_owner }}/${repoName}"
        echo "- Tags: latest, v\${{ github.run_number }}, \${{ steps.short_sha.outputs.sha }}"
        echo "- Build Number: \${{ github.run_number }}"
        echo "- Commit: \${{ steps.short_sha.outputs.sha }}"
        echo ""
        echo "🚀 Ready for Azure deployment!"
        echo "Use this image: ghcr.io/\${{ github.repository_owner }}/${repoName}:latest"`;
}

// Update existing functions to remove GitHub-specific logic
function generatePackageJson(payload = {}) {
  const repoName = payload.repoName || 'azure-container-template';
  
  return JSON.stringify({
    "name": repoName,
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
      "dev:client": "vite",
      "dev:server": "node server.js",
      "build": "vite build",
      "preview": "vite preview",
      "start": "node server.js"
    },
    "devDependencies": {
      "vite": "^5.0.0",
      "concurrently": "^8.2.0",
      "tailwindcss": "^3.3.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.0.0",
      "framer-motion": "^10.16.0",
      "lucide-react": "^0.263.1",
      "express": "^4.18.0",
      "cors": "^2.8.5",
      "ws": "^8.14.0"
    }
  }, null, 2);
}

function generateReadme(payload = {}) {
  const repoName = payload.repoName || 'azure-container-template';
  
  return `# ${repoName}

Azure Container Template - A modern React application ready for Azure Container Apps deployment.

## 🚀 Quick Start

### Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production Build
\`\`\`bash
npm run build
npm run preview
\`\`\`

## 🐳 Docker Deployment

### Build and run locally
\`\`\`bash
docker build -t ${repoName} .
docker run -p 3000:3000 ${repoName}
\`\`\`

## ☁️ Azure Deployment

This template is optimized for Azure Container Apps with automatic GitHub Actions deployment.

### Setup Instructions

1. **GitHub Setup**: Push this code to your GitHub repository
2. **GitHub Actions**: The workflow will automatically build and push to GHCR
3. **Azure Setup**: Use the web interface to configure Azure resources
4. **Deploy**: Update your Azure Container App with the built image

### Container Image
- **Registry**: ghcr.io/[your-username]/${repoName}
- **Latest**: ghcr.io/[your-username]/${repoName}:latest

## 🛠️ Features

- ⚡ Vite + React for fast development
- 🐳 Docker-ready configuration
- ☁️ Azure Container Apps optimized
- 🔄 GitHub Actions CI/CD
- 📱 Responsive design
- 🎨 Tailwind CSS styling

## 📄 License

MIT License - feel free to use this template for your projects!`;
}

// Keep all other generation functions unchanged...
function generateDockerfile() {
  return `# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 3000 (Vite preview default)
EXPOSE 3000

# Start the preview server
CMD ["npm", "run", "preview"]`;
}

function generateViteConfig() {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  }
})`;
}

function generateTailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,jsx}"
  ],
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 6s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}`;
}

function generatePostcssConfig() {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
}

function generateIndexHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Azure Container Template</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>`;
}

function generateMainJsx() {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
}

function generateAppJsx() {
  return `import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to your <span className="text-purple-400">container</span>
        </h1>
        <p className="text-gray-300 text-lg">
          Azure Container Template - Successfully Deployed!
        </p>
        <div className="mt-8 p-6 bg-slate-800/50 rounded-xl backdrop-blur">
          <p className="text-green-400 mb-2">✅ Container is running</p>
          <p className="text-blue-400 mb-2">🚀 Ready for customization</p>
          <p className="text-purple-400">🎉 Deployed on Azure Container Apps</p>
        </div>
      </div>
    </div>
  )
}

export default App`;
}

function generateStyleCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
}`;
}

function generateGitignore() {
  return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/`;
}

function generateDockerignore() {
  return `node_modules
npm-debug.log
dist
.git
.gitignore
README.md
.env
.nyc_output
coverage
.docker
Dockerfile*
docker-compose*
.vscode
.idea`;
}