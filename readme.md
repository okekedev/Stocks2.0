# Azure Container Template

A modern React + Express.js application template with an interactive web interface for Azure Container Apps deployment. Features real-time deployment monitoring, automated GitHub Actions workflows, and a sleek retro-themed UI.

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start both frontend and backend (development mode)
npm run dev
```

- **Frontend (React + Vite)**: `http://localhost:3000`
- **Backend (Express + WebSocket)**: `http://localhost:3001`
- **WebSocket**: Live connection for real-time deployment logs

### Production Build
```bash
# Build the React application
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to see your application.

## 🌟 Current Development Status

### ✅ Completed Features
- **Interactive Web Interface**: Modern React app with retro-themed UI
- **Real-time WebSocket Communication**: Live deployment logs and status updates
- **GitHub Actions Integration**: Automated container builds and deployments
- **Docker Configuration**: Multi-stage builds with optimized production setup
- **Azure Container Apps Support**: Ready-to-deploy workflows
- **3-Step Deployment Process**: Simplified user experience

### 🚧 In Development
- **GitHub OAuth Integration**: Automatic repository creation and management
- **Azure CLI Integration**: Direct Azure resource provisioning through the web interface
- **Enhanced Error Handling**: Better user feedback and recovery options
- **Template Customization**: Dynamic workflow generation based on user preferences

### 📋 Upcoming Features
- **Multi-cloud Support**: AWS and GCP deployment options
- **Advanced Monitoring**: Application health checks and metrics
- **Environment Management**: Dev/staging/production pipeline automation

## 🎨 Web Interface Features

The application includes a sophisticated web interface with:

- **3-Step Deployment Wizard**:
  1. **GitHub Sync**: Trigger container image builds
  2. **Azure Setup**: Configure Azure Container Apps resources
  3. **Download Config**: Get customized deployment workflows

- **Real-time Terminal**: Live command execution with colored output
- **Connection Status**: WebSocket connectivity indicator
- **Progress Tracking**: Visual step completion indicators
- **Responsive Design**: Works on desktop and mobile devices

## 🐳 Docker Deployment

### Build the Docker image
```bash
docker build -t azure-container-template .
```

### Run the container locally
```bash
docker run -p 3000:3000 azure-container-template
```

Visit `http://localhost:3000` to see your containerized application.

## ☁️ Azure Deployment

This template is optimized for Azure Container Apps with automated GitHub Actions deployment.

### Automatic Deployment (Recommended)

1. **Push to GitHub**: The included workflow automatically builds your container
2. **Use Web Interface**: Configure Azure resources through the app
3. **Deploy**: Update your Azure Container App with the built image

### Manual Azure Setup

```bash
# Create resource group
az group create --name myResourceGroup --location eastus

# Create container app environment
az containerapp env create \
  --name myContainerAppEnv \
  --resource-group myResourceGroup \
  --location eastus

# Deploy container app
az containerapp create \
  --name mycontainerapp \
  --resource-group myResourceGroup \
  --environment myContainerAppEnv \
  --image ghcr.io/[username]/[repo]:latest \
  --target-port 3000 \
  --ingress 'external'
```

## 📁 Project Structure

```
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── vite.config.js            # Vite build configuration
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── postcss.config.js         # PostCSS configuration
│   ├── nodemon.json              # Development server configuration
│   ├── Dockerfile                # Multi-stage Docker build
│   ├── .dockerignore             # Docker ignore patterns
│   └── .gitignore                # Git ignore patterns
│
├── 🎨 Frontend (React + Vite)
│   ├── index.html                # Main HTML file
│   ├── main.jsx                  # React application entry point
│   ├── App.jsx                   # Main React component with deployment interface
│   └── style.css                 # Tailwind CSS + custom retro styling
│
├── 🔧 Backend (Express.js)
│   ├── server.js                 # Express server + WebSocket handling
│   ├── handlers/
│   │   ├── azureHandler.js       # Azure CLI deployment commands
│   │   └── dockerHandler.js      # Azure setup simulation
│   ├── services/
│   │   └── githubService.js      # GitHub API integration (Octokit)
│   └── utils/
│       ├── commandUtils.js       # Command execution utilities
│       ├── templateUtils.js      # Dynamic file generation
│       └── wsUtils.js            # WebSocket helper functions
│
└── 🚀 CI/CD
    ├── .github/workflows/
    │   ├── build.yml             # Main build and push workflow
    │   └── templates/            # Template workflows for different scenarios
    └── templates/                # Additional workflow templates
```

## 🛠️ Technical Stack

### Frontend
- **React 18**: Modern functional components with hooks
- **Vite 5**: Lightning-fast development and optimized builds
- **Tailwind CSS**: Utility-first styling with custom retro theme
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Beautiful, consistent icons

### Backend
- **Express.js**: RESTful API and static file serving
- **WebSocket (ws)**: Real-time bidirectional communication
- **Octokit**: GitHub API integration
- **Simple Git**: Git operations and repository management
- **Child Process**: Secure command execution for Azure CLI

### DevOps
- **GitHub Actions**: Automated CI/CD pipelines
- **Docker**: Containerization with multi-stage builds
- **Azure Container Apps**: Serverless container hosting
- **GitHub Container Registry**: Container image storage

## 🔧 Customization

### Frontend Modifications
- **UI Theme**: Modify `style.css` for custom styling
- **Components**: Update `App.jsx` for interface changes
- **Build Settings**: Configure `vite.config.js` for build optimization

### Backend Configuration
- **API Endpoints**: Add routes in `server.js`
- **WebSocket Handlers**: Extend handlers in `handlers/` directory
- **Command Integration**: Add new CLI tools in `utils/commandUtils.js`

### Deployment Workflows
- **GitHub Actions**: Customize `.github/workflows/build.yml`
- **Template Generation**: Modify `utils/templateUtils.js`
- **Azure Configuration**: Update Azure CLI commands in `handlers/azureHandler.js`

## 📝 Key Features

- ⚡ **Fast Development**: Vite HMR + React Fast Refresh
- 🐳 **Container Ready**: Optimized Docker configuration
- ☁️ **Azure Optimized**: Tailored for Azure Container Apps
- 🔄 **CI/CD Integrated**: GitHub Actions workflows included
- 🎨 **Modern UI**: Retro-themed responsive design
- 🔗 **Real-time Updates**: WebSocket-powered live feedback
- 📦 **GitHub Integration**: Automated repository and package management
- 🛡️ **Production Ready**: Security best practices and error handling
- 📱 **Mobile Friendly**: Responsive design for all devices
- 🎯 **User Focused**: Simplified 3-step deployment process

## 🚦 Getting Started Guide

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd azure-container-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open the web interface**
   - Visit `http://localhost:3000`
   - Follow the 3-step deployment process
   - Monitor real-time deployment logs

5. **Push to GitHub**
   - GitHub Actions will automatically build your container
   - Image will be available at `ghcr.io/[username]/[repo]:latest`

6. **Deploy to Azure**
   - Use the web interface to configure Azure resources
   - Download the generated workflow file
   - Push to trigger Azure deployment

## 🤝 Contributing

This project is actively developed and welcomes contributions. The current focus is on:

- Enhancing the Azure CLI integration
- Improving error handling and user feedback
- Adding support for additional cloud providers
- Expanding template customization options

For more information and updates, visit the repository.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with ❤️ for developers who want simple, powerful Azure deployments*