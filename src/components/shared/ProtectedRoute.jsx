import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(true); // optimistisch: nicht blockieren

  useEffect(() => {
    let alive = true;
    base44.auth.me()
      .then(() => { if (alive) setAuthed(true); })
      .catch(() => { if (alive) setAuthed(false); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  if (!ready) {
    // Keine Vollbild-Überblendung – Seite bleibt ruhig sichtbar
    return children;
  }
  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}