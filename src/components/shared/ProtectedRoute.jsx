import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Geschützte Route ohne Fullscreen-Blocking
 * - Prüft Session leise im Hintergrund
 * - Vermeidet "Synchronisiere Sitzung" Overlay
 * - Rendert sofort, redirected nur wenn definitiv unauthenticated
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(null); // null = unknown, true/false = known

  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (!alive) return;
        setIsAuthed(!!authenticated);
      } catch (err) {
        if (!alive) return;
        console.warn('Auth check failed silently:', err);
        setIsAuthed(false);
      } finally {
        if (alive) setIsReady(true);
      }
    })();
    
    return () => { alive = false; };
  }, []);

  // Schnell weiterrendern; nur wenn sicher unauthenticated → redirect
  if (isReady && isAuthed === false) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Sofort rendern (kein Blocking)
  return <>{children}</>;
}