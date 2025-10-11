/**
 * PROTECTED ROUTE COMPONENT
 * 
 * Zweck:
 * - Schützt Routen vor unauthentifizierten Zugriffen
 * - Leitet automatisch zur base44 Login-Seite um
 * - Speichert Return-URL für Redirect nach Login
 * 
 * Verwendung:
 * <ProtectedRoute><YourPage /></ProtectedRoute>
 */

import React, { useEffect } from "react";
import { useAuth } from "@/components/contexts/AuthContext";

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

  // Lade-Zustand während Auth-Initialisierung
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Lade Anmeldestatus …</p>
        </div>
      </div>
    );
  }

  // Redirect-Zustand wenn nicht authentifiziert
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Weiterleitung zur Anmeldung …</p>
        </div>
      </div>
    );
  }

  // User ist authentifiziert → Render children
  return <>{children}</>;
}