/**
 * ZENTRALES LOGGING-SYSTEM MIT FLOOD-GUARD
 * 
 * Zweck:
 * - Client-seitige Error- und Info-Logs für Entwickler
 * - Speichert Logs in localStorage (max 200 Einträge)
 * - FLOOD-GUARD: Stoppt bei > 200 Logs pro Session
 * - Hilft bei Debugging von Produktionsproblemen
 * 
 * ENHANCED: Robuste Serialisierung gegen Circular References
 */

import { isDevelopment } from "@/components/utils/env";

const LOG_STORAGE_KEY = 'base44_logs';
const MAX_LOG_ENTRIES = 200;

// Flood-Guard: Session-weiter Counter
if (typeof window !== 'undefined') {
  window.__rv_log_count = window.__rv_log_count || 0;
  window.__rv_log_blocked = window.__rv_log_blocked || false;
}

/**
 * Log-Level Definitionen
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  INFO: 'info',
  WARN: 'warn',
  DEBUG: 'debug'
};

/**
 * Safestringify: serialisiert Objekte robust (circular refs -> "[Circular]")
 */
const safeStringify = (obj) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, function (key, value) {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
      return value;
    });
  } catch (err) {
    // Letzte Absicherung: fallback auf String()
    try {
      return String(obj);
    } catch (e) {
      return '[Unserializable]';
    }
  }
};

/**
 * Lädt existierende Logs aus localStorage
 */
const loadLogs = () => {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load logs from localStorage:', err);
    return [];
  }
};

/**
 * Speichert Logs in localStorage (trimmt auf MAX_LOG_ENTRIES)
 * Sicheres Serialisieren mit Fallback, damit JSON-Fehler nicht die App crashen.
 */
const saveLogs = (logs) => {
  try {
    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
    const serialized = safeStringify(trimmedLogs);
    localStorage.setItem(LOG_STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save logs to localStorage (primary):', err);
    // Fallback: speichere nur abgespeckte Darstellung
    try {
      const minimal = logs.slice(-MAX_LOG_ENTRIES).map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        message: typeof l.message === 'string' ? l.message : (safeStringify(l.message)).slice(0, 200),
        context: l.context || null
      }));
      localStorage.setItem(LOG_STORAGE_KEY, safeStringify(minimal));
    } catch (err2) {
      console.error('Failed to save minimal logs to localStorage (fallback):', err2);
      // Wenn das alles fehlschlägt, ignoriere Speicherung (localStorage problematisch/inaccessible)
    }
  }
};

/**
 * Fügt einen Log-Eintrag hinzu (mit Flood-Guard)
 */
const addLogEntry = (level, message, context = null, details = null) => {
  // FLOOD-GUARD: Wenn bereits blockiert, nichts tun
  if (typeof window !== 'undefined' && window.__rv_log_blocked) {
    return null;
  }

  // Counter hochzählen
  if (typeof window !== 'undefined') {
    window.__rv_log_count = (window.__rv_log_count || 0) + 1;
    
    // Bei Überschreitung blockieren
    if (window.__rv_log_count > MAX_LOG_ENTRIES) {
      window.__rv_log_blocked = true;
      console.warn('🛑 Logging blocked - limit reached (200 logs)');
      return null;
    }
  }

  // Message robust in String überführen (wenn kein string)
  const safeMessage = (typeof message === 'string') ? message : (safeStringify(message));

  // Log-Eintrag erstellen
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: safeMessage,
    context: context || null,
    // speichern raw details (objekt) — beim serialisieren wird safeStringify greifen
    details: details || null
  };

  const logs = loadLogs();
  logs.push(entry);
  saveLogs(logs);

  // Console-Output (nur in Development oder bei Errors) — in try/catch, um console-Fehler zu vermeiden
  try {
    const consolePrefix = `[${entry.timestamp}] [${level.toUpperCase()}] ${context ? `[${context}]` : ''}`;
    
    if (level === LOG_LEVELS.ERROR) {
      console.error(consolePrefix, entry.message, entry.details || '');
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(consolePrefix, entry.message, entry.details || '');
    } else if (isDevelopment()) {
      console.log(consolePrefix, entry.message, entry.details || '');
    }
  } catch (err) {
    // Wenn Console-Logging fehlschlägt, nicht weiter stören
    try { console.error('Logging console output failed:', err); } catch(e) {}
  }

  return entry;
};

/**
 * Loggt einen Fehler
 */
export const logError = (error, context = null, details = null) => {
  // Falls ein Error-Objekt übergeben wird, nutze properties
  let message;
  let detailsObj = details;

  try {
    if (error && typeof error === 'object') {
      message = error?.message || safeStringify(error);
      // Falls kein explizites details-Objekt, versuchen stack/name/code zu extrahieren
      if (!detailsObj) {
        detailsObj = {
          stack: error?.stack || null,
          name: error?.name || null,
          code: error?.code || null
        };
      }
    } else {
      message = String(error);
    }
  } catch (err) {
    message = '[Error object not serializable]';
    detailsObj = { originalError: safeStringify(error), serializerError: String(err) };
  }

  return addLogEntry(LOG_LEVELS.ERROR, message, context, detailsObj);
};

/**
 * Loggt eine Info-Nachricht (nur in Development)
 */
export const logInfo = (message, context = null) => {
  if (!isDevelopment()) return null;
  return addLogEntry(LOG_LEVELS.INFO, message, context);
};

/**
 * Loggt eine Warnung
 */
export const logWarn = (message, context = null) => {
  return addLogEntry(LOG_LEVELS.WARN, message, context);
};

/**
 * Loggt eine Debug-Nachricht (nur in development)
 */
export const logDebug = (message, context = null) => {
  if (!isDevelopment()) return null;
  return addLogEntry(LOG_LEVELS.DEBUG, message, context);
};

/**
 * Gibt alle gespeicherten Logs zurück
 */
export const getLogs = () => {
  return loadLogs();
};

/**
 * Löscht alle gespeicherten Logs
 */
export const clearLogs = () => {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.__rv_log_count = 0;
      window.__rv_log_blocked = false;
    }
    console.log('✅ Logs cleared');
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
};

/**
 * Gibt Log-Statistiken zurück
 */
export const getLogStats = () => {
  const logs = loadLogs();
  
  return {
    total: logs.length,
    sessionCount: typeof window !== 'undefined' ? window.__rv_log_count : 0,
    blocked: typeof window !== 'undefined' ? window.__rv_log_blocked : false,
    byLevel: {
      error: logs.filter(l => l.level === LOG_LEVELS.ERROR).length,
      warn: logs.filter(l => l.level === LOG_LEVELS.WARN).length,
      info: logs.filter(l => l.level === LOG_LEVELS.INFO).length,
      debug: logs.filter(l => l.level === LOG_LEVELS.DEBUG).length
    },
    byContext: logs.reduce((acc, log) => {
      const ctx = log.context || 'UNKNOWN';
      acc[ctx] = (acc[ctx] || 0) + 1;
      return acc;
    }, {}),
    oldest: logs[0]?.timestamp || null,
    newest: logs[logs.length - 1]?.timestamp || null
  };
};

/**
 * Exportiert Logs als JSON-String für Download
 */
export const exportLogsAsJSON = () => {
  const logs = loadLogs();
  return safeStringify(logs);
};

/**
 * Registriert globale Error-Handler
 */
export const registerGlobalErrorHandlers = () => {
  // Uncaught errors
  try {
    window.addEventListener('error', (event) => {
      try {
        const payload = event && (event.error || event.message) ? (event.error || event.message) : 'Unknown global error';
        logError(payload, 'GLOBAL_ERROR');
      } catch (err) {
        // Sehr defensiv: Falls logging selbst fehlschlägt, wenigstens console
        try { console.error('Error in global error handler:', err); } catch(e) {}
      }
    });
  } catch (err) {
    try { console.error('Failed to register window.error handler:', err); } catch(e) {}
  }

  // Unhandled promise rejections
  try {
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const payload = event && event.reason ? event.reason : 'Unknown unhandled rejection';
        logError(payload, 'UNHANDLED_REJECTION');
      } catch (err) {
        try { console.error('Error in unhandledrejection handler:', err); } catch(e) {}
      }
    });
  } catch (err) {
    try { console.error('Failed to register unhandledrejection handler:', err); } catch(e) {}
  }

  logInfo('Global error handlers registered', 'LOGGING');
};