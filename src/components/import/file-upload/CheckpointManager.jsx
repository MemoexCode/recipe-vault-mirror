/**
 * CHECKPOINT MANAGER
 * Speichert Fortschritt im LocalStorage für Crash-Recovery
 * 
 * ENHANCED: Import Recovery Features
 * - Checkpoint-Alter-Berechnung
 * - Automatische Bereinigung alter Checkpoints
 * - Recovery-Event-Logging
 */

import { needsMigration, migrateCheckpoint } from "@/components/utils/domainKeys";
import { logInfo, logWarn } from "@/components/utils/logging";

const CHECKPOINT_STORAGE_KEY = "recipe_import_checkpoint";
const MAX_CHECKPOINT_AGE = 12 * 60 * 60 * 1000; // 12 Stunden

class CheckpointManagerClass {
  /**
   * Speichert einen Checkpoint im LocalStorage.
   * @param {object} data - Die zu speichernden Daten.
   */
  saveCheckpoint(data) {
    try {
      const checkpointData = {
        ...data,
        savedAt: Date.now() // Zeitstempel für Altersberechnung
      };
      
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpointData));
      logInfo('Import checkpoint saved', 'CheckpointManager');
    } catch (err) {
      console.error("Failed to save checkpoint:", err);
    }
  }

  /**
   * Lädt Checkpoint aus localStorage mit automatischer Migration.
   * @param {function(object|null)} callback - Callback-Funktion, die mit dem geladenen oder migrierten Checkpoint (oder null bei Fehler/nicht vorhanden) aufgerufen wird.
   */
  loadCheckpoint(callback) {
    try {
      const stored = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (!stored) {
        console.log('[CheckpointManager] No checkpoint found');
        callback(null);
        return;
      }

      const checkpoint = JSON.parse(stored);
      
      // Prüfe Checkpoint-Alter
      const age = this.getCheckpointAge();
      if (age > MAX_CHECKPOINT_AGE) {
        logWarn(`Checkpoint expired (age: ${Math.round(age / 1000 / 60)}min)`, 'CheckpointManager');
        this.clearCheckpoint();
        callback(null);
        return;
      }

      console.log('[CheckpointManager] Checkpoint loaded from localStorage');
      logInfo(`Import checkpoint restored (age: ${Math.round(age / 1000 / 60)}min)`, 'ImportRecovery');
      
      // Prüfe ob Migration nötig ist
      if (needsMigration(checkpoint)) {
        console.log('[CheckpointManager] Migrating checkpoint keys...');
        const migrated = migrateCheckpoint(checkpoint);
        // Speichere migrierte Version
        this.saveCheckpoint(migrated);
        callback(migrated);
      } else {
        callback(checkpoint);
      }
    } catch (err) {
      console.error('[CheckpointManager] Failed to load checkpoint:', err);
      // Bei Fehler: Checkpoint löschen und null zurückgeben
      this.clearCheckpoint();
      callback(null);
    }
  }

  /**
   * Löscht den gespeicherten Checkpoint aus dem LocalStorage.
   */
  clearCheckpoint() {
    try {
      localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
      logInfo('Import checkpoint cleared', 'CheckpointManager');
    } catch (err) {
      console.error("Failed to clear checkpoint:", err);
    }
  }

  /**
   * Überprüft, ob ein Checkpoint im LocalStorage vorhanden ist.
   * @returns {boolean} - True, wenn ein Checkpoint vorhanden ist, sonst False.
   */
  hasCheckpoint() {
    try {
      return !!localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    } catch (err) {
      return false;
    }
  }

  /**
   * Gibt den Zeitstempel des letzten Checkpoints zurück
   * @returns {number|null} - Zeitstempel in ms oder null
   */
  getLastCheckpointTimestamp() {
    try {
      const stored = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (!stored) return null;

      const checkpoint = JSON.parse(stored);
      return checkpoint.savedAt || null;
    } catch {
      return null;
    }
  }

  /**
   * Berechnet das Alter des aktuellen Checkpoints
   * @returns {number|null} - Alter in ms oder null wenn kein Checkpoint
   */
  getCheckpointAge() {
    const timestamp = this.getLastCheckpointTimestamp();
    if (!timestamp) return null;

    return Date.now() - timestamp;
  }

  /**
   * Prüft ob Checkpoint abgelaufen ist
   * @returns {boolean} - True wenn abgelaufen
   */
  isCheckpointExpired() {
    const age = this.getCheckpointAge();
    if (age === null) return false;

    return age > MAX_CHECKPOINT_AGE;
  }

  /**
   * Löscht abgelaufene Checkpoints automatisch
   * @returns {boolean} - True wenn gelöscht wurde
   */
  clearExpiredCheckpoints() {
    if (this.isCheckpointExpired()) {
      logWarn('Clearing expired import checkpoint', 'CheckpointManager');
      this.clearCheckpoint();
      return true;
    }
    return false;
  }
}

export default new CheckpointManagerClass();