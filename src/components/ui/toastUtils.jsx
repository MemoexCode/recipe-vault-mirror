/**
 * TOAST UTILITIES - ENHANCED
 * 
 * UX Improvements:
 * - Max 3 visible toasts gleichzeitig
 * - Smooth slide-in/slide-out animations
 * - Bottom-right positioning
 * - Auto-close timing optimiert (4s success, 6s error)
 * - Stacking mit korrektem Z-Index
 */

import { useToast as useShadcnToast } from "@/components/ui/use-toast";

// Singleton-Toast-Instanz
let toastInstance = null;

// Active toast tracking für Stacking Limit
let activeToasts = [];
const MAX_TOASTS = 3;

/**
 * Initialisiert Toast-Instanz
 */
export const initToast = (toast) => {
  toastInstance = toast;
};

/**
 * Helper um alte Toasts zu entfernen wenn Limit erreicht
 */
const manageToastQueue = () => {
  if (activeToasts.length >= MAX_TOASTS) {
    // Entferne ältesten Toast
    const oldestToast = activeToasts[0];
    if (oldestToast && oldestToast.dismiss) {
      oldestToast.dismiss();
    }
    activeToasts.shift();
  }
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

  manageToastQueue();

  const { dismiss } = toastInstance({
    title: "✅ Erfolg",
    description: message,
    variant: "default",
    className: "bg-green-50 border-green-200 rounded-xl shadow-lg",
    duration: 4000,
    ...options
  });

  activeToasts.push({ dismiss });
  setTimeout(() => {
    activeToasts = activeToasts.filter(t => t.dismiss !== dismiss);
  }, 4000);
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

  manageToastQueue();

  const { dismiss } = toastInstance({
    title: "❌ Fehler",
    description: message,
    variant: "destructive",
    className: "rounded-xl shadow-lg",
    duration: 6000,
    ...options
  });

  activeToasts.push({ dismiss });
  setTimeout(() => {
    activeToasts = activeToasts.filter(t => t.dismiss !== dismiss);
  }, 6000);
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

  manageToastQueue();

  const { dismiss } = toastInstance({
    title: "ℹ️ Info",
    description: message,
    variant: "default",
    className: "bg-blue-50 border-blue-200 rounded-xl shadow-lg",
    duration: 4000,
    ...options
  });

  activeToasts.push({ dismiss });
  setTimeout(() => {
    activeToasts = activeToasts.filter(t => t.dismiss !== dismiss);
  }, 4000);
};

/**
 * Zeigt Lade-Toast an
 */
export const showLoading = (message, options = {}) => {
  if (!toastInstance) {
    console.warn('[Toast] Toast not initialized, falling back to console');
    console.log('⏳ LOADING:', message);
    return null;
  }

  manageToastQueue();

  const { dismiss } = toastInstance({
    title: "⏳ Lädt …",
    description: message,
    variant: "default",
    className: "rounded-xl shadow-lg",
    duration: Infinity,
    ...options
  });

  activeToasts.push({ dismiss });
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

  manageToastQueue();

  const { dismiss } = toastInstance({
    title: "⚠️ Warnung",
    description: message,
    variant: "default",
    className: "bg-yellow-50 border-yellow-200 rounded-xl shadow-lg",
    duration: 5000,
    ...options
  });

  activeToasts.push({ dismiss });
  setTimeout(() => {
    activeToasts = activeToasts.filter(t => t.dismiss !== dismiss);
  }, 5000);
};

/**
 * Hook-Wrapper
 */
export const useToast = useShadcnToast;