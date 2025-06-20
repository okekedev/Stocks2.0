import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Container, 
  Cloud, 
  Terminal, 
  GitBranch, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Github,
  Download,
  Zap,
  X,
  Layers,
  Box,
  Cpu,
  Server,
  Check,
  Play
} from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState([])
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [showAzureForm, setShowAzureForm] = useState(false)
  const [completedSteps, setCompletedSteps] = useState({
    github: false,
    azure: false,
    download: false
  })
  const [azureConfig, setAzureConfig] = useState({
    subscriptionId: '',        // Added subscription ID field
    resourceGroup: '',
    environmentName: '',
    appName: '',
    location: 'eastus',
    githubContainerUrl: '',
    githubRepo: '',
    githubOwner: '',
    containerImageName: ''     // Added to store the actual container name
  })

  // Azure regions that support Container Apps
  const azureRegions = [
    { value: 'eastus', label: 'East US' },
    { value: 'eastus2', label: 'East US 2' },
    { value: 'westus', label: 'West US' },
    { value: 'westus2', label: 'West US 2' },
    { value: 'westus3', label: 'West US 3' },
    { value: 'centralus', label: 'Central US' },
    { value: 'southcentralus', label: 'South Central US' },
    { value: 'northcentralus', label: 'North Central US' },
    { value: 'canadacentral', label: 'Canada Central' },
    { value: 'canadaeast', label: 'Canada East' },
    { value: 'brazilsouth', label: 'Brazil South' },
    { value: 'northeurope', label: 'North Europe' },
    { value: 'westeurope', label: 'West Europe' },
    { value: 'uksouth', label: 'UK South' },
    { value: 'ukwest', label: 'UK West' },
    { value: 'francecentral', label: 'France Central' },
    { value: 'germanywestcentral', label: 'Germany West Central' },
    { value: 'switzerlandnorth', label: 'Switzerland North' },
    { value: 'norwayeast', label: 'Norway East' },
    { value: 'swedencentral', label: 'Sweden Central' },
    { value: 'eastasia', label: 'East Asia' },
    { value: 'southeastasia', label: 'Southeast Asia' },
    { value: 'japaneast', label: 'Japan East' },
    { value: 'japanwest', label: 'Japan West' },
    { value: 'koreacentral', label: 'Korea Central' },
    { value: 'australiaeast', label: 'Australia East' },
    { value: 'australiasoutheast', label: 'Australia Southeast' },
    { value: 'centralindia', label: 'Central India' },
    { value: 'southindia', label: 'South India' },
    { value: 'westindia', label: 'West India' },
    { value: 'uaenorth', label: 'UAE North' },
    { value: 'southafricanorth', label: 'South Africa North' }
  ]
  
  const logsEndRef = useRef(null)
  const sessionIdRef = useRef(null)

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    
    // Simple detection: if we're on port 3000, we're in development (Vite dev server)
    // Backend runs on 3001 in dev, same port as frontend in production
    const isDevelopment = window.location.port === '3000'
    const wsPort = isDevelopment ? '3001' : (window.location.port || '3000')
    const wsUrl = `${protocol}//${host}:${wsPort}`
    
    const websocket = new WebSocket(wsUrl)
    
    websocket.onopen = () => {
      setConnectionStatus('connected')
      setWs(websocket)
    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'log':
          setLogs(prev => [...prev, {
            id: Date.now() + Math.random(),
            message: data.message.trim(),
            level: data.level,
            timestamp: data.timestamp,
            logType: data.logType
          }])
          break
        case 'status':
          if (data.status === 'completed') {
            setIsProcessing(false)
            // Mark step as completed
            if (data.logType === 'azure-setup') setCompletedSteps(prev => ({ ...prev, azure: true }))
          }
          if (data.status === 'failed') {
            setIsProcessing(false)
            setLogs(prev => [...prev, {
              id: Date.now() + Math.random(),
              message: `❌ Process failed: ${data.error}`,
              level: 'error',
              timestamp: new Date().toISOString(),
              logType: data.logType
            }])
          }
          break
        case 'error':
          setLogs(prev => [...prev, {
            id: Date.now() + Math.random(),
            message: `❌ Error: ${data.message}`,
            level: 'error',
            timestamp: new Date().toISOString(),
            logType: activeTab
          }])
          setIsProcessing(false)
          break
      }
    }
    
    websocket.onclose = () => {
      setConnectionStatus('disconnected')
      setWs(null)
    }
    
    return () => {
      websocket.close()
    }
  }, [])

  // Step 1: GitHub Sync - Simple checkbox to view instructions
  const handleStep1GitHubSync = () => {
    setCompletedSteps(prev => ({ ...prev, github: true }))
    
    // Show success message
    setActiveTab('github')
    setLogs([
      {
        id: Date.now(),
        message: '📋 Steps: Sync Repository with VS Code',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      },
      {
        id: Date.now() + 1,
        message: '1️⃣ Push this template to your GitHub repository',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      },
      {
        id: Date.now() + 2,
        message: '2️⃣ GitHub Actions will automatically build your container',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      },
      {
        id: Date.now() + 3,
        message: '📦 Your image will be: ghcr.io/[username]/[container-name]:latest',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      },
      {
        id: Date.now() + 4,
        message: '📋 Copy your container package URL for Step 2',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      },
      {
        id: Date.now() + 5,
        message: '✅ Ready for Step 2: Azure Setup',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'github'
      }
    ])
  }

  // Fixed function to parse GitHub container URL correctly
  const parseGitHubContainerUrl = (url) => {
    // Expected format: https://github.com/username/repo/pkgs/container/container-name
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pkgs\/container\/([^\/]+)/
    const match = url.match(regex)
    
    if (match) {
      const [, owner, repo, containerName] = match
      return {
        githubOwner: owner,
        githubRepo: repo,
        containerName: containerName,  // This is the actual container image name
        // Use containerName for the image, not repo
        imageUrl: `ghcr.io/${owner}/${containerName}:latest`
      }
    }
    return null
  }

  // Updated handleContainerUrlChange function
  const handleContainerUrlChange = (url) => {
    setAzureConfig(prev => ({ ...prev, githubContainerUrl: url }))
    
    const parsed = parseGitHubContainerUrl(url)
    if (parsed) {
      setAzureConfig(prev => ({
        ...prev,
        githubOwner: parsed.githubOwner,
        githubRepo: parsed.githubRepo,
        // Use the actual container name from the URL
        containerImageName: parsed.containerName,
        // Auto-suggest names based on container name (not repo name)
        appName: prev.appName || `${parsed.containerName}-app`,
        environmentName: prev.environmentName || `${parsed.containerName}-env`,
        resourceGroup: prev.resourceGroup || `${parsed.containerName}-rg`
      }))
    }
  }

  const handleStep2AzureSetup = () => {
    setShowAzureForm(true)
  }

  const submitAzureSetup = () => {
    if (!ws || isProcessing) return
    
    const required = ['resourceGroup', 'environmentName', 'appName', 'githubContainerUrl']
    const missing = required.filter(field => !azureConfig[field])
    
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(', ')}`)
      return
    }

    // Validate GitHub container URL
    const parsed = parseGitHubContainerUrl(azureConfig.githubContainerUrl)
    if (!parsed) {
      alert('Please enter a valid GitHub container package URL')
      return
    }
    
    setActiveTab('azure-setup')
    setShowAzureForm(false)
    setLogs([])
    setIsProcessing(true)
    sessionIdRef.current = `azure-setup-${Date.now()}`
    
    ws.send(JSON.stringify({
      type: 'azure-setup',
      sessionId: sessionIdRef.current,
      payload: azureConfig
    }))
  }

  // Step 3: Download Azure-configured workflow
  const handleStep3DownloadWorkflow = () => {
    if (!completedSteps.azure) {
      alert('Please complete Azure setup first')
      return
    }

    // Generate the Azure-integrated workflow file
    const workflowContent = generateAzureWorkflow(azureConfig)
    
    // Create download
    const blob = new Blob([workflowContent], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'azure-deploy.yml'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setCompletedSteps(prev => ({ ...prev, download: true }))

    // Show success message
    setActiveTab('download')
    setLogs([
      {
        id: Date.now(),
        message: '📥 Azure deployment workflow downloaded!',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'download'
      },
      {
        id: Date.now() + 1,
        message: `✅ Configured for: ${azureConfig.appName}`,
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'download'
      },
      {
        id: Date.now() + 2,
        message: '📋 Add this file to your .github/workflows/ folder',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'download'
      },
      {
        id: Date.now() + 3,
        message: '🚀 Push to GitHub to trigger Azure deployment!',
        level: 'info',
        timestamp: new Date().toISOString(),
        logType: 'download'
      }
    ])
  }

  // Updated generateAzureWorkflow function to use correct image name
  const generateAzureWorkflow = (config) => {
    // Parse the container URL to get the correct container name
    const parsed = parseGitHubContainerUrl(config.githubContainerUrl)
    const containerName = parsed ? parsed.containerName : config.githubRepo
    
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
      id-token: write
    
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
        images: ghcr.io/${config.githubOwner}/${containerName}
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
          --name ${config.appName} \\
          --resource-group ${config.resourceGroup} \\
          --image ghcr.io/${config.githubOwner}/${containerName}:latest
        
        echo "✅ Deployment completed successfully!"
        
    - name: Get App URL
      if: github.ref == 'refs/heads/main'
      run: |
        APP_URL=$(az containerapp show \\
          --name ${config.appName} \\
          --resource-group ${config.resourceGroup} \\
          --query 'properties.configuration.ingress.fqdn' \\
          --output tsv)
        
        echo "🌐 Application URL: https://$APP_URL"
        echo "📦 Image: ghcr.io/${config.githubOwner}/${containerName}:latest"
        echo "🏷️ Build: v\${{ github.run_number }}"`
  }

  const cancelProcess = () => {
    if (ws && sessionIdRef.current) {
      ws.send(JSON.stringify({
        type: 'cancel',
        sessionId: sessionIdRef.current
      }))
    }
    setIsProcessing(false)
  }

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'command': return 'text-cyan-400'
      case 'stdout': return 'text-green-300'
      case 'stderr': return 'text-orange-400'
      default: return 'text-blue-300'
    }
  }

  const getLogIcon = (level) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
      case 'command': return <Terminal className="w-4 h-4 text-cyan-400 flex-shrink-0" />
      default: return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 relative overflow-hidden">
      {/* Retro Grid Background */}
      <div className="retro-grid"></div>
      
      {/* Subtle Scanning Line Effect */}
      <div className="scan-line"></div>
      
      {/* Connection Status Indicator */}
      <div className="fixed top-6 right-6 z-50">
        <div className={`status-retro flex items-center space-x-3 px-4 py-2 rounded-full text-sm ${
          connectionStatus === 'connected' 
            ? 'border-green-400/30 text-green-400' 
            : 'border-red-400/30 text-red-400'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
          } shadow-lg`} style={{
            boxShadow: connectionStatus === 'connected' 
              ? '0 0 10px #4ade80' 
              : '0 0 10px #f87171'
          }} />
          <span className="font-medium text-retro-primary">{connectionStatus === 'connected' ? 'Live Connection' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Azure Configuration Modal */}
      <AnimatePresence>
        {showAzureForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-intense-retro rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold retro-text">Step 2: Azure Configuration</h3>
                <button
                  onClick={() => setShowAzureForm(false)}
                  className="text-retro-secondary hover:text-retro-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Subscription ID Field */}
                <div>
                  <label className="block text-sm font-medium text-retro-secondary mb-2">
                    Azure Subscription ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="12345678-1234-1234-1234-123456789012"
                    value={azureConfig.subscriptionId}
                    onChange={(e) => setAzureConfig(prev => ({ ...prev, subscriptionId: e.target.value }))}
                    className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                  />
                  <p className="text-xs text-retro-muted mt-1">
                    💡 Find your subscription ID in the Azure portal or leave blank to auto-detect
                  </p>
                </div>

                {/* GitHub Container URL */}
                <div>
                  <label className="block text-sm font-medium text-retro-secondary mb-2">
                    GitHub Container Package URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repo/pkgs/container/container-name"
                    value={azureConfig.githubContainerUrl}
                    onChange={(e) => handleContainerUrlChange(e.target.value)}
                    className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                  />
                  <p className="text-xs text-retro-muted mt-1">
                    Paste the URL from your GitHub package page (auto-fills other fields)
                  </p>
                </div>
                
                {/* GitHub Owner and Repo */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="GitHub Owner"
                    value={azureConfig.githubOwner}
                    onChange={(e) => setAzureConfig(prev => ({ ...prev, githubOwner: e.target.value }))}
                    className="px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                    readOnly={!!parseGitHubContainerUrl(azureConfig.githubContainerUrl)}
                  />
                  <input
                    type="text"
                    placeholder="Repository Name"
                    value={azureConfig.githubRepo}
                    onChange={(e) => setAzureConfig(prev => ({ ...prev, githubRepo: e.target.value }))}
                    className="px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                    readOnly={!!parseGitHubContainerUrl(azureConfig.githubContainerUrl)}
                  />
                </div>

                {/* Azure Resource Group */}
                <input
                  type="text"
                  placeholder="Azure Resource Group"
                  value={azureConfig.resourceGroup}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, resourceGroup: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />

                {/* Container Environment Name */}
                <input
                  type="text"
                  placeholder="Container Environment Name"
                  value={azureConfig.environmentName}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, environmentName: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />

                {/* Container App Name */}
                <input
                  type="text"
                  placeholder="Container App Name"
                  value={azureConfig.appName}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, appName: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />

                {/* Azure Region */}
                <div>
                  <label className="block text-sm font-medium text-retro-secondary mb-2">
                    Azure Region
                  </label>
                  <select
                    value={azureConfig.location}
                    onChange={(e) => setAzureConfig(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 bg-slate-800/50"
                  >
                    {azureRegions.map(region => (
                      <option key={region.value} value={region.value} className="bg-slate-800 text-retro-primary">
                        {region.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-retro-muted mt-1">
                    Choose the Azure region closest to your users
                  </p>
                </div>

                {/* Show parsed container info if URL is valid */}
                {parseGitHubContainerUrl(azureConfig.githubContainerUrl) && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">📦 Parsed Container Info:</h4>
                    <div className="text-xs text-blue-300 space-y-1">
                      <div>Owner: {parseGitHubContainerUrl(azureConfig.githubContainerUrl).githubOwner}</div>
                      <div>Repository: {parseGitHubContainerUrl(azureConfig.githubContainerUrl).githubRepo}</div>
                      <div>Container: {parseGitHubContainerUrl(azureConfig.githubContainerUrl).containerName}</div>
                      <div>Image: {parseGitHubContainerUrl(azureConfig.githubContainerUrl).imageUrl}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAzureForm(false)}
                  className="flex-1 px-4 py-2 glass-retro text-retro-primary rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAzureSetup}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Setup Azure</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/20 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              delay: i * 0.5
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <motion.header 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo Component */}
          <div className="logo-backdrop rounded-3xl p-8 mb-8 inline-block">
            <motion.div 
              className="relative w-24 h-24 mx-auto"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl"></div>
              <div className="relative w-full h-full flex items-center justify-center">
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Server className="w-full h-full text-purple-400/30" />
                </motion.div>
                <motion.div
                  className="relative z-10"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <Container className="w-8 h-8 text-retro-accent drop-shadow-lg" />
                </motion.div>
              </div>
            </motion.div>
          </div>
          <motion.h1 
            className="text-6xl font-bold text-retro-primary mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Azure Container <span className="retro-text">Deployment</span>
          </motion.h1>
          <motion.p 
            className="text-xl text-retro-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            3 Simple Steps to Azure Container Apps
          </motion.p>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="glass-intense-retro rounded-3xl p-10 shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold retro-text mb-6">🚀 Simple 3-Step Process</h2>
              <p className="text-xl text-retro-secondary">Sync, Setup, Deploy</p>
            </div>

            {/* 3-Step Progress Indicator */}
            <div className="flex justify-center mb-10">
              <div className="flex items-center space-x-4">
                {[
                  { step: 1, label: 'GitHub Sync', key: 'github', icon: Github },
                  { step: 2, label: 'Azure Setup', key: 'azure', icon: Cloud },
                  { step: 3, label: 'Download Config', key: 'download', icon: Download }
                ].map(({ step, label, key, icon: Icon }, index) => (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      completedSteps[key] 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-purple-400 text-purple-400'
                    }`}>
                      {completedSteps[key] ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="ml-2 mr-4">
                      <div className={`text-sm font-semibold ${
                        completedSteps[key] ? 'text-green-400' : 'text-retro-primary'
                      }`}>
                        Step {step}
                      </div>
                      <div className={`text-xs ${
                        completedSteps[key] ? 'text-green-300' : 'text-retro-secondary'
                      }`}>
                        {label}
                      </div>
                    </div>
                    {index < 2 && (
                      <div className={`w-8 h-0.5 ${
                        completedSteps[key] ? 'bg-green-400' : 'bg-purple-400/30'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons - 3 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Step 1: GitHub Sync */}
              <motion.button
                onClick={handleStep1GitHubSync}
                disabled={completedSteps.github}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.github 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : 'bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500/90 hover:to-purple-600/90'
                } disabled:opacity-50 text-retro-primary`}
                whileHover={{ scale: completedSteps.github ? 1 : 1.02 }}
                whileTap={{ scale: completedSteps.github ? 1 : 0.98 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.github ? <CheckCircle className="w-8 h-8 text-white" /> : <Github className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 1</div>
                    <div className="text-sm opacity-90">GitHub Sync</div>
                    <div className="text-xs opacity-70 mt-1">View instructions</div>
                  </div>
                </div>
              </motion.button>

              {/* Step 2: Azure Setup */}
              <motion.button
                onClick={handleStep2AzureSetup}
                disabled={isProcessing || connectionStatus !== 'connected' || !completedSteps.github}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.azure 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : !completedSteps.github
                    ? 'bg-gradient-to-r from-gray-600/50 to-gray-700/50'
                    : 'bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-500/90 hover:to-blue-600/90'
                } disabled:opacity-50 disabled:cursor-not-allowed text-retro-primary`}
                whileHover={{ scale: completedSteps.github ? 1.02 : 1 }}
                whileTap={{ scale: completedSteps.github ? 0.98 : 1 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.azure ? <CheckCircle className="w-8 h-8 text-white" /> : <Cloud className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 2</div>
                    <div className="text-sm opacity-90">Azure Setup</div>
                    <div className="text-xs opacity-70 mt-1">Configure resources</div>
                  </div>
                </div>
              </motion.button>

              {/* Step 3: Download Workflow */}
              <motion.button
                onClick={handleStep3DownloadWorkflow}
                disabled={!completedSteps.azure}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.download 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : !completedSteps.azure
                    ? 'bg-gradient-to-r from-gray-600/50 to-gray-700/50'
                    : 'bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-500/90 hover:to-orange-600/90'
                } disabled:opacity-50 disabled:cursor-not-allowed text-retro-primary`}
                whileHover={{ scale: completedSteps.azure ? 1.02 : 1 }}
                whileTap={{ scale: completedSteps.azure ? 0.98 : 1 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.download ? <CheckCircle className="w-8 h-8 text-white" /> : <Download className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 3</div>
                    <div className="text-sm opacity-90">Download Config</div>
                    <div className="text-xs opacity-70 mt-1">Get workflow file</div>
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Live Terminal */}
            <AnimatePresence>
              {activeTab && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="terminal-window rounded-3xl p-8 overflow-hidden"
                >
                  <div className="terminal-header flex items-center justify-between mb-6 p-4 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <Terminal className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-mono text-sm">
                          azure-container-template@1.0.0 ~ {activeTab}
                        </span>
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    {isProcessing && (
                      <button
                        onClick={cancelProcess}
                        className="flex items-center space-x-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <AnimatePresence>
                      {logs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start space-x-3 text-sm"
                        >
                          {getLogIcon(log.level)}
                          <pre className={`font-mono whitespace-pre-wrap break-words flex-1 ${getLogColor(log.level)}`}>
                            {log.message}
                          </pre>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center space-x-2 text-blue-400"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-sm">Executing commands...</span>
                      </motion.div>
                    )}
                    
                    <div ref={logsEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions */}
            <motion.div 
              className="mt-12 grid md:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <div className="info-card-retro rounded-2xl p-6">
                <Play className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-retro-primary mb-2">1. View Instructions</h3>
                <p className="text-retro-secondary">Click GitHub Sync to view repository setup instructions</p>
              </div>
              <div className="info-card-retro rounded-2xl p-6">
                <Cloud className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-retro-primary mb-2">2. Configure Azure</h3>
                <p className="text-retro-secondary">Set up your Azure Container Apps resources and deployment settings</p>
              </div>
              <div className="info-card-retro rounded-2xl p-6">
                <Download className="w-8 h-8 text-orange-400 mb-4" />
                <h3 className="text-xl font-semibold text-retro-primary mb-2">3. Get Workflow</h3>
                <p className="text-retro-secondary">Download the configured workflow file and add it to your project</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default App