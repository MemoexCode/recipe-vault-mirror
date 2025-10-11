/**
 * ZENTRALER HTTP-CLIENT MIT AUTHENTIFIZIERUNGS-INTERCEPTORS
 * 
 * Zweck:
 * - Wrapper um base44 SDK mit zusätzlicher Fehlerbehandlung
 * - Automatisches Retry bei 5xx Fehlern mit Exponential Backoff
 * - RATE LIMIT HANDLING: Retry bei 429 mit längerem Backoff
 * - Offline Queue für POST/PUT Requests
 * - Deutsche Fehlermeldungen für bessere UX
 * 
 * ENHANCED: Network Resilience
 * - Retry-Logic für 502/503/504 Errors
 * - Offline Queue mit localStorage Persistence
 * - Automatische Synchronisierung bei Reconnect
 */

import { base44 } from "@/api/base44Client";
import { logError, logWarn, logInfo } from "@/components/utils/logging";
import { showError, showSuccess, showInfo } from "@/components/ui/toastUtils";

/**
 * Sleep-Funktion für Retry-Delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Berechnet Exponential Backoff mit Jitter
 */
const calculateBackoff = (attempt, baseDelay = 1000) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0-1000ms Jitter
  return exponentialDelay + jitter;
};

/**
 * RATE LIMIT: Berechnet längeren Backoff bei 429
 */
const calculateRateLimitBackoff = (attempt) => {
  // Bei Rate Limit länger warten: 5s, 10s, 20s
  const baseDelay = 5000;
  return baseDelay * Math.pow(2, attempt);
};

/**
 * OFFLINE QUEUE
 * 
 * Speichert fehlgeschlagene POST/PUT Requests für spätere Wiederholung
 */
const QUEUE_KEY = 'rv_offline_queue';

class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;
    this.listeners = [];

    // Event Listener für Online/Offline Status
    window.addEventListener('online', () => {
      this.isOnline = true;
      logInfo('Network reconnected', 'NetworkQueue');
      showSuccess('Verbindung wiederhergestellt');
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logWarn('Network disconnected', 'NetworkQueue');
      showInfo('Offline-Modus aktiviert – Änderungen werden lokal gespeichert');
    });
  }

  /**
   * Lädt Queue aus localStorage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Speichert Queue in localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      logError(err, 'NetworkQueue', { operation: 'saveQueue' });
    }
  }

  /**
   * Fügt einen Request zur Queue hinzu
   */
  enqueue(operation) {
    const queueItem = {
      ...operation,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random()}`
    };

    this.queue.push(queueItem);
    this.saveQueue();
    
    logInfo(`Request queued: ${operation.method} ${operation.entityName}`, 'NetworkQueue');
    this.notifyListeners();
  }

  /**
   * Gibt aktuelle Queue-Größe zurück
   */
  getQueueSize() {
    return this.queue.length;
  }

  /**
   * Führt alle Queue-Items aus
   */
  async flushQueue() {
    if (!this.isOnline || this.queue.length === 0) {
      return { success: 0, failed: 0 };
    }

    logInfo(`Flushing queue (${this.queue.length} items)`, 'NetworkQueue');
    
    const results = { success: 0, failed: 0 };
    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        await this.executeQueuedRequest(item);
        results.success++;
        
        // Entferne erfolgreiches Item
        this.queue = this.queue.filter(q => q.id !== item.id);
      } catch (err) {
        logError(err, 'NetworkQueue', { item });
        results.failed++;
      }
    }

    this.saveQueue();
    this.notifyListeners();

    if (results.success > 0) {
      showSuccess(`${results.success} gespeicherte Änderungen synchronisiert`);
      logInfo(`Queue flushed: ${results.success} success, ${results.failed} failed`, 'NetworkQueue');
    }

    return results;
  }

  /**
   * Führt einen einzelnen Queue-Request aus
   */
  async executeQueuedRequest(item) {
    const { method, entityName, params } = item;

    if (method === 'create') {
      return await base44.entities[entityName].create(params);
    } else if (method === 'update') {
      return await base44.entities[entityName].update(params.id, params.data);
    } else if (method === 'delete') {
      return await base44.entities[entityName].delete(params.id);
    }

    throw new Error(`Unknown method: ${method}`);
  }

  /**
   * Registriert Listener für Queue-Änderungen
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Entfernt Listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Benachrichtigt alle Listener über Queue-Änderungen
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.getQueueSize()));
  }

  /**
   * Löscht die gesamte Queue
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
    logInfo('Queue cleared', 'NetworkQueue');
  }
}

// Globale Offline Queue Instanz
const offlineQueue = new OfflineQueue();

/**
 * HTTP-Client Klasse für base44 API
 */
class HttpClient {
  /**
   * Führt HTTP-Request mit Retry-Logic aus
   * 
   * @param {Function} apiCall - API-Funktion die ausgeführt werden soll
   * @param {number} retryCount - Aktueller Retry-Versuch
   * @param {number} maxRetries - Maximale Anzahl Retries
   * @param {boolean} isWrite - Ob es ein Write-Request ist (POST/PUT/DELETE)
   * @returns {Promise} API Response
   */
  async request(apiCall, retryCount = 0, maxRetries = 3, isWrite = false) {
    try {
      const response = await apiCall();
      return response;

    } catch (error) {
      const errorMessage = error.message || '';
      const statusCode = error.status || error.statusCode;

      // ============================================
      // RATE LIMIT (429) - LONGER BACKOFF
      // ============================================
      if (statusCode === 429 && retryCount < maxRetries) {
        const backoffDelay = calculateRateLimitBackoff(retryCount);
        logWarn(
          `429 Rate Limit - Retry ${retryCount + 1}/${maxRetries} in ${(backoffDelay/1000).toFixed(1)}s`,
          'HTTP'
        );
        
        await sleep(backoffDelay);
        return this.request(apiCall, retryCount + 1, maxRetries, isWrite);
      }

      // ============================================
      // 5XX SERVER ERRORS - EXPONENTIAL BACKOFF
      // ============================================
      if ([502, 503, 504].includes(statusCode) && retryCount < maxRetries) {
        const backoffDelay = calculateBackoff(retryCount);
        logWarn(
          `${statusCode} Server Error - Retry ${retryCount + 1}/${maxRetries} in ${backoffDelay.toFixed(0)}ms`,
          'HTTP'
        );
        
        await sleep(backoffDelay);
        return this.request(apiCall, retryCount + 1, maxRetries, isWrite);
      }

      // ============================================
      // NETWORK ERRORS - OFFLINE QUEUE
      // ============================================
      if ((errorMessage.includes('Network') || errorMessage.includes('fetch') || !navigator.onLine) && isWrite) {
        logWarn('Network error on write operation - queuing for later', 'NetworkQueue');
        // Queue wird vom aufrufenden Code gehandhabt
        throw new Error('NETWORK_ERROR_QUEUED');
      }

      // ============================================
      // ALLE FEHLER LOGGEN
      // ============================================
      logError(error, 'HTTP', {
        statusCode,
        retryCount,
        maxRetries,
        isWrite
      });

      // ============================================
      // RATE LIMIT ERROR - BENUTZERFREUNDLICHE NACHRICHT
      // ============================================
      if (statusCode === 429) {
        throw new Error('Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.');
      }

      // ============================================
      // NETZWERKFEHLER
      // ============================================
      if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        console.error('🌐 Network error:', error);
        throw new Error('Netzwerkfehler. Bitte versuche es erneut.');
      }

      // ============================================
      // AUTH ERRORS - DEUTSCHE NACHRICHTEN
      // ============================================
      if (statusCode === 401) {
        throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
      }

      if (statusCode === 403) {
        throw new Error('Zugriff verweigert.');
      }

      // Andere Fehler weiterwerfen
      throw error;
    }
  }

  /**
   * Entity Operations mit Retry und Offline Queue
   */
  async entityList(entityName, sortBy, limit) {
    return this.request(() => base44.entities[entityName].list(sortBy, limit));
  }

  async entityFilter(entityName, filter, sortBy, limit) {
    return this.request(() => base44.entities[entityName].filter(filter, sortBy, limit));
  }

  async entityCreate(entityName, data) {
    try {
      return await this.request(
        () => base44.entities[entityName].create(data),
        0,
        3,
        true // isWrite
      );
    } catch (err) {
      if (err.message === 'NETWORK_ERROR_QUEUED') {
        offlineQueue.enqueue({
          method: 'create',
          entityName,
          params: data
        });
        showInfo('Änderung wird synchronisiert wenn Verbindung wiederhergestellt ist');
        return null; // Signalisiert Queue-Erfolg
      }
      throw err;
    }
  }

  async entityBulkCreate(entityName, dataArray) {
    try {
      return await this.request(
        () => base44.entities[entityName].bulkCreate(dataArray),
        0,
        3,
        true
      );
    } catch (err) {
      if (err.message === 'NETWORK_ERROR_QUEUED') {
        // BulkCreate kann nicht ge-queued werden
        throw new Error('Bulk-Operationen erfordern eine Internetverbindung.');
      }
      throw err;
    }
  }

  async entityUpdate(entityName, id, data) {
    try {
      return await this.request(
        () => base44.entities[entityName].update(id, data),
        0,
        3,
        true
      );
    } catch (err) {
      if (err.message === 'NETWORK_ERROR_QUEUED') {
        offlineQueue.enqueue({
          method: 'update',
          entityName,
          params: { id, data }
        });
        showInfo('Änderung wird synchronisiert wenn Verbindung wiederhergestellt ist');
        return null;
      }
      throw err;
    }
  }

  async entityDelete(entityName, id) {
    try {
      return await this.request(
        () => base44.entities[entityName].delete(id),
        0,
        3,
        true
      );
    } catch (err) {
      if (err.message === 'NETWORK_ERROR_QUEUED') {
        offlineQueue.enqueue({
          method: 'delete',
          entityName,
          params: { id }
        });
        showInfo('Änderung wird synchronisiert wenn Verbindung wiederhergestellt ist');
        return null;
      }
      throw err;
    }
  }

  async entitySchema(entityName) {
    return this.request(() => base44.entities[entityName].schema());
  }

  /**
   * Integration Operations mit Retry
   */
  async invokeIntegration(packageName, endpointName, params) {
    return this.request(() => base44.integrations[packageName][endpointName](params));
  }

  /**
   * Zugriff auf Offline Queue
   */
  getOfflineQueue() {
    return offlineQueue;
  }
}

// Named export
export const http = new HttpClient();

// Export Queue für direkten Zugriff
export { offlineQueue };