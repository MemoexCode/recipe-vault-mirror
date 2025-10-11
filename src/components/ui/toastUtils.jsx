/**
 * TOAST UTILITIES
 * 
 * Zweck:
 * - Zentrale Toast-Funktionen für konsistentes User-Feedback
 * - Ersetzt window.alert() mit modernen, nicht-blockierenden Toasts
 * - Deutsche Standardnachrichten, anpassbare Optionen
 * 
 * Verwendung:
 * import { showSuccess, showError, showInfo } from "@/components/ui/toastUtils";
 * showSuccess("Rezept erfolgreich gespeichert!");
 */

import { useToast as useShadcnToast } from "@/components/ui/use-toast";

// Singleton-Toast-Instanz (wird bei App-Mount initialisiert)
let toastInstance = null;

/**
 * Initialisiert Toast-Instanz (muss in Root-Component aufgerufen werden)
 */
export const initToast = (toast) => {
  toastInstance = toast;
};

/**
 * Zeigt Erfolgs-Toast an
 */
export const showSuccess = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.log('✅ SUCCESS:', message);
    return;
  }

  toastInstance({
    title: "✅ Erfolg",
    description: message,
    variant: "default",
    className: "bg-green-50 border-green-200",
    duration: 4000,
    ...options
  });
};

/**
 * Zeigt Fehler-Toast an
 */
export const showError = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.error('❌ ERROR:', message);
    return;
  }

  toastInstance({
    title: "❌ Fehler",
    description: message,
    variant: "destructive",
    duration: 6000,
    ...options
  });
};

/**
 * Zeigt Info-Toast an
 */
export const showInfo = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.log('ℹ️ INFO:', message);
    return;
  }

  toastInstance({
    title: "ℹ️ Info",
    description: message,
    variant: "default",
    duration: 4000,
    ...options
  });
};

/**
 * Zeigt Lade-Toast an (mit unendlicher Dauer, muss manuell dismissed werden)
 */
export const showLoading = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.log('⏳ LOADING:', message);
    return null;
  }

  const { dismiss } = toastInstance({
    title: "⏳ Lädt …",
    description: message,
    variant: "default",
    duration: Infinity,
    ...options
  });

  return dismiss;
};

/**
 * Zeigt Warnung-Toast an
 */
export const showWarning = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.warn('⚠️ WARNING:', message);
    return;
  }

  toastInstance({
    title: "⚠️ Warnung",
    description: message,
    variant: "default",
    className: "bg-yellow-50 border-yellow-200",
    duration: 5000,
    ...options
  });
};

/**
 * Hook-Wrapper für Component-Level Toast-Nutzung
 */
export const useToast = useShadcnToast;