import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { logInfo, logError, logWarn } from '@/components/utils/logging';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * AUTH PROVIDER - PLATFORM COMPLIANT VERSION
 * 
 * ❌ DOES NOT USE: useNavigate, useLocation, Navigate from react-router-dom
 * ✅ USES: window.location for redirects (platform-compliant)
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const currentUser = await base44.auth.me();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        logInfo('User authenticated successfully', 'AUTH');
      } else {
        setUser(null);
        setIsAuthenticated(false);
        logWarn('No authenticated user found', 'AUTH');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      logError(error, 'AUTH');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await base44.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      // Use native browser navigation
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      logError(error, 'AUTH');
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshAuth: checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};