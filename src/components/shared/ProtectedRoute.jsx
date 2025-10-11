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
import GlobalLoader from "@/components/ui/GlobalLoader";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, redirectToLogin } = useAuth();

  useEffect(() => {
    // Wenn Auth-State geladen und User nicht authentifiziert → Redirect
    if (!isInitializing && !isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      
      if (redirectToLogin) {
        // Nutze AuthContext redirect wenn verfügbar
        redirectToLogin(currentPath);
      } else if (window.base44?.auth?.login) {
        // Fallback zu globalem base44.auth
        window.base44.auth.login({ returnTo: currentPath });
      } else {
        console.error('No authentication method available');
      }
    }
  }, [isAuthenticated, isInitializing, redirectToLogin]);

  // SILENT Lade-Zustand während Auth-Initialisierung
  if (isInitializing) {
    return <GlobalLoader message="Synchronisiere Sitzung …" isVisible={true} />;
  }

  // SILENT Redirect-Zustand wenn nicht authentifiziert
  if (!isAuthenticated) {
    return <GlobalLoader message="Weiterleitung zur Anmeldung …" isVisible={true} />;
  }

  // User ist authentifiziert → Render children
  return <>{children}</>;
}