import React, { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchMessage = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/hello')
      const data = await response.json()
      setMessage(data.message)
    } catch (error) {
      setMessage('Error connecting to backend')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMessage()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-white mb-6">
          Welcome to your 
          <span className="text-blue-400"> Simple App</span>
        </h1>
        
        <p className="text-gray-300 text-xl mb-8">
          A clean React + Express setup ready for your ideas
        </p>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">Backend Connection</h2>
          {isLoading ? (
            <p className="text-blue-300">Loading...</p>
          ) : (
            <p className="text-green-300">{message}</p>
          )}
          
          <button 
            onClick={fetchMessage}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Test Connection
          </button>
        </div>
        
        <div className="mt-8 space-y-2 text-gray-400">
          <p>🚀 React + Vite frontend</p>
          <p>⚡ Express.js backend</p>
          <p>🎨 Tailwind CSS styling</p>
          <p>🐳 Docker ready</p>
        </div>
      </div>
    </div>
  )
}

export default App