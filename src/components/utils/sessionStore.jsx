
/**
 * SESSION STORE UTILITY
 * 
 * Zweck:
 * - Sicherer Wrapper um localStorage/sessionStorage
 * - TTL (Time-To-Live) Support für automatische Bereinigung
 * - Namespace-Präfixe zur Vermeidung von Kollisionen
 * - JSON-Safe Parsing mit Error Handling
 * 
 * Verwendung:
 * import { saveSessionData, loadSessionData } from "@/components/utils/sessionStore";
 * saveSessionData('recipes', recipesArray, 12 * 60 * 60 * 1000); // 12h TTL
 * const recipes = loadSessionData('recipes');
 */

import { logInfo, logWarn, logError } from "./logging";

// Namespace-Präfix für alle Session-Keys
const SESSION_PREFIX = 'rv_session_';

// Standard TTL: 12 Stunden (in Millisekunden)
const DEFAULT_TTL = 12 * 60 * 60 * 1000;

/**
 * Session-Daten-Struktur
 * {
 *   data: any,           // Die eigentlichen Daten
 *   timestamp: number,   // Zeitpunkt des Speicherns
 *   ttl: number,         // Time-To-Live in ms
 *   expires: number      // Absoluter Ablauf-Zeitpunkt
 * }
 */

/**
 * Speichert Daten in sessionStorage mit TTL
 * 
 * @param {string} key - Eindeutiger Key (ohne Präfix)
 * @param {any} data - Zu speichernde Daten (wird JSON-serialisiert)
 * @param {number} ttl - Time-To-Live in Millisekunden (Standard: 12h)
 * @returns {boolean} True wenn erfolgreich gespeichert
 */
export const saveSessionData = (key, data, ttl = DEFAULT_TTL) => {
  try {
    const now = Date.now();
    const sessionData = {
      data,
      timestamp: now,
      ttl,
      expires: now + ttl
    };

    const fullKey = `${SESSION_PREFIX}${key}`;
    sessionStorage.setItem(fullKey, JSON.stringify(sessionData));
    
    logInfo(`Session data saved: ${key} (TTL: ${Math.round(ttl / 1000 / 60)}min)`, 'SessionStore');
    return true;
  } catch (err) {
    logError(err, 'SessionStore', { key, operation: 'save' });
    return false;
  }
};

/**
 * Lädt Daten aus sessionStorage
 * 
 * Prüft automatisch auf Ablauf und löscht abgelaufene Einträge
 * 
 * @param {string} key - Key (ohne Präfix)
 * @returns {any|null} Gespeicherte Daten oder null wenn nicht vorhanden/abgelaufen
 */
export const loadSessionData = (key) => {
  try {
    const fullKey = `${SESSION_PREFIX}${key}`;
    const stored = sessionStorage.getItem(fullKey);
    
    if (!stored) {
      return null;
    }

    const sessionData = JSON.parse(stored);
    const now = Date.now();

    // Prüfe ob abgelaufen
    if (now > sessionData.expires) {
      logWarn(`Session data expired: ${key} (age: ${Math.round((now - sessionData.timestamp) / 1000 / 60)}min)`, 'SessionStore');
      sessionStorage.removeItem(fullKey);
      return null;
    }

    const ageMinutes = Math.round((now - sessionData.timestamp) / 1000 / 60);
    logInfo(`Session data loaded: ${key} (age: ${ageMinutes}min)`, 'SessionStore');
    
    return sessionData.data;
  } catch (err) {
    logError(err, 'SessionStore', { key, operation: 'load' });
    return null;
  }
};

/**
 * Löscht einen Session-Key
 * 
 * @param {string} key - Key zum Löschen (ohne Präfix)
 * @returns {boolean} True wenn erfolgreich
 */
export const removeSessionKey = (key) => {
  try {
    const fullKey = `${SESSION_PREFIX}${key}`;
    sessionStorage.removeItem(fullKey);
    logInfo(`Session key removed: ${key}`, 'SessionStore');
    return true;
  } catch (err) {
    logError(err, 'SessionStore', { key, operation: 'remove' });
    return false;
  }
};

/**
 * Bereinigt alle abgelaufenen Session-Einträge
 * 
 * @returns {number} Anzahl gelöschter Einträge
 */
export const clearExpiredSessions = () => {
  try {
    let cleanedCount = 0;
    const now = Date.now();
    const keys = Object.keys(sessionStorage);

    keys.forEach(fullKey => {
      if (fullKey.startsWith(SESSION_PREFIX)) {
        try {
          const stored = sessionStorage.getItem(fullKey);
          const sessionData = JSON.parse(stored);

          if (now > sessionData.expires) {
            sessionStorage.removeItem(fullKey);
            cleanedCount++;
          }
        } catch {
          // Ungültige Daten → auch löschen
          sessionStorage.removeItem(fullKey);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      logInfo(`Cleared ${cleanedCount} expired session entries`, 'SessionStore');
    }

    return cleanedCount;
  } catch (err) {
    logError(err, 'SessionStore', { operation: 'clearExpired' });
    return 0;
  }
};

/**
 * Gibt Statistiken über aktive Session-Daten zurück
 * 
 * @returns {Object} { count, keys, totalSize }
 */
export const getSessionStats = () => {
  try {
    const keys = Object.keys(sessionStorage)
      .filter(k => k.startsWith(SESSION_PREFIX))
      .map(k => k.replace(SESSION_PREFIX, ''));

    let totalSize = 0;
    keys.forEach(key => {
      const fullKey = `${SESSION_PREFIX}${key}`;
      const data = sessionStorage.getItem(fullKey);
      if (data) {
        totalSize += data.length;
      }
    });

    return {
      count: keys.length,
      keys,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024)
    };
  } catch (err) {
    logError(err, 'SessionStore', { operation: 'getStats' });
    return { count: 0, keys: [], totalSize: 0, totalSizeKB: 0 };
  }
};

/**
 * Löscht alle Session-Daten (außer geschützte Keys)
 * 
 * @param {string[]} protectedKeys - Keys die nicht gelöscht werden sollen
 * @returns {number} Anzahl gelöschter Einträge
 */
export const clearAllSessions = (protectedKeys = []) => {
  try {
    let clearedCount = 0;
    const keys = Object.keys(sessionStorage);

    keys.forEach(fullKey => {
      if (fullKey.startsWith(SESSION_PREFIX)) {
        const key = fullKey.replace(SESSION_PREFIX, '');
        if (!protectedKeys.includes(key)) {
          sessionStorage.removeItem(fullKey);
          clearedCount++;
        }
      }
    });

    logInfo(`Cleared ${clearedCount} session entries`, 'SessionStore');
    return clearedCount;
  } catch (err) {
    logError(err, 'SessionStore', { operation: 'clearAll' });
    return 0;
  }
};
