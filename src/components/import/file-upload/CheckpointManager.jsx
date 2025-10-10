/**
 * CHECKPOINT MANAGER
 * Speichert Fortschritt im LocalStorage für Crash-Recovery
 */

const CHECKPOINT_KEY = "recipe_import_checkpoint";

export default class CheckpointManager {
  static saveCheckpoint(data) {
    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save checkpoint:", err);
    }
  }

  static loadCheckpoint(callback) {
    try {
      const data = localStorage.getItem(CHECKPOINT_KEY);
      if (data) {
        callback(JSON.parse(data));
      }
    } catch (err) {
      console.error("Failed to load checkpoint:", err);
    }
  }

  static clearCheckpoint() {
    try {
      localStorage.removeItem(CHECKPOINT_KEY);
    } catch (err) {
      console.error("Failed to clear checkpoint:", err);
    }
  }

  static hasCheckpoint() {
    try {
      return !!localStorage.getItem(CHECKPOINT_KEY);
    } catch (err) {
      return false;
    }
  }
}