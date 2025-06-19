import fs from 'fs';
import path from 'path';

export async function createTemplateFiles(payload, workflowType = 'public', azureConfig = null) {
  // Base template files
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

  // Add the appropriate workflow file
  const workflowFile = await getWorkflowFile(workflowType, payload, azureConfig);
  if (workflowFile) {
    templateFiles.push(workflowFile);
  }

  return templateFiles;
}

async function getWorkflowFile(workflowType, payload, azureConfig = null) {
  const workflowTemplates = {
    'public': 'templates/workflows/build-public.yml',
    'azure': 'templates/workflows/build-deploy-azure.yml', 
    'private': 'templates/workflows/build-deploy-private.yml'
  };

  const templatePath = workflowTemplates[workflowType];
  if (!templatePath) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }

  try {
    // Read the template file
    let workflowContent = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders
    workflowContent = workflowContent.replace(/{{REPO_NAME}}/g, payload.repoName);
    
    if (azureConfig) {
      workflowContent = workflowContent.replace(/{{AZURE_APP_NAME}}/g, azureConfig.appName);
      workflowContent = workflowContent.replace(/{{AZURE_RESOURCE_GROUP}}/g, azureConfig.resourceGroup);
    }

    return {
      path: '.github/workflows/build.yml',
      content: workflowContent
    };
  } catch (error) {
    console.error(`Error reading workflow template: ${templatePath}`, error);
    return null;
  }
}

function generatePackageJson(payload) {
  return JSON.stringify({
    "name": payload.repoName,
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

function generateWorkflow(payload) {
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
        images: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}
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
        echo "- Repository: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}"
        echo "- Tags: latest, v\${{ github.run_number }}, \${{ steps.short_sha.outputs.sha }}"
        echo "- Build Number: \${{ github.run_number }}"
        echo "- Commit: \${{ steps.short_sha.outputs.sha }}"
        echo ""
        echo "🚀 Ready for Azure deployment!"
        echo "Use this image: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}:latest"`;
}

function generateAzureIntegratedWorkflow(payload, azureConfig) {
  return `name: Build and Deploy to Azure Container Apps

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # Required for Azure OIDC
    
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
        images: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}
        tags: |
          type=raw,value=latest,enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=v\${{ github.run_number }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=\${{ steps.short_sha.outputs.sha }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    # Deploy only on main branch
    - name: Azure Login with OIDC
      if: github.ref == 'refs/heads/main'
      uses: azure/login@v2
      with:
        client-id: \${{ secrets.AZURE_CLIENT_ID }}
        tenant-id: \${{ secrets.AZURE_TENANT_ID }}
        subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}
        
    - name: Deploy to Azure Container Apps
      if: github.ref == 'refs/heads/main'
      run: |
        echo "🚀 Deploying to Azure Container Apps..."
        
        az containerapp update \\
          --name ${azureConfig.appName} \\
          --resource-group ${azureConfig.resourceGroup} \\
          --image ghcr.io/\${{ github.repository_owner }}/${payload.repoName}:latest
        
        echo "✅ Deployment completed successfully!"
        
    - name: Get App URL
      if: github.ref == 'refs/heads/main'
      run: |
        APP_URL=$(az containerapp show \\
          --name ${azureConfig.appName} \\
          --resource-group ${azureConfig.resourceGroup} \\
          --query 'properties.configuration.ingress.fqdn' \\
          --output tsv)
        
        echo "🌐 Application URL: https://$APP_URL"
        echo "📦 Image: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}:latest"
        echo "🏷️ Build: v\${{ github.run_number }}"`;
}

function generatePrivateWorkflow(payload) {
  return `name: Build and Deploy to Azure (Private)

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Login to GitHub Container Registry (Private)
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: \${{ github.actor }}
        password: \${{ secrets.GHCR_TOKEN }}  # Uses PAT instead of GITHUB_TOKEN
        
    - name: Create short SHA
      id: short_sha
      run: echo "sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
    - name: Extract metadata for Docker
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ghcr.io/\${{ github.repository_owner }}/${payload.repoName}
        tags: |
          type=raw,value=latest,enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=v\${{ github.run_number }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          type=raw,value=\${{ steps.short_sha.outputs.sha }},enable=\${{ github.ref == format('refs/heads/{0}', 'main') }}
          
    - name: Build and push Docker image (Private)
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    # Deploy only on main branch
    - name: Azure Login with OIDC
      if: github.ref == 'refs/heads/main'
      uses: azure/login@v2
      with:
        client-id: \${{ secrets.AZURE_CLIENT_ID }}
        tenant-id: \${{ secrets.AZURE_TENANT_ID }}
        subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}
        
    - name: Configure private registry access
      if: github.ref == 'refs/heads/main'
      run: |
        echo "🔐 Configuring private registry access..."
        
        az containerapp registry set \\
          --name \${{ secrets.AZURE_APP_NAME }} \\
          --resource-group \${{ secrets.AZURE_RESOURCE_GROUP }} \\
          --server ghcr.io \\
          --username \${{ github.actor }} \\
          --password \${{ secrets.GHCR_TOKEN }}
        
    - name: Deploy to Azure Container Apps (Private)
      if: github.ref == 'refs/heads/main'
      run: |
        echo "🚀 Deploying private image to Azure..."
        
        az containerapp update \\
          --name \${{ secrets.AZURE_APP_NAME }} \\
          --resource-group \${{ secrets.AZURE_RESOURCE_GROUP }} \\
          --image ghcr.io/\${{ github.repository_owner }}/${payload.repoName}:latest
        
        echo "✅ Private deployment completed!"`;
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

function generateReadme(payload) {
  return `# ${payload.repoName}

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
docker build -t ${payload.repoName} .
docker run -p 3000:3000 ${payload.repoName}
\`\`\`

## ☁️ Azure Deployment

This template is optimized for Azure Container Apps with automatic GitHub Actions deployment.

### Container Image
- **Registry**: ghcr.io/${payload.githubOwner}/${payload.repoName}
- **Latest**: ghcr.io/${payload.githubOwner}/${payload.repoName}:latest

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