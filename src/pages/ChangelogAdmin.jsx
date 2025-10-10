import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Trash2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChangelogEntry } from "@/api/entities";
import { COLORS } from "@/components/utils/constants";

export default function ChangelogAdmin() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await ChangelogEntry.list("-date");
      setEntries(data);
    } catch (err) {
      console.error("Error loading entries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ WARNUNG: Alle Changelog-Einträge werden gelöscht! Fortfahren?")) {
      return;
    }

    setIsLoading(true);
    try {
      for (const entry of entries) {
        await ChangelogEntry.delete(entry.id);
      }
      setMessage({ type: "success", text: `${entries.length} Einträge erfolgreich gelöscht!` });
      await loadEntries();
    } catch (err) {
      setMessage({ type: "error", text: "Fehler beim Löschen: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (entries.length > 0) {
      if (!confirm("Es existieren bereits Einträge. Diese werden überschrieben. Fortfahren?")) {
        return;
      }
      await handleDeleteAll();
    }

    setIsInitializing(true);
    setMessage(null);

    try {
      const initialData = [
        {
          version: "1.0.0",
          date: "2025-01-01",
          title: "Initial Release",
          description: "Die erste Version von RecipeVault mit allen Grundfunktionen",
          is_major: true,
          changes: [
            { type: "new", category: "Import", description: "Rezepte aus URLs importieren mit automatischer Extraktion" },
            { type: "new", category: "Import", description: "PDF-Upload für handgeschriebene oder gedruckte Rezepte" },
            { type: "new", category: "Import", description: "Foto-Upload mit OCR-Erkennung" },
            { type: "new", category: "Rezepte", description: "Rezept-Detailansicht mit Zutaten, Zubereitung und Nährwerten" },
            { type: "new", category: "Rezepte", description: "Rezepte bearbeiten und löschen" },
            { type: "new", category: "Organisation", description: "Sammlungen erstellen und Rezepte organisieren" },
            { type: "new", category: "Organisation", description: "Kategorien-System mit Mahlzeiten, Gängen und Küchen" },
            { type: "new", category: "Zutatenbilder", description: "KI-generierte Bilder für Zutaten" }
          ]
        },
        {
          version: "1.1.0",
          date: "2025-01-03",
          title: "Smart Ingredient Images",
          description: "Intelligentes Matching-System für Zutatenbilder und Bulk-Generierung",
          is_major: false,
          changes: [
            { type: "new", category: "Zutatenbilder", description: "Intelligentes Fuzzy-Matching für Zutatennamen (Singular/Plural, Synonyme)" },
            { type: "new", category: "Zutatenbilder", description: "Bulk-Generierung für vordefinierte Zutaten-Bibliotheken" },
            { type: "new", category: "Zutatenbilder", description: "Alternative Namen (Tags) für besseres Matching" },
            { type: "improved", category: "Zutatenbilder", description: "Automatisches Matching zwischen Rezept-Zutaten und Bildern" },
            { type: "improved", category: "Zutatenbilder", description: "Kategorisierung von Zutatenbildern (Gemüse, Obst, Fleisch, etc.)" }
          ]
        },
        {
          version: "1.2.0",
          date: "2025-01-05",
          title: "Batch-Import & Duplikaterkennung",
          description: "Mehrere Rezepte gleichzeitig importieren mit intelligenter Duplikaterkennung",
          is_major: true,
          changes: [
            { type: "new", category: "Import", description: "Batch-Upload: Mehrere PDFs/Bilder gleichzeitig hochladen und verarbeiten" },
            { type: "new", category: "Import", description: "Intelligente Duplikaterkennung basierend auf Titel und Zutaten" },
            { type: "new", category: "Import", description: "Checkpoint-System: Import-Fortschritt wird gespeichert und kann fortgesetzt werden" },
            { type: "new", category: "Import", description: "OCR-Review-Stage: Text vor Extraktion überprüfen und korrigieren" },
            { type: "improved", category: "Import", description: "Automatische Bildkomprimierung für schnellere Uploads" },
            { type: "improved", category: "Import", description: "Retry-Mechanismus bei fehlgeschlagenen Imports" },
            { type: "performance", category: "Import", description: "Parallele Verarbeitung mehrerer Dateien" }
          ]
        },
        {
          version: "1.3.0",
          date: "2025-01-06",
          title: "Smart Filters & Collections",
          description: "Erweiterte Filter-Optionen und Drag & Drop für Sammlungen",
          is_major: false,
          changes: [
            { type: "new", category: "Organisation", description: "Smart Filter Dialog mit Ernährungsform, Ernährungsziel, Zuckergehalt" },
            { type: "new", category: "Organisation", description: "Drag & Drop: Rezepte zu Sammlungen hinzufügen oder in Papierkorb legen" },
            { type: "new", category: "Organisation", description: "Papierkorb mit Wiederherstellungs-Funktion" },
            { type: "improved", category: "Organisation", description: "Sammlungen mit Farbcodes und Icons" },
            { type: "improved", category: "Rezepte", description: "Rezept-Export als PDF mit professionellem Layout" },
            { type: "design", category: "Allgemein", description: "Konsistentes Farbschema (Schwarz, Orange, Silber)" }
          ]
        },
        {
          version: "1.4.0",
          date: "2025-01-08",
          title: "Rezept-Detailseiten-Optimierung",
          description: "Komplettes Redesign der Rezept-Detailseiten mit persönlichen Notizen, Sticky Navigation und vielen UX-Verbesserungen",
          is_major: true,
          changes: [
            { type: "new", category: "Rezepte", description: "Persönlicher Notizen-Tab: Eigene Anmerkungen zu jedem Rezept" },
            { type: "new", category: "Rezepte", description: "Sticky Navigation: Titel und Buttons bleiben beim Scrollen sichtbar" },
            { type: "new", category: "Rezepte", description: "Interaktive Zutatenliste mit Checkboxen" },
            { type: "new", category: "Rezepte", description: "Integrierte Timer-Funktion für Zubereitungsschritte" },
            { type: "improved", category: "Rezepte", description: "Hero-Sektion mit eleganten Overlays und Schnellinfos" },
            { type: "improved", category: "Rezepte", description: "Nährwerte mit Tageswert-Prozentsätzen und visuellen Balken" },
            { type: "design", category: "Rezepte", description: "Modernisierte Tab-Navigation und Badge-Hierarchie" },
            { type: "performance", category: "Rezepte", description: "Optimierte Ladezeiten durch effizienteres Ingredient-Matching" }
          ]
        }
      ];

      for (const entry of initialData) {
        await ChangelogEntry.create(entry);
      }

      setMessage({ type: "success", text: "Changelog erfolgreich initialisiert! 5 Versionen erstellt." });
      await loadEntries();
    } catch (err) {
      setMessage({ type: "error", text: "Fehler bei der Initialisierung: " + err.message });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Changelog"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Changelog Administration
            </h1>
            <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Verwalte die Changelog-Einträge
            </p>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <Alert 
            variant={message.type === "error" ? "destructive" : "default"}
            className="mb-6 rounded-xl"
          >
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* STATUS CARD */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-600">Lade Daten...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg">
                  <span className="font-semibold">{entries.length}</span> Changelog-Einträge in der Datenbank
                </p>
                {entries.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Versionen: {entries.map(e => e.version).join(", ")}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ACTIONS */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Aktionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Changelog initialisieren</h3>
              <p className="text-sm text-gray-600 mb-4">
                Erstellt die Standard-Changelog-Einträge (v1.0.0 bis v1.4.0). 
                Vorhandene Einträge werden überschrieben.
              </p>
              <Button
                onClick={handleInitialize}
                disabled={isInitializing || isLoading}
                className="rounded-xl text-white"
                style={{ backgroundColor: COLORS.ACCENT }}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isInitializing ? 'animate-spin' : ''}`} />
                {isInitializing ? "Initialisiere..." : "Changelog initialisieren"}
              </Button>
            </div>

            {entries.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2 text-red-600">Gefahrenzone</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Löscht ALLE Changelog-Einträge aus der Datenbank. Diese Aktion kann nicht rückgängig gemacht werden!
                </p>
                <Button
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                  variant="destructive"
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Alle Einträge löschen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}