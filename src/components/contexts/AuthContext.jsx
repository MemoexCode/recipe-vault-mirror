/**
 * AUTHENTIFIZIERUNGS-CONTEXT WRAPPER
 * 
 * Zweck:
 * - Wrapper um base44.auth für konsistente API
 * - Cached User-State für bessere Performance
 * - Deutsche Fehlermeldungen
 * 
 * Props: children (React nodes)
 * 
 * Interaktion:
 * - Nutzt base44.auth für alle Auth-Operationen
 * - Bietet isAuthenticated, user, login/logout für die gesamte App
 * 
 * WICHTIG: base44 handled Login/Logout automatisch
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import http from "@/components/lib/http";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  /**
   * Lädt aktuellen User beim Mount
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isAuth = await http.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = await http.getCurrentUser();
          setUser(currentUser);
          console.log('✅ User authenticated:', currentUser.email);
        } else {
          console.log('ℹ️ User not authenticated');
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Redirect zu Login (base44 handled das)
   */
  const redirectToLogin = useCallback((nextUrl) => {
    http.redirectToLogin(nextUrl);
  }, []);

  /**
   * Logout (base44 handled das)
   */
  const logout = useCallback((redirectUrl) => {
    setUser(null);
    setIsAuthenticated(false);
    http.logout(redirectUrl);
  }, []);

  /**
   * User aktualisieren
   */
  const updateUser = useCallback(async (data) => {
    try {
      const updatedUser = await http.updateCurrentUser(data);
      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Benutzer konnte nicht aktualisiert werden.';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Auth-Status neu laden
   */
  const refreshAuthStatus = useCallback(async () => {
    try {
      const isAuth = await http.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const currentUser = await http.getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to refresh auth status:', err);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  /**
   * Fehler löschen
   */
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = {
    // State
    user,
    isAuthenticated,
    authError,
    isInitializing,
    
    // Actions
    redirectToLogin,
    logout,
    updateUser,
    refreshAuthStatus,
    clearError,
    
    // HTTP Client für direkten Zugriff
    http
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};