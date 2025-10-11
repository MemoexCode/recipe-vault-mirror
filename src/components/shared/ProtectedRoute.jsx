import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isReady } = useAuth();

  // Keine Blockierung, keine Vollbild-Loader
  if (!isReady) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}