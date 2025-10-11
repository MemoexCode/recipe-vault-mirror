/**
 * ZENTRALES LOGGING-SYSTEM MIT FLOOD-GUARD
 * 
 * Zweck:
 * - Client-seitige Error- und Info-Logs für Entwickler
 * - Speichert Logs in localStorage (max 200 Einträge)
 * - FLOOD-GUARD: Stoppt bei > 200 Logs pro Session
 * - Hilft bei Debugging von Produktionsproblemen
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
    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (err) {
    console.error('Failed to save logs to localStorage:', err);
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

  // Log-Eintrag erstellen
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

  // Console-Output (nur in Development oder bei Errors)
  const consolePrefix = `[${entry.timestamp}] [${level.toUpperCase()}] ${context ? `[${context}]` : ''}`;
  
  if (level === LOG_LEVELS.ERROR) {
    console.error(consolePrefix, message, details || '');
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(consolePrefix, message, details || '');
  } else if (isDevelopment()) {
    console.log(consolePrefix, message, details || '');
  }

  return entry;
};

/**
 * Loggt einen Fehler
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
  return JSON.stringify(logs, null, 2);
};

/**
 * Registriert globale Error-Handler
 */
export const registerGlobalErrorHandlers = () => {
  // Uncaught errors
  window.addEventListener('error', (event) => {
    logError(
      event.error || event.message,
      'GLOBAL_ERROR'
    );
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      event.reason,
      'UNHANDLED_REJECTION'
    );
  });

  logInfo('Global error handlers registered', 'LOGGING');
};