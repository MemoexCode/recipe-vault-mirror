/**
 * PROTECTED ROUTE COMPONENT
 * 
 * Zweck:
 * - Schützt Routen vor unauthentifizierten Zugriffen
 * - Leitet automatisch zur base44 Login-Seite um
 * - Speichert Return-URL für Redirect nach Login
 * - SILENT Loading - kein Blocking Screen
 * 
 * Verwendung:
 * <ProtectedRoute><YourPage /></ProtectedRoute>
 */

import React, { useEffect } from "react";
import { useAuth } from "@/components/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, redirectToLogin } = useAuth();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      const ret = window.location.pathname + window.location.search;
      if (redirectToLogin) {
        redirectToLogin(ret);
      } else if (window.base44?.auth?.login) {
        window.base44.auth.login({ returnTo: ret });
      }
    }
  }, [isAuthenticated, isInitializing, redirectToLogin]);

  return <>{children}</>;
}