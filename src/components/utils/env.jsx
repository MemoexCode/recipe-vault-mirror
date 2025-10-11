/**
 * ENVIRONMENT UTILITIES
 * 
 * Zweck:
 * - Zentrale Funktion zur Entwicklermodus-Erkennung
 * - Unterstützt manuelles Toggle via localStorage
 * - Funktioniert auch in Base44 Web-Umgebung
 * 
 * Verwendung:
 * import { isDevelopment, toggleDeveloperMode } from "@/components/utils/env";
 * if (isDevelopment()) { ... }
 */

/**
 * Prüft ob wir im Entwicklermodus sind
 * 
 * Kombiniert zwei Checks:
 * 1. Manueller Flag in localStorage (für Base44 Web)
 * 2. Hostname-basierte Erkennung (localhost, dev, staging)
 * 
 * @returns {boolean} True wenn Entwicklermodus aktiv
 */
export const isDevelopment = () => {
  try {
    // Check 1: Manueller Flag aus localStorage
    const manualFlag = localStorage.getItem("developer_mode_enabled") === "true";
    
    // Check 2: Hostname-basierte Erkennung
    const hostnameCheck =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("dev") ||
      window.location.hostname.includes("staging");
    
    return manualFlag || hostnameCheck;
  } catch {
    return false;
  }
};

/**
 * Prüft ob destructive Developer-Aktionen erlaubt sind
 * 
 * SICHERHEITSCHECK: Nur erlaubt wenn:
 * - Lokale Entwicklungsumgebung ODER
 * - Explizit aktivierter Developer Mode
 * 
 * Verwendet für gefährliche Operationen wie "Clear App State"
 * 
 * @returns {boolean} True wenn destructive Aktionen erlaubt
 */
export const isDevAllowed = () => {
  return isDevelopment();
};

/**
 * Schaltet den Entwicklermodus um
 * 
 * Speichert neuen Status in localStorage und lädt Seite neu
 * für sauberen State-Reset
 */
export const toggleDeveloperMode = () => {
  try {
    const current = localStorage.getItem("developer_mode_enabled") === "true";
    const newState = !current;
    
    localStorage.setItem("developer_mode_enabled", newState.toString());
    
    console.log(`🧰 Developer Mode ${newState ? 'aktiviert' : 'deaktiviert'}`);
    
    // Reload für sauberen State
    window.location.reload();
  } catch (err) {
    console.error("Failed to toggle developer mode:", err);
  }
};

/**
 * Gibt den aktuellen Developer-Mode-Status zurück (ohne Hostname-Check)
 * 
 * @returns {boolean} True wenn manuell aktiviert
 */
export const isManualDevModeEnabled = () => {
  try {
    return localStorage.getItem("developer_mode_enabled") === "true";
  } catch {
    return false;
  }
};