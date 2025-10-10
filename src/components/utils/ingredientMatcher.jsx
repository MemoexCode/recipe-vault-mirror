
/**
 * Intelligentes Zuordnungssystem für Zutaten zu Bildern
 * Nutzt Tags, Normalisierung und Fuzzy Matching
 */

/**
 * Normalisiert einen Zutatennamen für bessere Vergleichbarkeit
 */
export const normalizeIngredientName = (name) => {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    // Entferne Zubereitungshinweise in Klammern
    .replace(/\([^)]*\)/g, '')
    // Entferne gängige Adjektive und Farben
    .replace(/\b(gehackt|gewürfelt|geschnitten|gerieben|frisch|getrocknet|tiefgekühlt|roh|gekocht|rot|rote|roter|rotes|gelb|gelbe|grün|grüne|weiß|weiße)\b/gi, '')
    // Entferne Bindestriche und ersetze durch Leerzeichen
    .replace(/-/g, ' ')
    // Entferne mehrfache Leerzeichen
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Berechnet Levenshtein-Distanz zwischen zwei Strings
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Berechnet Ähnlichkeit zwischen zwei Strings (0-1)
 */
export const calculateSimilarity = (str1, str2) => {
  const normalized1 = normalizeIngredientName(str1);
  const normalized2 = normalizeIngredientName(str2);
  
  if (normalized1 === normalized2) return 1.0;
  
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - (distance / maxLen);
};

/**
 * Prüft ob ein String ein Substring des anderen ist
 * Berücksichtigt beide Richtungen und minimale Länge
 */
const checkSubstringMatch = (str1, str2, minLength = 4) => {
  const norm1 = normalizeIngredientName(str1);
  const norm2 = normalizeIngredientName(str2);
  
  // Zu kurz für sinnvolles Matching
  if (norm1.length < minLength || norm2.length < minLength) {
    return 0;
  }
  
  // Exaktes Match
  if (norm1 === norm2) return 1.0;
  
  // Substring-Match in beide Richtungen
  if (norm1.includes(norm2)) {
    // z.B. "chilischote" enthält "chili"
    return 0.95; // Sehr hoher Score
  }
  
  if (norm2.includes(norm1)) {
    // z.B. "cherry tomaten" enthält "tomat"
    return 0.95;
  }
  
  // Token-basiertes Matching
  const tokens1 = norm1.split(/\s+/);
  const tokens2 = norm2.split(/\s+/);
  
  for (const token1 of tokens1) {
    if (token1.length < minLength) continue;
    
    for (const token2 of tokens2) {
      if (token2.length < minLength) continue;
      
      // Prüfe ob ein Token im anderen enthalten ist
      if (token1.includes(token2) || token2.includes(token1)) {
        return 0.90; // Hoher Score für Token-Match
      }
      
      // Prüfe Ähnlichkeit zwischen Tokens
      const tokenSimilarity = 1 - (levenshteinDistance(token1, token2) / Math.max(token1.length, token2.length));
      if (tokenSimilarity >= 0.85) {
        return 0.85; // Guter Score für ähnliche Tokens
      }
    }
  }
  
  return 0;
};

/**
 * Findet das beste passende Bild für eine Zutat
 * 
 * @param {string} ingredientName - Name der zu suchenden Zutat
 * @param {Array} ingredientImages - Array aller IngredientImage-Objekte
 * @param {number} minSimilarity - Minimale Ähnlichkeit (0-1), Standard: 0.75
 * @returns {object|null} - Das beste Match oder null
 */
export const findBestImageMatch = (ingredientName, ingredientImages, minSimilarity = 0.75) => {
  if (!ingredientName || !ingredientImages || ingredientImages.length === 0) {
    return null;
  }
  
  const normalizedSearch = normalizeIngredientName(ingredientName);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const image of ingredientImages) {
    // 1. EXAKTES MATCH mit Haupt-Namen
    if (normalizeIngredientName(image.ingredient_name) === normalizedSearch) {
      return { image, score: 1.0, matchType: 'exact' };
    }
    
    // 2. EXAKTES MATCH mit Tags
    if (image.alternative_names && Array.isArray(image.alternative_names)) {
      for (const altName of image.alternative_names) {
        if (normalizeIngredientName(altName) === normalizedSearch) {
          return { image, score: 1.0, matchType: 'tag_exact' };
        }
      }
    }
    
    // 3. SUBSTRING MATCH mit Haupt-Namen (NEU!)
    const substringScore = checkSubstringMatch(ingredientName, image.ingredient_name);
    if (substringScore > bestScore && substringScore >= minSimilarity) {
      bestScore = substringScore;
      bestMatch = { image, score: substringScore, matchType: 'substring_main' };
    }
    
    // 4. SUBSTRING MATCH mit Tags (NEU!)
    if (image.alternative_names && Array.isArray(image.alternative_names)) {
      for (const altName of image.alternative_names) {
        const tagSubstringScore = checkSubstringMatch(ingredientName, altName);
        if (tagSubstringScore > bestScore && tagSubstringScore >= minSimilarity) {
          bestScore = tagSubstringScore;
          bestMatch = { image, score: tagSubstringScore, matchType: 'substring_tag' };
        }
      }
    }
    
    // 5. FUZZY MATCH mit Haupt-Namen (Fallback)
    const mainNameSimilarity = calculateSimilarity(ingredientName, image.ingredient_name);
    if (mainNameSimilarity > bestScore && mainNameSimilarity >= minSimilarity) {
      bestScore = mainNameSimilarity;
      bestMatch = { image, score: mainNameSimilarity, matchType: 'fuzzy_main' };
    }
    
    // 6. FUZZY MATCH mit Tags (Fallback)
    if (image.alternative_names && Array.isArray(image.alternative_names)) {
      for (const altName of image.alternative_names) {
        const tagSimilarity = calculateSimilarity(ingredientName, altName);
        if (tagSimilarity > bestScore && tagSimilarity >= minSimilarity) {
          bestScore = tagSimilarity;
          bestMatch = { image, score: tagSimilarity, matchType: 'fuzzy_tag' };
        }
      }
    }
  }
  
  return bestMatch;
};

/**
 * Batch-Matching für mehrere Zutaten
 * Gibt Map zurück: ingredient_name -> image_url
 */
export const batchMatchIngredients = (ingredientNames, ingredientImages, minSimilarity = 0.75) => {
  const matches = {};
  const missing = [];
  
  for (const name of ingredientNames) {
    const match = findBestImageMatch(name, ingredientImages, minSimilarity);
    if (match) {
      matches[name] = {
        image_url: match.image.image_url,
        matched_name: match.image.ingredient_name,
        score: match.score,
        matchType: match.matchType
      };
    } else {
      missing.push(name);
    }
  }
  
  return { matches, missing };
};

/**
 * Generiert intelligente alternative Namen für eine Zutat via LLM
 */
export const generateAlternativeNames = async (ingredientName) => {
  try {
    const { InvokeLLM } = await import("@/api/integrations");
    
    const prompt = `Generate alternative spellings and synonyms for the ingredient: "${ingredientName}"

**RULES:**
1. Singular AND plural (e.g., "Tomate" + "Tomaten", "tomato" + "tomatoes")
2. With/without hyphens (e.g., "cherry-tomaten" + "cherry tomaten")
3. Common synonyms (e.g., "Hackfleisch" = "Gehacktes", "Faschiertes" OR "ground meat" = "minced meat")
4. Specific varieties (e.g., "Tomaten" → "Cherrytomaten", "Rispentomaten", "Cocktailtomaten")
5. Spelling variants (e.g., "Yoghurt" + "Joghurt" OR "yogurt" + "yoghurt")
6. NO preparation notes (like "gehackt", "gewürfelt", "chopped", "diced")
7. Maximum 8 variants

Return ONLY a JSON array, e.g.: ["tomate", "tomaten", "cherry-tomaten", "cherrytomaten", "cocktailtomaten"]`;

    const alternatives = await InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          alternatives: {
            type: "array",
            items: { type: "string" },
            maxItems: 8
          }
        }
      }
    });
    
    return alternatives.alternatives || [];
  } catch (err) {
    console.error("Error generating alternative names:", err);
    // Fallback: Einfache Regel-basierte Generierung
    return generateSimpleAlternatives(ingredientName);
  }
};

/**
 * Fallback: Einfache regelbasierte Alternative-Generierung
 */
const generateSimpleAlternatives = (name) => {
  const alternatives = [];
  const normalized = normalizeIngredientName(name);
  
  // Plural/Singular (einfache Regel)
  if (normalized.endsWith('e')) {
    alternatives.push(normalized + 'n'); // Tomate → Tomaten
  } else if (normalized.endsWith('n')) {
    alternatives.push(normalized.slice(0, -1)); // Tomaten → Tomate
  }
  
  // Mit/ohne Bindestriche
  if (normalized.includes('-')) {
    alternatives.push(normalized.replace(/-/g, ' ')); // cherry-tomaten → cherry tomaten
    alternatives.push(normalized.replace(/-/g, '')); // cherry-tomaten → cherrytomaten
  }
  
  return [...new Set(alternatives)]; // Duplikate entfernen
};
