/**
 * DOMAIN KEY NORMALISIERUNG & MIGRATION
 * 
 * Zweck:
 * - Zentrale Definition aller Domain-Keys ohne Umlaute
 * - Migration von alten Daten mit Umlauten zu neuen Keys
 * - Mapping zwischen internen Keys und UI-Labels
 * 
 * Hintergrund:
 * - JSON-Keys mit Umlauten können Probleme in APIs verursachen
 * - ASCII-only Keys sind universell kompatibel
 * - UI zeigt weiterhin deutsche Umlaute an
 */

// ============================================
// NORMALISIERTE DOMAIN KEYS (ASCII-only)
// ============================================
export const DOMAIN_KEYS = {
  // Filter-Keys
  ERNAEHRUNGSFORM: 'ernaehrungsform',
  ERNAEHRUNGSZIEL: 'ernaehrungsziel',
  MAHLZEIT: 'mahlzeit',
  GANG: 'gang',
  KUECHE: 'kueche',
  ZUCKERGEHALT: 'zuckergehalt',
  
  // Common Values
  ALLE: 'alle',
  
  // Ernährungsformen
  VEGETARISCH: 'vegetarisch',
  PESCETARISCH: 'pescetarisch',
  VEGAN: 'vegan',
  OMNIVOR: 'omnivor',
  
  // Ernährungsziele
  ABNEHMEN: 'abnehmen',
  MUSKELN_AUFBAUEN: 'muskeln-aufbauen',
  FETT_REDUZIEREN: 'fett-reduzieren',
  GEWICHT_HALTEN: 'gewicht-halten',
  
  // Zuckergehalt
  OHNE_ZUCKER: 'ohne-zucker',
  WENIG_ZUCKER: 'wenig-zucker'
};

// ============================================
// MIGRATION MAPPING (Alt → Neu)
// ============================================
export const LEGACY_KEY_MAP = {
  // Filter-Keys mit Umlauten → ASCII
  'ernährungsform': DOMAIN_KEYS.ERNAEHRUNGSFORM,
  'ernährungsziel': DOMAIN_KEYS.ERNAEHRUNGSZIEL,
  'küche': DOMAIN_KEYS.KUECHE,
  
  // Bereits korrekte Keys (keine Änderung)
  'mahlzeit': DOMAIN_KEYS.MAHLZEIT,
  'gang': DOMAIN_KEYS.GANG,
  'zuckergehalt': DOMAIN_KEYS.ZUCKERGEHALT
};

// ============================================
// UI-LABELS (für Anzeige mit Umlauten)
// ============================================
export const DOMAIN_LABELS = {
  [DOMAIN_KEYS.ERNAEHRUNGSFORM]: 'Ernährungsform',
  [DOMAIN_KEYS.ERNAEHRUNGSZIEL]: 'Ernährungsziel',
  [DOMAIN_KEYS.MAHLZEIT]: 'Mahlzeit',
  [DOMAIN_KEYS.GANG]: 'Gang',
  [DOMAIN_KEYS.KUECHE]: 'Küche',
  [DOMAIN_KEYS.ZUCKERGEHALT]: 'Zuckergehalt'
};

// ============================================
// MIGRATIONS-FUNKTIONEN
// ============================================

/**
 * Migriert ein einzelnes Objekt von alten Keys zu neuen Keys
 * @param {Object} obj - Objekt mit potentiell alten Keys
 * @returns {Object} Objekt mit normalisierten Keys
 */
export const migrateObjectKeys = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const migrated = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Nutze gemappten Key falls vorhanden, sonst Original
    const normalizedKey = LEGACY_KEY_MAP[key] || key;
    migrated[normalizedKey] = value;
  }
  
  return migrated;
};

/**
 * Migriert Filter-Objekt mit Backward Compatibility
 * @param {Object} filters - Filter-Objekt (alt oder neu)
 * @returns {Object} Normalisiertes Filter-Objekt
 */
export const migrateFilters = (filters) => {
  if (!filters) {
    return createDefaultFilters();
  }
  
  const migrated = migrateObjectKeys(filters);
  
  // Stelle sicher, dass alle Keys vorhanden sind
  return {
    ...createDefaultFilters(),
    ...migrated
  };
};

/**
 * Erstellt Default-Filter mit normalisierten Keys
 * @returns {Object} Default Filter-Objekt
 */
export const createDefaultFilters = () => ({
  [DOMAIN_KEYS.ERNAEHRUNGSFORM]: DOMAIN_KEYS.ALLE,
  [DOMAIN_KEYS.ERNAEHRUNGSZIEL]: DOMAIN_KEYS.ALLE,
  [DOMAIN_KEYS.MAHLZEIT]: DOMAIN_KEYS.ALLE,
  [DOMAIN_KEYS.GANG]: DOMAIN_KEYS.ALLE,
  [DOMAIN_KEYS.KUECHE]: DOMAIN_KEYS.ALLE,
  [DOMAIN_KEYS.ZUCKERGEHALT]: DOMAIN_KEYS.ALLE
});

/**
 * Prüft ob ein Objekt alte Keys mit Umlauten enthält
 * @param {Object} obj - Zu prüfendes Objekt
 * @returns {boolean} True wenn Migration nötig
 */
export const needsMigration = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return Object.keys(obj).some(key => key in LEGACY_KEY_MAP && key !== LEGACY_KEY_MAP[key]);
};

/**
 * Migriert gespeicherte Checkpoint-Daten
 * @param {Object} checkpoint - Checkpoint-Objekt aus localStorage
 * @returns {Object} Migrierter Checkpoint
 */
export const migrateCheckpoint = (checkpoint) => {
  if (!checkpoint) {
    return checkpoint;
  }
  
  // Migriere alle verschachtelten Objekte
  const migrated = { ...checkpoint };
  
  if (migrated.filters) {
    migrated.filters = migrateFilters(migrated.filters);
  }
  
  if (migrated.smartFilters) {
    migrated.smartFilters = migrateFilters(migrated.smartFilters);
  }
  
  return migrated;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validiert ob ein Key ein gültiger Domain-Key ist
 * @param {string} key - Zu prüfender Key
 * @returns {boolean} True wenn gültig
 */
export const isValidDomainKey = (key) => {
  return Object.values(DOMAIN_KEYS).includes(key);
};

/**
 * Gibt alle gültigen Filter-Keys zurück
 * @returns {string[]} Array von gültigen Keys
 */
export const getValidFilterKeys = () => [
  DOMAIN_KEYS.ERNAEHRUNGSFORM,
  DOMAIN_KEYS.ERNAEHRUNGSZIEL,
  DOMAIN_KEYS.MAHLZEIT,
  DOMAIN_KEYS.GANG,
  DOMAIN_KEYS.KUECHE,
  DOMAIN_KEYS.ZUCKERGEHALT
];