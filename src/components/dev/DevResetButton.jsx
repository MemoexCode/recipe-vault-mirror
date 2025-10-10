import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * ENTWICKLER-RESET-BUTTON
 * - Löscht localStorage (Checkpoints, Cache)
 * - Führt harten Cache-freien Reload durch
 * - Immer erreichbar, auch bei Fehlern
 * - Greift NICHT auf Backend-Daten zu
 */
export default function DevResetButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleReset = () => {
    setShowConfirmDialog(false);
    
    try {
      // 1. Zeige User-Feedback
      console.log("🔄 Entwickler-Reset wird durchgeführt...");
      
      // 2. Lösche spezifische localStorage-Einträge
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keysToDelete.push(key);
      }
      
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Gelöscht: ${key}`);
      });
      
      // 3. Lösche sessionStorage
      sessionStorage.clear();
      console.log("🗑️ SessionStorage geleert");
      
      // 4. Service Worker Cache löschen (falls vorhanden)
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
            console.log(`🗑️ Cache gelöscht: ${name}`);
          });
        });
      }
      
      // 5. Harter Reload ohne Cache
      console.log("🔄 Erzwinge Cache-freien Reload...");
      
      // Timeout um sicherzustellen, dass Logs erscheinen
      setTimeout(() => {
        window.location.reload(true);
      }, 100);
      
    } catch (err) {
      console.error("❌ Fehler beim Reset:", err);
      alert("Fehler beim Reset. Bitte manuell Seite neu laden (Ctrl+Shift+R / Cmd+Shift+R)");
    }
  };

  return (
    <>
      {/* Fixed Button - Immer sichtbar, auch bei Fehlern */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999999, // Sehr hoch, damit immer sichtbar
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px'
        }}
      >
        {/* Expanded Menu */}
        {isExpanded && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              border: '2px solid #FF5722',
              minWidth: '250px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1A1A1A', margin: 0 }}>
                🛠️ Entwickler-Tools
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Was wird zurückgesetzt:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Import-Checkpoints (localStorage)</li>
                <li>Browser-Cache (Assets)</li>
                <li>Session-Daten</li>
                <li>Service Worker Cache</li>
              </ul>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#FF5722' }}>
                ⚠️ Backend-Daten bleiben unberührt!
              </p>
            </div>
            
            <Button
              onClick={() => setShowConfirmDialog(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-xl shadow-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset durchführen
            </Button>
            
            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#FFF3E0', borderRadius: '8px', fontSize: '11px', color: '#E65100' }}>
              💡 <strong>Tipp:</strong> Bei schweren Fehlern kannst du auch manuell neu laden: <code style={{ backgroundColor: '#FFE0B2', padding: '2px 4px', borderRadius: '3px' }}>Ctrl+Shift+R</code>
            </div>
          </div>
        )}

        {/* Main Trigger Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
            border: '3px solid white',
            boxShadow: '0 4px 20px rgba(255, 87, 34, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: isExpanded ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = isExpanded ? 'rotate(180deg) scale(1.15)' : 'rotate(0deg) scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 87, 34, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = isExpanded ? 'rotate(180deg) scale(1.1)' : 'rotate(0deg) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 87, 34, 0.4)';
          }}
          title="Entwickler-Tools"
        >
          <Zap className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              Entwickler-Reset bestätigen
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-4">
              <p>
                Möchtest du wirklich einen vollständigen Frontend-Reset durchführen?
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-orange-800 mb-2">
                  ⚠️ Folgendes wird gelöscht:
                </p>
                <ul className="list-disc list-inside space-y-1 text-orange-700">
                  <li>Alle Import-Checkpoints</li>
                  <li>Browser-Cache & Assets</li>
                  <li>Session-Speicher</li>
                  <li>Service Worker Cache</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-green-800 mb-1">
                  ✅ Was bleibt erhalten:
                </p>
                <p className="text-green-700">
                  Alle Backend-Daten (Rezepte, Kategorien, Sammlungen) bleiben unberührt!
                </p>
              </div>
              
              <p className="text-xs text-gray-500">
                Die Seite wird automatisch neu geladen.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="w-full sm:w-auto"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleReset}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Jetzt zurücksetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}