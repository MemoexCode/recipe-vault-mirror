import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function BulkProgressAlert({ progress }) {
  if (!progress || progress.total === 0) return null;

  return (
    <Alert 
      className="mb-6 rounded-xl" 
      style={{ 
        borderColor: "#3B82F6", 
        backgroundColor: "rgba(59, 130, 246, 0.05)" 
      }}
    >
      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#3B82F6" }} />
      <AlertDescription style={{ color: "#1A1A1A" }}>
        <strong>Generiere Zutatenbilder...</strong>
        <br />
        Fortschritt: {progress.current} von {progress.total}
        {progress.currentName && ` • Aktuell: ${progress.currentName}`}
        <br />
        <span className="text-sm text-gray-600">
          Dies kann einige Minuten dauern. Bitte warte...
        </span>
      </AlertDescription>
    </Alert>
  );
}