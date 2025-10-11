/**
 * ZENTRALER HTTP-CLIENT MIT AUTHENTIFIZIERUNGS-INTERCEPTORS
 * 
 * Zweck:
 * - Wrapper um base44 SDK mit zusätzlicher Fehlerbehandlung
 * - Automatisches Retry bei 5xx Fehlern mit Exponential Backoff
 * - Deutsche Fehlermeldungen für bessere UX
 * - Error Logging für Debugging
 * 
 * Interaktion:
 * - Nutzt base44.auth für Authentication
 * - Loggt alle Fehler über logging utility
 * - Alle API-Calls sollten durch diesen Client laufen
 */

import { base44 } from "@/api/base44Client";
import { logError, logWarn } from "@/components/utils/logging";

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
 * HTTP-Client Klasse für base44 API
 */
class HttpClient {
  /**
   * Führt HTTP-Request mit Retry-Logic aus
   */
  async request(apiCall, retryCount = 0, maxRetries = 3) {
    try {
      const response = await apiCall();
      return response;

    } catch (error) {
      const errorMessage = error.message || '';
      const statusCode = error.status || error.statusCode;

      // ============================================
      // 5XX SERVER ERRORS - EXPONENTIAL BACKOFF
      // ============================================
      if (statusCode >= 500 && statusCode < 600 && retryCount < maxRetries) {
        const backoffDelay = calculateBackoff(retryCount);
        logWarn(
          `${statusCode} Server Error - Retry ${retryCount + 1}/${maxRetries} in ${backoffDelay.toFixed(0)}ms`,
          'HTTP'
        );
        
        await sleep(backoffDelay);
        return this.request(apiCall, retryCount + 1, maxRetries);
      }

      // ============================================
      // ALLE FEHLER LOGGEN
      // ============================================
      logError(error, 'HTTP', {
        statusCode,
        retryCount,
        maxRetries
      });

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
   * Entity Operations mit Retry
   */
  async entityList(entityName, sortBy, limit) {
    return this.request(() => base44.entities[entityName].list(sortBy, limit));
  }

  async entityFilter(entityName, filter, sortBy, limit) {
    return this.request(() => base44.entities[entityName].filter(filter, sortBy, limit));
  }

  async entityCreate(entityName, data) {
    return this.request(() => base44.entities[entityName].create(data));
  }

  async entityBulkCreate(entityName, dataArray) {
    return this.request(() => base44.entities[entityName].bulkCreate(dataArray));
  }

  async entityUpdate(entityName, id, data) {
    return this.request(() => base44.entities[entityName].update(id, data));
  }

  async entityDelete(entityName, id) {
    return this.request(() => base44.entities[entityName].delete(id));
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
}

// Named export
export const http = new HttpClient();