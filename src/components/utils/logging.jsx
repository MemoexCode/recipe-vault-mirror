
/**
 * ZENTRALES LOGGING-SYSTEM
 * 
 * Zweck:
 * - Client-seitige Error- und Info-Logs für Entwickler
 * - Speichert Logs in localStorage (max 200 Einträge)
 * - Hilft bei Debugging von Produktionsproblemen
 * 
 * Verwendung:
 * import { logError, logInfo } from "@/components/utils/logging";
 * logError(error, 'IMPORT');
 * logInfo('Session refreshed', 'AUTH');
 */

import { isDevelopment } from "@/components/utils/env";

const LOG_STORAGE_KEY = 'base44_logs';
const MAX_LOG_ENTRIES = 200;

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
 */
const saveLogs = (logs) => {
  try {
    // Behalte nur die neuesten MAX_LOG_ENTRIES Einträge
    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (err) {
    console.error('Failed to save logs to localStorage:', err);
  }
};

/**
 * Fügt einen Log-Eintrag hinzu
 */
const addLogEntry = (level, message, context = null, details = null) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: String(message),
    context: context || null,
    details: details || null
  };

  const logs = loadLogs();
  logs.push(entry);
  saveLogs(logs);

  // Auch in Console ausgeben für Live-Debugging
  const consolePrefix = `[${entry.timestamp}] [${level.toUpperCase()}] ${context ? `[${context}]` : ''}`;
  if (level === LOG_LEVELS.ERROR) {
    console.error(consolePrefix, message, details || '');
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(consolePrefix, message, details || '');
  } else {
    console.log(consolePrefix, message, details || '');
  }

  return entry;
};

/**
 * Loggt einen Fehler
 * @param {Error|string} error - Fehler-Objekt oder Fehlernachricht
 * @param {string} context - Kontext (z.B. 'HTTP', 'AUTH', 'IMPORT')
 */
export const logError = (error, context = null) => {
  const message = error?.message || String(error);
  const details = {
    stack: error?.stack || null,
    name: error?.name || null,
    code: error?.code || null
  };

  return addLogEntry(LOG_LEVELS.ERROR, message, context, details);
};

/**
 * Loggt eine Info-Nachricht
 * @param {string} message - Info-Nachricht
 * @param {string} context - Kontext (z.B. 'AUTH', 'IMPORT')
 */
export const logInfo = (message, context = null) => {
  return addLogEntry(LOG_LEVELS.INFO, message, context);
};

/**
 * Loggt eine Warnung
 * @param {string} message - Warn-Nachricht
 * @param {string} context - Kontext
 */
export const logWarn = (message, context = null) => {
  return addLogEntry(LOG_LEVELS.WARN, message, context);
};

/**
 * Loggt eine Debug-Nachricht (nur in development)
 * @param {string} message - Debug-Nachricht
 * @param {string} context - Kontext
 */
export const logDebug = (message, context = null) => {
  if (isDevelopment()) {
    return addLogEntry(LOG_LEVELS.DEBUG, message, context);
  }
};

/**
 * Gibt alle gespeicherten Logs zurück
 * @returns {Array} Array von Log-Einträgen
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
    console.log('✅ Logs cleared');
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
};

/**
 * Gibt Log-Statistiken zurück
 * @returns {Object} Statistiken über gespeicherte Logs
 */
export const getLogStats = () => {
  const logs = loadLogs();
  
  return {
    total: logs.length,
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
 * @returns {string} JSON-String aller Logs
 */
export const exportLogsAsJSON = () => {
  const logs = loadLogs();
  return JSON.stringify(logs, null, 2);
};

/**
 * Registriert globale Error-Handler
 * Sollte beim App-Start aufgerufen werden
 */
export const registerGlobalErrorHandlers = () => {
  // Uncaught errors
  window.addEventListener('error', (event) => {
    logError(
      event.error || event.message,
      'GLOBAL_ERROR',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      event.reason,
      'UNHANDLED_REJECTION',
      {
        promise: 'Promise rejection'
      }
    );
  });

  logInfo('Global error handlers registered', 'LOGGING');
};
