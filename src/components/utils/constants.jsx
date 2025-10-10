
/**
 * Application-wide constants
 * Centralized configuration for colors, categories, and validation
 */

// ==================== COLORS ====================
export const COLORS = {
  PRIMARY: "#1A1A1A",
  ACCENT: "#FF5722",
  WHITE: "#FFFFFF",
  SILVER: "#C0C0C0",
  SILVER_LIGHT: "#E8E8E8",
  SILVER_LIGHTER: "#F5F5F5",
  TEXT_PRIMARY: "#1A1A1A",
  TEXT_SECONDARY: "#666666"
};

// ==================== CATEGORY TYPES ====================
export const CATEGORY_TYPES = {
  MEAL: 'meal',
  GANG: 'gang',
  CUISINE: 'cuisine'
};

// ==================== DIFFICULTY ====================
export const DIFFICULTY_LABELS = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Schwer",
  expert: "Experte"
};

// ==================== DIETARY FORMS ====================
export const DIETARY_FORMS = [
  { value: "vegetarisch", label: "Vegetarisch" },
  { value: "pescetarisch", label: "Pescetarisch" },
  { value: "vegan", label: "Vegan" },
  { value: "omnivor", label: "Omnivor" }
];

// ==================== DIETARY GOALS ====================
export const DIETARY_GOALS = [
  { value: "abnehmen", label: "Abnehmen", tags: ["kalorienarm", "low-carb", "fettarm"] },
  { value: "muskeln-aufbauen", label: "Muskeln aufbauen", tags: ["proteinreich", "high-protein"] },
  { value: "fett-reduzieren", label: "Fett reduzieren", tags: ["kalorienarm", "low-carb", "fettarm"] },
  { value: "gewicht-halten", label: "Gewicht halten", tags: ["ausgewogen"] }
];

// ==================== NUTRITION ICONS ====================
export const NUTRITION_ICONS = {
  calories: { icon: 'Flame', label: 'Kalorien', unit: 'kcal', color: '#E07856' },
  protein: { icon: 'Beef', label: 'Protein', unit: 'g', color: '#8B9D83' },
  carbs: { icon: 'Wheat', label: 'Kohlenhydrate', unit: 'g', color: '#D4A373' },
  fat: { icon: 'Droplet', label: 'Fett', unit: 'g', color: '#FFB84D' },
  fiber: { icon: 'Apple', label: 'Ballaststoffe', unit: 'g', color: '#95E1D3' },
  sugar: { icon: 'Candy', label: 'Zucker', unit: 'g', color: '#FF6B6B' },
  sodium: { icon: 'Droplets', label: 'Natrium', unit: 'mg', color: '#A8D8EA' }
};

// ==================== VALIDATION ====================
export const VALIDATION = {
  MAX_TITLE_LENGTH: 150,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_STEP_LENGTH: 2000,
  MAX_PREP_NOTES_LENGTH: 100,
  MIN_INGREDIENTS: 1,
  MIN_INSTRUCTIONS: 1
};
