/**
 * LOGOUT PAGE
 * 
 * Zweck:
 * - Saubere Abmeldung des Benutzers
 * - Redirect zur Login-Seite nach erfolgreichem Logout
 * 
 * Route: /logout
 */

import React, { useEffect } from "react";
import { useAuth } from "@/components/contexts/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    // Führe Logout beim Mount aus
    const performLogout = async () => {
      if (logout) {
        // Nutze AuthContext logout wenn verfügbar
        logout();
      } else if (window.base44?.auth?.logout) {
        // Fallback zu globalem base44.auth
        window.base44.auth.logout();
      } else {
        console.error('No logout method available');
      }
    };

    performLogout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-6"></div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Abmeldung …</h2>
        <p className="text-gray-600">Du wirst abgemeldet und zur Startseite weitergeleitet.</p>
      </div>
    </div>
  );
}