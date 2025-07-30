// src/context/AuthProvider.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from "react";
import { PublicClientApplication } from "@azure/msal-browser";

// 🔧 FIXED: Updated MSAL Configuration to resolve AADSTS90014
const msalConfig = {
  auth: {
    clientId: "ad6bc04e-e561-4334-b33e-522c149a18c4",
    authority:
      "https://login.microsoftonline.com/79865dd8-488a-4a93-9f12-1f3e78c520e8",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    // 🔧 FIX: Add these missing required fields
    navigateToLoginRequestUrl: false, // Prevents redirect loops
    knownAuthorities: [], // Empty for single tenant
  },
  cache: {
    cacheLocation: "sessionStorage", // 🔧 FIX: Changed from localStorage to sessionStorage
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case "Error":
            console.error("[MSAL Error]:", message);
            return;
          case "Info":
            console.info("[MSAL Info]:", message);
            return;
          case "Verbose":
            console.debug("[MSAL Verbose]:", message);
            return;
          case "Warning":
            console.warn("[MSAL Warning]:", message);
            return;
          default:
            console.log("[MSAL]:", message);
        }
      },
      logLevel: "Info", // 🔧 FIX: Add explicit log level
      piiLoggingEnabled: false,
    },
    // 🔧 FIX: Add window hash timeout to prevent hanging
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false,
  },
};

// 🔧 FIX: Updated scopes - removed potentially problematic ones
const loginRequest = {
  scopes: ["User.Read"], // Simplified to basic scope
  prompt: "select_account", // 🔧 FIX: Force account selection
  extraQueryParameters: {
    // 🔧 FIX: Add domain hint if needed (optional)
    // domain_hint: 'yourdomain.com'
  },
};

// 🔧 FIX: Proper MSAL instance initialization
let msalInstance;

// Initialize MSAL with error handling
const initializeMsal = async () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    try {
      await msalInstance.initialize();
      console.log("MSAL initialized successfully");
    } catch (error) {
      console.error("MSAL initialization error:", error);
      throw error;
    }
  }
  return msalInstance;
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [msalReady, setMsalReady] = useState(false);

  // 🔧 FIX: Initialize MSAL first, then check auth status
  useEffect(() => {
    const initializeAndCheckAuth = async () => {
      try {
        console.log("Initializing MSAL...");
        await initializeMsal();
        setMsalReady(true);

        // 🔧 FIX: Handle redirect promise with better error handling
        const response = await msalInstance.handleRedirectPromise();

        if (response && response.account) {
          // User just logged in via redirect
          msalInstance.setActiveAccount(response.account);
          setUser({
            name: response.account.name || response.account.username,
            email: response.account.username,
            id: response.account.localAccountId,
          });
          setIsAuthenticated(true);
          console.log(
            "User logged in via redirect:",
            response.account.name || response.account.username
          );
        } else {
          // Check for existing session
          const accounts = msalInstance.getAllAccounts();

          if (accounts.length > 0) {
            const account = accounts[0];
            msalInstance.setActiveAccount(account);
            setUser({
              name: account.name || account.username,
              email: account.username,
              id: account.localAccountId,
            });
            setIsAuthenticated(true);
            console.log(
              "Existing session found:",
              account.name || account.username
            );
          } else {
            setIsAuthenticated(false);
            setUser(null);
            console.log("No authentication found");
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsAuthenticated(false);
        setUser(null);

        // 🔧 FIX: Handle specific MSAL errors
        if (error.errorCode === "interaction_in_progress") {
          console.warn("Another interaction is in progress");
        } else if (error.errorCode === "popup_window_error") {
          console.warn("Popup was blocked or closed");
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndCheckAuth();
  }, []);

  const login = async () => {
    if (!msalReady || !msalInstance) {
      console.error("MSAL not ready");
      return;
    }

    try {
      setLoginLoading(true);
      console.log("Starting login process...");

      // 🔧 FIX: Check for existing interaction first
      const inProgress = msalInstance.getActiveAccount();
      if (inProgress) {
        console.log("Login already in progress or user already logged in");
        return;
      }

      // 🔧 FIX: Clear any existing cache issues
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        // If accounts exist but user isn't authenticated, there might be a token issue
        console.log(
          "Existing accounts found, attempting silent token acquisition..."
        );
        try {
          const silentRequest = {
            scopes: loginRequest.scopes,
            account: accounts[0],
          };
          const response = await msalInstance.acquireTokenSilent(silentRequest);
          if (response) {
            // Token acquired successfully, update auth state
            setUser({
              name: accounts[0].name || accounts[0].username,
              email: accounts[0].username,
              id: accounts[0].localAccountId,
            });
            setIsAuthenticated(true);
            setLoginLoading(false);
            return;
          }
        } catch (silentError) {
          console.log(
            "Silent token acquisition failed, proceeding with interactive login"
          );
        }
      }

      // 🔧 FIX: Use loginRedirect with improved request
      const enhancedLoginRequest = {
        ...loginRequest,
        redirectUri: window.location.origin, // Ensure redirect URI is set
        extraScopesToConsent: [], // No extra scopes
      };

      await msalInstance.loginRedirect(enhancedLoginRequest);

      // Note: The page will redirect, so code after this won't execute
      // The actual login handling happens in the redirect promise handler
    } catch (error) {
      console.error("Login error:", error);
      setLoginLoading(false);

      // 🔧 FIX: Handle specific error types with better messaging
      if (error.errorCode === "user_cancelled") {
        console.log("User cancelled login");
      } else if (error.errorCode === "access_denied") {
        console.error("Access denied - user may not have permission");
      } else if (error.errorCode === "interaction_required") {
        console.error("Interaction required - token may be expired");
      } else if (error.errorCode === "consent_required") {
        console.error("Consent required - user needs to consent to scopes");
      } else if (error.message && error.message.includes("AADSTS90014")) {
        console.error(
          "AADSTS90014: Missing request field - check Azure app registration configuration"
        );
        alert("Authentication configuration error. Please contact support.");
      } else {
        console.error("Login failed:", error.errorMessage || error.message);
      }
    }
  };

  const logout = async () => {
    if (!msalReady || !msalInstance) {
      console.error("MSAL not ready");
      return;
    }

    try {
      const account = msalInstance.getActiveAccount();
      const logoutRequest = {
        account: account,
        postLogoutRedirectUri: window.location.origin,
        // 🔧 FIX: Add logout hint
        logoutHint: account?.idTokenClaims?.login_hint,
      };

      await msalInstance.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAccessToken = async (scopes = ["User.Read"]) => {
    if (!msalReady || !msalInstance) {
      throw new Error("MSAL not ready");
    }

    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error("No active account");
      }

      const silentRequest = {
        scopes: scopes,
        account: account,
        forceRefresh: false, // 🔧 FIX: Don't force refresh unless necessary
      };

      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error("Token acquisition error:", error);

      // 🔧 FIX: Better error handling for token acquisition
      if (
        error.errorCode === "interaction_required" ||
        error.errorCode === "consent_required" ||
        error.errorCode === "login_required"
      ) {
        console.log("Interactive token acquisition required");
        try {
          const response = await msalInstance.acquireTokenRedirect({
            scopes: scopes,
          });
          return response.accessToken;
        } catch (interactiveError) {
          console.error(
            "Interactive token acquisition error:",
            interactiveError
          );
          throw interactiveError;
        }
      } else {
        throw error;
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
    msalInstance: msalReady ? msalInstance : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// 🔧 FIX: Export MSAL instance for debugging
export { msalInstance, msalConfig, loginRequest };
