
/**
 * CHECKPOINT MANAGER
 * Speichert Fortschritt im LocalStorage für Crash-Recovery
 */

import { needsMigration, migrateCheckpoint } from "@/components/utils/domainKeys";

const CHECKPOINT_STORAGE_KEY = "recipe_import_checkpoint";

class CheckpointManagerClass {
  /**
   * Speichert einen Checkpoint im LocalStorage.
   * @param {object} data - Die zu speichernden Daten.
   */
  saveCheckpoint(data) {
    try {
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(data));
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
      console.log('[CheckpointManager] Checkpoint loaded from localStorage');
      
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
}

export default new CheckpointManagerClass();
