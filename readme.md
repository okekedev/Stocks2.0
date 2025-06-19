# Azure Container Template

A simple Vite JavaScript project template designed for easy Azure Container deployment.

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your application.

### Production Build
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 🐳 Docker Deployment

### Build the Docker image
```bash
docker build -t azure-container-template .
```

### Run the container locally
```bash
docker run -p 8080:3000 azure-container-template
```

Visit `http://localhost:8080` to see your containerized application.

## ☁️ Azure Deployment

This template is optimized for Azure Container Instances (ACI) and Azure Container Apps.

### Azure Container Instances
```bash
# Create resource group
az group create --name myResourceGroup --location eastus

# Create container instance
az container create \
  --resource-group myResourceGroup \
  --name mycontainer \
  --image your-registry/azure-container-template:latest \
  --dns-name-label myapp-unique-name \
  --ports 3000
```

### Azure Container Apps
```bash
# Create container app environment
az containerapp env create \
  --name myContainerAppEnv \
  --resource-group myResourceGroup \
  --location eastus

# Create container app
az containerapp create \
  --name mycontainerapp \
  --resource-group myResourceGroup \
  --environment myContainerAppEnv \
  --image your-registry/azure-container-template:latest \
  --target-port 3000 \
  --ingress 'external'
```

## 📁 Project Structure

```
├── index.html          # Main HTML file
├── main.js             # Application entry point
├── style.css           # Styles
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies and scripts
├── Dockerfile          # Docker configuration
├── .dockerignore       # Docker ignore file
├── favicon.ico         # Favicon files
├── favicon-16x16.png
├── favicon-32x32.png
├── logo192.png         # Logo assets
├── logo512.png
└── apple-touch-icon.png
```

## 🛠️ Customization

- Modify `main.js` and `style.css` to customize the homepage
- Update `package.json` with your project details
- Add environment-specific configurations in `vite.config.js`
- Customize the Docker setup in `Dockerfile` if needed

## 📝 Features

- ⚡ Fast development with Vite
- 🐳 Docker-ready for containerization
- ☁️ Optimized for Azure deployment
- 📱 Responsive design
- 🎨 Modern UI with CSS variables
- 🔧 Production-ready build configuration

## 🤝 Contributing

For more information and updates, visit [okekedev/AzureContainerTemplate](https://github.com/okekedev/AzureContainerTemplate).

## 📄 License

This project is open source and available under the [MIT License](LICENSE).