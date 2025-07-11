// src/context/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: 'ad6bc04e-e561-4334-b33e-522c149a18c4',
    authority: 'https://login.microsoftonline.com/79865dd8-488a-4a93-9f12-1f3e78c520e8',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case 'Error':
            console.error(message);
            return;
          case 'Info':
            console.info(message);
            return;
          case 'Verbose':
            console.debug(message);
            return;
          case 'Warning':
            console.warn(message);
            return;
        }
      }
    }
  }
};

// Scopes for API access
const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email']
};

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
await msalInstance.initialize();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Handle redirect promise first
        const response = await msalInstance.handleRedirectPromise();
        
        if (response && response.account) {
          // User just logged in via redirect
          msalInstance.setActiveAccount(response.account);
          setUser({
            name: response.account.name,
            email: response.account.username,
            id: response.account.localAccountId
          });
          setIsAuthenticated(true);
          console.log('User logged in via redirect:', response.account.name);
        } else {
          // Check for existing session
          const accounts = msalInstance.getAllAccounts();
          
          if (accounts.length > 0) {
            const account = accounts[0];
            msalInstance.setActiveAccount(account);
            setUser({
              name: account.name,
              email: account.username,
              id: account.localAccountId
            });
            setIsAuthenticated(true);
            console.log('Existing session found:', account.name);
          } else {
            setIsAuthenticated(false);
            setUser(null);
            console.log('No authentication found');
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async () => {
    try {
      setLoginLoading(true);
      console.log('Starting login process...');
      
      // Use loginRedirect for better compatibility
      await msalInstance.loginRedirect(loginRequest);
      
      // Note: The page will redirect, so code after this won't execute
      // The actual login handling happens in the redirect promise handler
      
    } catch (error) {
      console.error('Login error:', error);
      setLoginLoading(false);
      
      // Handle specific error types
      if (error.errorCode === 'user_cancelled') {
        console.log('User cancelled login');
      } else if (error.errorCode === 'access_denied') {
        console.error('Access denied - user may not have permission');
      } else {
        console.error('Login failed:', error.errorMessage);
      }
    }
  };

  const logout = async () => {
    try {
      const logoutRequest = {
        account: msalInstance.getActiveAccount(),
        postLogoutRedirectUri: window.location.origin
      };
      
      await msalInstance.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAccessToken = async (scopes = ['User.Read']) => {
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account');
      }

      const silentRequest = {
        scopes: scopes,
        account: account
      };

      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Token acquisition error:', error);
      
      // If silent token acquisition fails, try interactive
      try {
        const response = await msalInstance.acquireTokenRedirect({
          scopes: scopes
        });
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition error:', interactiveError);
        throw interactiveError;
      }
    }
  };

  const value = {
    isAuthenticated,
    user,
    isLoading,
    loginLoading,
    login,
    logout,
    getAccessToken,
    msalInstance
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}