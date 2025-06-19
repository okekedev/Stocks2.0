import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Container, 
  Cloud, 
  Terminal, 
  GitBranch, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Github,
  Settings,
  Zap,
  X,
  Send,
  Layers,
  Box,
  Cpu,
  Server
} from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState([])
  const [ws, setWs] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [showAzureForm, setShowAzureForm] = useState(false)
  const [showGitHubForm, setShowGitHubForm] = useState(false)
  const [showPrivateForm, setShowPrivateForm] = useState(false)
  const [completedSteps, setCompletedSteps] = useState({
    github: false,
    azure: false,
    deploy: false,
    private: false
  })
  const [azureConfig, setAzureConfig] = useState({
    resourceGroup: '',
    environmentName: '',
    appName: '',
    location: 'Central US'
  })
  const [githubConfig, setGitHubConfig] = useState({
    repoName: '',
    githubUsername: '',
    accessToken: ''
  })
  const [privateConfig, setPrivateConfig] = useState({
    repoName: '',
    githubUsername: ''
  })
  
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
    const wsUrl = `${protocol}//${host}:3001`
    
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
            if (data.logType === 'github') setCompletedSteps(prev => ({ ...prev, github: true }))
            if (data.logType === 'azure-setup') setCompletedSteps(prev => ({ ...prev, azure: true }))
            if (data.logType === 'deploy') setCompletedSteps(prev => ({ ...prev, deploy: true }))
            if (data.logType === 'private') setCompletedSteps(prev => ({ ...prev, private: true }))
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

  const handleStep1GitHubSetup = () => {
    setShowGitHubForm(true)
  }

  const handleStep2AzureSetup = () => {
    setShowAzureForm(true)
  }

  const handleStep3Deploy = () => {
    if (!ws || isProcessing) return
    
    setActiveTab('deploy')
    setLogs([])
    setIsProcessing(true)
    sessionIdRef.current = `deploy-${Date.now()}`
    
    ws.send(JSON.stringify({
      type: 'azure-deploy',
      sessionId: sessionIdRef.current,
      payload: { ...azureConfig, ...githubConfig }
    }))
  }

  const handleStep4MakePrivate = () => {
    setShowPrivateForm(true)
  }

  const submitAzureSetup = () => {
    if (!ws || isProcessing) return
    
    const required = ['resourceGroup', 'environmentName', 'appName']
    const missing = required.filter(field => !azureConfig[field])
    
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(', ')}`)
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

  // Listen for GitHub OAuth messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'github-auth-success') {
        setGitHubConfig(prev => ({ ...prev, accessToken: event.data.token }))
        console.log('GitHub authentication successful!')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleGitHubOAuth = () => {
    const width = 600
    const height = 700
    const left = (window.innerWidth - width) / 2
    const top = (window.innerHeight - height) / 2
    
    window.open(
      'http://localhost:3001/auth/github',
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )
  }

  const submitGitHubConfig = () => {
    if (!ws || isProcessing) return
    
    const required = ['repoName']
    const missing = required.filter(field => !githubConfig[field])
    
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(', ')}`)
      return
    }

    if (!githubConfig.accessToken) {
      alert('Please authenticate with GitHub first')
      return
    }
    
    setActiveTab('github')
    setShowGitHubForm(false)
    setLogs([])
    setIsProcessing(true)
    sessionIdRef.current = `github-${Date.now()}`
    
    ws.send(JSON.stringify({
      type: 'github-push',
      sessionId: sessionIdRef.current,
      payload: githubConfig
    }))
  }

  const submitPrivateConfig = () => {
    if (!ws || isProcessing) return
    
    setActiveTab('private')
    setShowPrivateForm(false)
    setLogs([])
    setIsProcessing(true)
    sessionIdRef.current = `private-${Date.now()}`
    
    ws.send(JSON.stringify({
      type: 'make-private',
      sessionId: sessionIdRef.current,
      payload: { ...githubConfig, ...azureConfig }
    }))
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
              className="glass-intense-retro rounded-3xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold retro-text">Step 2: Azure Setup</h3>
                <button
                  onClick={() => setShowAzureForm(false)}
                  className="text-retro-secondary hover:text-retro-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Resource Group Name"
                  value={azureConfig.resourceGroup}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, resourceGroup: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />
                <input
                  type="text"
                  placeholder="Environment Name"
                  value={azureConfig.environmentName}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, environmentName: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />
                <input
                  type="text"
                  placeholder="App Name"
                  value={azureConfig.appName}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, appName: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />
                <input
                  type="text"
                  placeholder="Azure Region"
                  value={azureConfig.location}
                  onChange={(e) => setAzureConfig(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />
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

      {/* GitHub Configuration Modal */}
      <AnimatePresence>
        {showGitHubForm && (
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
              className="glass-intense-retro rounded-3xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold retro-text">Step 1: GitHub Setup</h3>
                <button
                  onClick={() => setShowGitHubForm(false)}
                  className="text-retro-secondary hover:text-retro-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Repository Name"
                  value={githubConfig.repoName}
                  onChange={(e) => setGitHubConfig(prev => ({ ...prev, repoName: e.target.value }))}
                  className="w-full px-4 py-3 glass-retro rounded-xl text-retro-primary placeholder-retro-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                />
                
                <div className={`bg-blue-900/30 border rounded-lg p-4 ${
                  githubConfig.accessToken ? 'border-green-500/30' : 'border-blue-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Github className="w-4 h-4" />
                      <span className="font-semibold">
                        {githubConfig.accessToken ? 'GitHub Authenticated' : 'GitHub Authentication'}
                      </span>
                    </div>
                    {githubConfig.accessToken ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <button
                        onClick={handleGitHubOAuth}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Authenticate
                      </button>
                    )}
                  </div>
                  <p className="text-blue-300 text-sm mt-2">
                    {githubConfig.accessToken 
                      ? 'Ready to create repository and push template code'
                      : 'Click to authenticate with GitHub and grant repository permissions'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowGitHubForm(false)}
                  className="flex-1 px-4 py-2 glass-retro text-retro-primary rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitGitHubConfig}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Github className="w-4 h-4" />
                  <span>Push to GitHub</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Configuration Modal */}
      <AnimatePresence>
        {showPrivateForm && (
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
              className="glass-intense-retro rounded-3xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold retro-text">Step 4: Make Private</h3>
                <button
                  onClick={() => setShowPrivateForm(false)}
                  className="text-retro-secondary hover:text-retro-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-red-400 mb-2">
                  <Settings className="w-4 h-4" />
                  <span className="font-semibold">Advanced Configuration</span>
                </div>
                <p className="text-red-300 text-sm">
                  This will convert your repository and container packages to private. 
                  You'll need to set up a GitHub Personal Access Token.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                  <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Prerequisites:</h4>
                  <ul className="text-yellow-300 text-sm space-y-1">
                    <li>• GitHub Personal Access Token with packages permissions</li>
                    <li>• Repository must be public currently</li>
                    <li>• This action cannot be easily undone</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPrivateForm(false)}
                  className="flex-1 px-4 py-2 glass-retro text-retro-primary rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPrivateConfig}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Make Private</span>
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
          {/* Innovative Logo Component */}
          <div className="logo-backdrop rounded-3xl p-8 mb-8 inline-block">
            <motion.div 
              className="relative w-24 h-24 mx-auto"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl"></div>
              
              {/* Main Container Stack */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Background Layer */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Server className="w-full h-full text-purple-400/30" />
                </motion.div>
                
                {/* Middle Layer */}
                <motion.div
                  className="absolute inset-2"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                >
                  <Layers className="w-full h-full text-blue-400/50" />
                </motion.div>
                
                {/* Center Core */}
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
                
                {/* Orbiting Elements */}
                <motion.div
                  className="absolute top-1 right-1"
                  animate={{ 
                    rotate: 360,
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{ 
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Cloud className="w-4 h-4 text-blue-400" />
                </motion.div>
                
                <motion.div
                  className="absolute bottom-1 left-1"
                  animate={{ 
                    rotate: -360,
                    y: [-2, 2, -2]
                  }}
                  transition={{ 
                    rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Box className="w-3 h-3 text-purple-400" />
                </motion.div>
                
                <motion.div
                  className="absolute top-1 left-1"
                  animate={{ 
                    rotate: 360,
                    x: [-1, 1, -1]
                  }}
                  transition={{ 
                    rotate: { duration: 12, repeat: Infinity, ease: "linear" },
                    x: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Cpu className="w-3 h-3 text-cyan-400" />
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
            Welcome to your <span className="retro-text">container</span>
          </motion.h1>
          <motion.p 
            className="text-xl text-retro-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Azure Container Template
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
              <h2 className="text-4xl font-bold retro-text mb-6">🚀 4-Step Deployment Wizard</h2>
              <p className="text-xl text-retro-secondary">From zero to deployed in minutes</p>
            </div>

            {/* 4-Step Progress Indicator */}
            <div className="flex justify-center mb-10">
              <div className="flex items-center space-x-4">
                {[
                  { step: 1, label: 'GitHub Setup', key: 'github', icon: Github },
                  { step: 2, label: 'Azure Setup', key: 'azure', icon: Cloud },
                  { step: 3, label: 'Deploy App', key: 'deploy', icon: Container },
                  { step: 4, label: 'Make Private', key: 'private', icon: Settings }
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
                    {index < 3 && (
                      <div className={`w-8 h-0.5 ${
                        completedSteps[key] ? 'bg-green-400' : 'bg-purple-400/30'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons - 4 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {/* Step 1: GitHub Setup */}
              <motion.button
                onClick={handleStep1GitHubSetup}
                disabled={isProcessing || connectionStatus !== 'connected'}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.github 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : 'bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500/90 hover:to-purple-600/90'
                } disabled:opacity-50 disabled:cursor-not-allowed text-retro-primary`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.github ? <CheckCircle className="w-8 h-8 text-white" /> : <Github className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 1</div>
                    <div className="text-sm opacity-90">GitHub Setup</div>
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
                  </div>
                </div>
              </motion.button>

              {/* Step 3: Deploy */}
              <motion.button
                onClick={handleStep3Deploy}
                disabled={isProcessing || connectionStatus !== 'connected' || !completedSteps.azure}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.deploy 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : !completedSteps.azure
                    ? 'bg-gradient-to-r from-gray-600/50 to-gray-700/50'
                    : 'bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-500/90 hover:to-orange-600/90'
                } disabled:opacity-50 disabled:cursor-not-allowed text-retro-primary`}
                whileHover={{ scale: completedSteps.azure ? 1.02 : 1 }}
                whileTap={{ scale: completedSteps.azure ? 0.98 : 1 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.deploy ? <CheckCircle className="w-8 h-8 text-white" /> : <Container className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 3</div>
                    <div className="text-sm opacity-90">Deploy App</div>
                  </div>
                </div>
              </motion.button>

              {/* Step 4: Make Private (Optional) */}
              <motion.button
                onClick={handleStep4MakePrivate}
                disabled={isProcessing || connectionStatus !== 'connected' || !completedSteps.deploy}
                className={`btn-retro group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${
                  completedSteps.private 
                    ? 'bg-gradient-to-r from-green-600/80 to-green-700/80' 
                    : !completedSteps.deploy
                    ? 'bg-gradient-to-r from-gray-600/50 to-gray-700/50'
                    : 'bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-500/90 hover:to-red-600/90'
                } disabled:opacity-50 disabled:cursor-not-allowed text-retro-primary`}
                whileHover={{ scale: completedSteps.deploy ? 1.02 : 1 }}
                whileTap={{ scale: completedSteps.deploy ? 0.98 : 1 }}
              >
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {completedSteps.private ? <CheckCircle className="w-8 h-8 text-white" /> : <Settings className="w-8 h-8" />}
                  <div className="text-center">
                    <div className="font-semibold text-lg">Step 4</div>
                    <div className="text-sm opacity-90">Make Private</div>
                    <div className="text-xs opacity-70">(Optional)</div>
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
          </motion.div>

          {/* Info Cards */}
          <motion.div 
            className="mt-12 grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <div className="info-card-retro rounded-2xl p-6">
              <Zap className="w-8 h-8 text-yellow-400 mb-4" />
              <h3 className="text-xl font-semibold text-retro-primary mb-2">Real-Time Execution</h3>
              <p className="text-retro-secondary">Live command execution with streaming output and real-time feedback</p>
            </div>
            <div className="info-card-retro rounded-2xl p-6">
              <Container className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-retro-primary mb-2">Actual CLI Commands</h3>
              <p className="text-retro-secondary">Executes real git, docker, and Azure CLI commands with live output</p>
            </div>
            <div className="info-card-retro rounded-2xl p-6">
              <Cloud className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-retro-primary mb-2">Live Azure Deploy</h3>
              <p className="text-retro-secondary">Interactive Azure deployment with real Azure CLI integration</p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.footer 
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="flex items-center justify-center space-x-2 text-retro-secondary">
              <span>For more information visit</span>
              <a 
                href="https://github.com/okekedev/AzureContainerTemplate" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-retro-accent hover:text-purple-300 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="font-semibold">okekedev/AzureContainerTemplate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-retro-muted mt-4">Built with ❤️ for Azure Container Instances</p>
          </motion.footer>
        </div>
      </div>
    </div>
  )
}

export default App