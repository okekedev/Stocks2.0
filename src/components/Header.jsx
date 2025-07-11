// src/components/Header.jsx - Updated with User Profile
import React, { useState } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  User,
  LogOut,
  Settings,
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

export function Header({ lastUpdate }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now - updateTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return updateTime.toLocaleDateString();
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Stocks<span className="text-blue-400">2</span>
                </h1>
                <p className="text-gray-400 text-sm">AI-Powered Market Analysis</p>
              </div>
            </div>
          </div>

          {/* Center Status */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Live Market Data</span>
            </div>
            
            <div className="w-px h-4 bg-gray-600"></div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Updated {formatLastUpdate(lastUpdate)}</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            {/* Welcome Message - Hidden on Mobile */}
            <div className="hidden lg:block text-right">
              <div className="text-sm text-gray-400">Welcome back,</div>
              <div className="text-white font-medium">{user?.name || 'User'}</div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl px-3 py-2 transition-colors group"
              >
                {/* User Avatar */}
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                  {getUserInitials(user?.name)}
                </div>
                
                {/* User Name - Hidden on Mobile */}
                <span className="hidden sm:block text-white text-sm font-medium">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowUserMenu(false)} 
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                          {getUserInitials(user?.name)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user?.name}</div>
                          <div className="text-gray-400 text-sm">{user?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors">
                        <User className="w-4 h-4" />
                        <span>Profile Settings</span>
                      </button>
                      
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Preferences</span>
                      </button>
                      
                      <div className="border-t border-gray-700/50 my-2"></div>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300">Live Data</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{formatLastUpdate(lastUpdate)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}