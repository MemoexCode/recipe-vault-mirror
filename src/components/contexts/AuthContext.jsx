import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { logInfo, logWarn } from "@/components/utils/logging";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isReady, setIsReady] = useState(true); // sofort sichtbar, keine Blockierung
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    
    base44.auth
      .me()
      .then((u) => {
        if (cancelled) return;
        if (u) {
          setUser(u);
          setIsAuthenticated(true);
          logInfo('User authenticated silently', 'AUTH');
        } else {
          setIsAuthenticated(false);
          logWarn('No user session found', 'AUTH');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsAuthenticated(false);
          logWarn('Auth check failed: ' + err.message, 'AUTH');
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ isReady, isAuthenticated, user }),
    [isReady, isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};