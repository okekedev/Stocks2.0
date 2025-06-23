# Azure Container Template

A modern React + Express.js application template with an interactive web interface for Azure Container Apps deployment. Features real-time deployment monitoring, automated GitHub Actions workflows, and OIDC authentication.

![Azure Container Template Interface](Azure%20Dev.png)

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev
```

- **Frontend (React + Vite)**: http://localhost:3000
- **Backend (Express + WebSocket)**: http://localhost:3001

### Production
```bash
# Build and start production server
npm run build
npm start
```

Visit http://localhost:3000 to access the deployment interface.

## 🎯 6-Step Deployment Process

### **For Public Repositories (Steps 1-4):**
1. **GitHub Sync** - View repository setup instructions
2. **Azure Setup** - Configure Azure Container Apps resources  
3. **CI/CD Setup** - Configure OIDC authentication and secrets
4. **Download Standard Workflow** - Get workflow file with GITHUB_TOKEN

### **For Private Repositories (Steps 1-6):**
1. **GitHub Sync** - View repository setup instructions
2. **Azure Setup** - Configure Azure Container Apps resources
3. **CI/CD Setup** - Configure OIDC authentication and secrets  
4. **Download Standard Workflow** - Get basic workflow file
5. **Private Repo Setup** - Create PAT and configure secrets
6. **Download Enhanced Workflow** - Get workflow with private registry support

## ✨ Key Features

- **🔐 OIDC Authentication** - Secure passwordless authentication with Azure
- **📦 Dynamic Workflows** - Standard and enhanced workflow generation
- **🔄 Real-time Monitoring** - Live deployment logs via WebSocket
- **🎨 Modern UI** - Retro-themed responsive interface
- **🚀 Container Ready** - Optimized for Azure Container Apps
- **📱 Mobile Friendly** - Works on all devices

## 🛠️ Technical Stack

### Frontend
- **React 18** with Vite 5
- **Tailwind CSS** with custom styling
- **Framer Motion** for animations
- **WebSocket** for real-time updates

### Backend  
- **Express.js** with WebSocket support
- **Azure Identity SDK** for OIDC authentication
- **REST API** for Azure resource management
- **Dynamic workflow generation**

### DevOps
- **GitHub Actions** with OIDC
- **Docker** containerization
- **Azure Container Apps** hosting
- **GitHub Container Registry** (GHCR)

## 🔧 How It Works

### Authentication
Uses Microsoft's official Azure CLI client ID (`04b07795-8ddb-461a-bbee-02f9e1bf7b46`) for secure, multi-tenant authentication.

### Workflow Types

#### Standard Workflow (Public Repos)
- Uses `GITHUB_TOKEN` for builds
- Dynamic repository references
- Works immediately with public repositories

#### Enhanced Workflow (Private Repos)  
- Uses `GITHUB_TOKEN` for builds
- Uses `GHCR_TOKEN` (PAT) for Azure registry access
- Configures Azure Container Apps registry automatically

### Azure Resources Created
- **Resource Group** - Contains all resources
- **Container Environment** - Managed environment for apps
- **Container App** - Your deployed application
- **Managed Identity** - For OIDC authentication (CI/CD only)
- **Federated Credentials** - Links GitHub to Azure identity

## 📋 Required GitHub Secrets

### For All Deployments:
```
AZURE_CLIENT_ID      # From CI/CD setup (Step 3)
AZURE_TENANT_ID      # From CI/CD setup (Step 3)  
AZURE_SUBSCRIPTION_ID # From CI/CD setup (Step 3)
```

### For Private Repositories Only:
```
GHCR_TOKEN          # GitHub Personal Access Token
                    # Scopes: read:packages, write:packages
```

## 🐳 Docker Support

```bash
# Build image
docker build -t azure-container-template .

# Run locally  
docker run -p 3000:3000 azure-container-template
```

## 📁 Project Structure

```
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration  
├── Dockerfile                # Container configuration
├── server.js                 # Express server + WebSocket
├── App.jsx                   # Main React component
├── handlers/
│   └── azureHandler.js       # Azure REST API integration
└── utils/
    └── wsUtils.js            # WebSocket utilities
```

## 🔐 Security Features

- **OIDC Authentication** - No stored secrets or passwords
- **Least Privilege Access** - Managed identity scoped to resource group
- **Automatic Token Refresh** - Azure handles token lifecycle
- **Secure WebSocket** - Real-time encrypted communication

## 🚦 Getting Started

1. **Clone and setup:**
   ```bash
   git clone [your-repo-url]
   cd azure-container-template
   npm install
   npm run dev
   ```

2. **Access the interface:**
   - Open http://localhost:3000
   - Follow the 6-step deployment process

3. **Deploy:**
   - Complete steps based on your repository type (public vs private)
   - Push to GitHub to trigger automated deployment

## 🤝 Two Deployment Paths

| Repository Type | Steps | Authentication | Use Case |
|----------------|-------|----------------|----------|
| **Public** | 1-4 | GITHUB_TOKEN only | Simple, immediate deployment |
| **Private** | 1-6 | GITHUB_TOKEN + PAT | Enterprise, private repositories |

## 📄 License

MIT License - feel free to use this template for your projects!