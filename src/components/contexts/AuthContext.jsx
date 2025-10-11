/**
 * AUTHENTIFIZIERUNGS-CONTEXT WRAPPER
 * 
 * Zweck:
 * - Wrapper um base44.auth für konsistente API
 * - Cached User-State für bessere Performance
 * - Deutsche Fehlermeldungen
 * - SILENT Auth Loading (kein Blocking Screen)
 * - Session-Monitoring alle 5 Minuten
 * 
 * Props: children (React nodes)
 * 
 * Interaktion:
 * - Nutzt base44.auth für alle Auth-Operationen
 * - Bietet isAuthenticated, user, login/logout für die gesamte App
 * - Loggt Auth-Events für Debugging
 * 
 * WICHTIG: base44 handled Login/Logout automatisch
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { logError, logInfo, logWarn } from "@/components/utils/logging";
import { showError } from "@/components/ui/toastUtils";

const AuthContext = createContext(null);

// Session-Check Intervall (5 Minuten)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms

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
   * Lädt aktuellen User beim Mount (SILENT)
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          logInfo(`User authenticated: ${currentUser.email}`, 'AUTH');
        } else {
          logInfo('User not authenticated', 'AUTH');
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        logError(err, 'AUTH_INIT');
        setAuthError('Fehler beim Laden des Authentifizierungsstatus.');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Session-Monitoring: Prüft alle 5 Minuten ob Session noch gültig ist
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return; // Kein Monitoring wenn nicht eingeloggt
    }

    const checkSession = async () => {
      try {
        const isStillAuth = await base44.auth.isAuthenticated();
        
        if (!isStillAuth && isAuthenticated) {
          // Session ist abgelaufen!
          logWarn('Session expired during monitoring', 'AUTH');
          showError('Sitzung abgelaufen. Bitte erneut anmelden.');
          
          setIsAuthenticated(false);
          setUser(null);
          
          // Redirect zur Login-Seite
          setTimeout(() => {
            base44.auth.redirectToLogin(window.location.pathname);
          }, 2000);
        }
      } catch (err) {
        logError(err, 'SESSION_CHECK');
        // Bei Fehler nicht abmelden - könnte Netzwerkproblem sein
      }
    };

    // Initial check nach 1 Minute
    const initialTimeout = setTimeout(checkSession, 60000);
    
    // Danach alle 5 Minuten
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  /**
   * Redirect zu Login (base44 handled das)
   */
  const redirectToLogin = useCallback((nextUrl) => {
    logInfo(`Redirecting to login, return URL: ${nextUrl || 'none'}`, 'AUTH');
    base44.auth.redirectToLogin(nextUrl);
  }, []);

  /**
   * Logout (base44 handled das)
   */
  const logout = useCallback((redirectUrl) => {
    logInfo('User logged out', 'AUTH');
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(redirectUrl);
  }, []);

  /**
   * User aktualisieren
   */
  const updateUser = useCallback(async (data) => {
    try {
      const updatedUser = await base44.auth.updateMe(data);
      setUser(updatedUser);
      logInfo('User profile updated', 'AUTH');
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Benutzer konnte nicht aktualisiert werden.';
      logError(err, 'AUTH_UPDATE');
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Auth-Status neu laden
   */
  const refreshAuthStatus = useCallback(async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        logInfo('Auth status refreshed', 'AUTH');
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to refresh auth status:', err);
      logError(err, 'AUTH_REFRESH');
      setAuthError('Fehler beim Aktualisieren des Authentifizierungsstatus.');
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
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};