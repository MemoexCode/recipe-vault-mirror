/**
 * VERBESSERTE KATEGORISIERUNG FÜR SUPERMARKT-ANSICHT
 */

export const SUPERMARKET_CATEGORIES = {
  obst_gemuese: {
    name: "Obst & Gemüse",
    icon: "🥕",
    color: "#10B981",
    keywords: [
      "tomate", "tomaten", "gurke", "gurken", "paprika", "zucchini", "aubergine",
      "brokkoli", "blumenkohl", "karotte", "karotten", "möhre", "möhren", "zwiebel", "zwiebeln",
      "knoblauch", "lauch", "spinat", "salat", "champignon", "pilze", "pilz",
      "apfel", "äpfel", "birne", "birnen", "banane", "bananen", "orange", "orangen",
      "zitrone", "zitronen", "limette", "limetten", "erdbeere", "erdbeeren",
      "heidelbeere", "heidelbeeren", "himbeere", "himbeeren", "traube", "trauben",
      "kiwi", "kiwis", "mango", "mangos", "avocado", "avocados",
      "sellerie", "fenchel", "rucola", "mangold", "kohl", "kohlrabi",
      "radieschen", "rettich", "rote bete", "süßkartoffel", "kürbis"
    ],
    // NEGATIVE Keywords - nicht in diese Kategorie
    excludeKeywords: ["saft", "öl", "paste", "mark", "püree", "konserve", "dose", "getrocknet"]
  },
  fleisch_fisch: {
    name: "Fleisch & Fisch",
    icon: "🥩",
    color: "#EF4444",
    keywords: [
      "hähnchen", "hühnchen", "pute", "rind", "schwein", "lamm", "hack", "hackfleisch",
      "filet", "steak", "schnitzel", "wurst", "würstchen", "bratwurst", "schinken",
      "lachs", "thunfisch", "forelle", "garnele", "garnelen", "shrimp", "shrimps",
      "muschel", "muscheln", "fleisch", "fisch", "kotelett", "braten"
    ],
    excludeKeywords: []
  },
  milchprodukte: {
    name: "Milchprodukte & Eier",
    icon: "🧀",
    color: "#F59E0B",
    keywords: [
      "milch", "sahne", "joghurt", "quark", "käse", "mozzarella", "parmesan",
      "butter", "ei", "eier", "eigelb", "eiweiß", "eiweiss", "frischkäse", 
      "schmand", "mascarpone", "ricotta", "creme fraiche", "crème fraîche"
    ],
    excludeKeywords: []
  },
  brot_backwaren: {
    name: "Brot & Backwaren",
    icon: "🍞",
    color: "#D97706",
    keywords: [
      "brot", "brötchen", "toast", "baguette", "ciabatta", "pita", "tortilla",
      "wrap", "fladenbrot"
    ],
    excludeKeywords: []
  },
  nudeln_reis: {
    name: "Nudeln, Reis & Getreide",
    icon: "🍝",
    color: "#8B5CF6",
    keywords: [
      "nudel", "nudeln", "pasta", "spaghetti", "penne", "fusilli", "tagliatelle",
      "reis", "risotto", "couscous", "quinoa", "bulgur", "polenta", "gnocchi"
    ],
    excludeKeywords: []
  },
  konserven: {
    name: "Konserven & Haltbares",
    icon: "🥫",
    color: "#6B7280",
    keywords: [
      "dose", "dosen", "konserve", "passata", "tomatenmark", "ketchup", "senf",
      "oliven", "kapern", "eingelegte", "eingelegt", "getrocknete", "getrocknet"
    ],
    // WICHTIG: Nur wenn explizit "Dose", "konserviert" etc. erwähnt
    requireExplicit: true,
    excludeKeywords: ["frisch", "frische"]
  },
  huelsenfruechte: {
    name: "Hülsenfrüchte",
    icon: "🫘",
    color: "#92400E",
    keywords: [
      "bohne", "bohnen", "kichererbse", "kichererbsen", "linse", "linsen",
      "erbse", "erbsen", "kidney", "weiße bohnen", "schwarze bohnen",
      "kidneybohnen", "grüne bohnen"
    ],
    excludeKeywords: ["saft", "öl"]
  },
  gewuerze: {
    name: "Gewürze & Kräuter",
    icon: "🌿",
    color: "#059669",
    keywords: [
      "salz", "pfeffer", "paprika", "curry", "zimt", "muskat", "kardamom",
      "oregano", "basilikum", "petersilie", "thymian", "rosmarin", 
      "koriander", "kreuzkümmel", "kurkuma", "chili", "cayenne",
      "majoran", "dill", "schnittlauch", "minze", "salbei"
    ],
    excludeKeywords: ["frisch"]
  },
  oel_essig: {
    name: "Öl, Essig & Saucen",
    icon: "🫒",
    color: "#84CC16",
    keywords: [
      "öl", "olivenöl", "sonnenblumenöl", "rapsöl", "sesamöl",
      "essig", "balsamico", "weißweinessig", "rotweinessig",
      "sojasauce", "worcestersauce", "tabasco", "sauce", "soße"
    ],
    excludeKeywords: []
  },
  backzutaten: {
    name: "Backzutaten",
    icon: "🍰",
    color: "#EC4899",
    keywords: [
      "mehl", "zucker", "backpulver", "natron", "hefe", "vanille", "vanillezucker",
      "kakao", "schokolade", "puderzucker", "brauner zucker"
    ],
    excludeKeywords: []
  },
  sonstiges: {
    name: "Sonstiges",
    icon: "🛒",
    color: "#6B7280",
    keywords: []
  }
};

/**
 * VERBESSERTE KATEGORISIERUNG
 */
export const categorizeIngredient = (ingredientName) => {
  if (!ingredientName) return 'sonstiges';
  
  const normalized = ingredientName.toLowerCase().trim();
  
  // Durchlaufe alle Kategorien (außer Sonstiges)
  for (const [key, category] of Object.entries(SUPERMARKET_CATEGORIES)) {
    if (key === 'sonstiges') continue;
    
    // Prüfe Ausschluss-Keywords
    if (category.excludeKeywords && category.excludeKeywords.length > 0) {
      const hasExcluded = category.excludeKeywords.some(exclude => 
        normalized.includes(exclude)
      );
      if (hasExcluded) continue;
    }
    
    // Prüfe ob explizite Erwähnung erforderlich (für Konserven)
    if (category.requireExplicit) {
      const hasExplicitMatch = category.keywords.some(keyword => 
        normalized.includes(keyword)
      );
      if (hasExplicitMatch) return key;
      continue;
    }
    
    // Normale Keyword-Prüfung
    for (const keyword of category.keywords) {
      if (normalized.includes(keyword)) {
        return key;
      }
    }
  }
  
  return 'sonstiges';
};

/**
 * Gruppiert Zutaten nach Supermarkt-Kategorien
 */
export const groupIngredientsByCategory = (ingredients) => {
  const grouped = {};
  
  // Initialisiere alle Kategorien
  Object.keys(SUPERMARKET_CATEGORIES).forEach(key => {
    grouped[key] = [];
  });
  
  // Gruppiere Zutaten
  ingredients.forEach(ingredient => {
    const category = categorizeIngredient(ingredient.ingredient_name);
    grouped[category].push(ingredient);
  });
  
  // Entferne leere Kategorien
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  });
  
  return grouped;
};