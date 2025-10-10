
/**
 * ZENTRALE HELPER-FUNKTIONEN FÜR ALLE IMPORT-METHODEN
 * Konsolidiert alle wiederkehrenden Funktionen
 */

import { InvokeLLM } from "@/api/integrations";

// ============================================
// IMAGE COMPRESSION - AGGRESSIVER
// ============================================
export const compressImage = async (file, maxWidth = 800, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Aggressivere Größenreduktion
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Bessere Bildqualität vor Kompression
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, { 
            type: 'image/jpeg', 
            lastModified: Date.now() 
          });
          
          console.log(`📦 Komprimierung: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// ============================================
// RETRY WITH BACKOFF - SPEZIELL FÜR DATABASE TIMEOUTS
// ============================================
export const retryWithBackoff = async (fn, maxRetries = 5, initialDelay = 4000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isLastRetry = i === maxRetries - 1;
      const errorMessage = err.message || '';
      
      // Erkenne verschiedene Fehlertypen
      const isDatabaseTimeout = errorMessage.includes('DatabaseTimeout') || 
                               errorMessage.includes('544') ||
                               errorMessage.includes('database timed out');
      
      const isNetworkError = errorMessage.includes('Network Error') || 
                            errorMessage.includes('timeout') || 
                            errorMessage.includes('Timeout');
      
      const isServerError = errorMessage.includes('500') || 
                           errorMessage.includes('502') || 
                           errorMessage.includes('503') || 
                           errorMessage.includes('504');
      
      if (isLastRetry) {
        throw new Error(`Maximale Anzahl von Versuchen erreicht. Letzter Fehler: ${errorMessage}`);
      }
      
      if (isDatabaseTimeout || isNetworkError || isServerError) {
        // Exponentieller Backoff mit längeren Wartezeiten für DB-Timeouts
        const multiplier = isDatabaseTimeout ? 3 : 2;
        const delay = initialDelay * Math.pow(multiplier, i);
        
        console.log(`⏳ ${isDatabaseTimeout ? 'Database Timeout' : (isNetworkError ? 'Network Error' : 'Server Error')} - Retry ${i + 1}/${maxRetries} in ${(delay/1000).toFixed(1)}s...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Andere Fehler sofort durchreichen
        throw err;
      }
    }
  }
};

// ============================================
// SPEZIELLE UPLOAD-FUNKTION MIT RETRY
// ============================================
export const uploadFileWithRetry = async (file) => {
  const { UploadFile } = await import("@/api/integrations");
  
  // Komprimiere Bild aggressiv vor Upload
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    console.log('🖼️ Komprimiere Bild vor Upload...');
    fileToUpload = await compressImage(file, 800, 1200, 0.65);
  }
  
  // Upload mit erweiterter Retry-Logik
  return await retryWithBackoff(async () => {
    return await UploadFile({ file: fileToUpload });
  }, 5, 5000); // 5 Versuche, Start bei 5 Sekunden
};

// ============================================
// RAW TEXT NORMALIZATION - ZENTRALE FUNKTION
// ============================================
export const normalizeRawText = (rawText) => {
  if (!rawText) return rawText;
  
  let normalized = rawText;
  
  // 1. Bulletpoints und andere Layout-Symbole entfernen
  normalized = normalized.replace(/[•●○▪▫■□◆◇\-–—\*]/g, ' ');
  
  // 2. Mehrfache Leerzeichen reduzieren
  normalized = normalized.replace(/\s+/g, ' ');
  
  // 3. Fehlende Punkte am Zeilenende ergänzen
  normalized = normalized.replace(/([a-zäöüß0-9])\s*\n\s*([A-ZÄÖÜ])/g, '$1.\n$2');
  
  // 4. Fehlende Punkte zwischen Sätzen ergänzen
  normalized = normalized.replace(/([a-zäöüß0-9])\s+([A-ZÄÖÜ])/g, '$1. $2');
  
  // 5. Mehrfache Zeilenumbrüche reduzieren
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  // 6. Trailing/leading whitespace
  normalized = normalized.trim();
  
  return normalized;
};

// ============================================
// METADATA EXTRACTION - ENHANCED WITH RELIABILITY CHECK
// ============================================
export const extractMetadataFromOCRText = (text) => {
  const metadata = {
    hasPortions: false,
    hasTime: false,
    hasIngredients: false,
    hasInstructions: false,
    confidence: 0,
    isReliable: false // TASK 3: NEW FIELD
  };

  const lowerText = text.toLowerCase();

  const portionPatterns = [
    /portion/i,
    /ergibt/i,
    /für\s+\d+\s+person/i,
    /servings/i,
    /\d+\s+personen/i,
    /\d+\s+pers\./i,
    /\d+\s+port\./i,
    /anzahl.*personen/i,
    /menge.*\d+/i,
    /reicht\s+für/i,
    /ausreichend\s+für/i
  ];
  
  if (portionPatterns.some(pattern => pattern.test(text))) {
    metadata.hasPortions = true;
    metadata.confidence += 20;
  }

  const timePatterns = [
    /\d+\s*min/i,
    /\d+\s*stunde/i,
    /\d+\s*std/i,
    /\d+\s*h\b/i,
    /minuten/i,
    /stunden/i,
    /backzeit/i,
    /kochzeit/i,
    /zubereitungszeit/i,
    /garzeit/i
  ];
  
  if (timePatterns.some(pattern => pattern.test(text))) {
    metadata.hasTime = true;
    metadata.confidence += 20;
  }

  const ingredientPatterns = [
    /\[h2\].*zutaten/i,
    /\[h3\].*zutaten/i,
    /^zutaten:/im,
    /^ingredients/im,
    /ingredien/i,
    /zutatenliste/i
  ];
  
  const hasIngredientStructure = /\d+\s*g\s+\w+|[\d\/]+\s+(el|tl|ml|l|kg)\s+\w+/i.test(text);
  
  if (ingredientPatterns.some(pattern => pattern.test(text)) || hasIngredientStructure) {
    metadata.hasIngredients = true;
    metadata.confidence += 30;
  }

  const instructionPatterns = [
    /\[h2\].*zubereitung/i,
    /\[h3\].*zubereitung/i,
    /^zubereitung:/im,
    /^anleitung/im,
    /schritt\s+\d+/i,
    /vorbereitung:/i,
    /instructions/i
  ];
  
  const hasInstructionStructure = /^\d+[\.\)]\s+\w+|^schritt\s+\d+/im.test(text);
  
  if (instructionPatterns.some(pattern => pattern.test(text)) || hasInstructionStructure) {
    metadata.hasInstructions = true;
    metadata.confidence += 30;
  }

  // TASK 3: Determine reliability based on confidence threshold
  metadata.isReliable = metadata.confidence >= 40;

  return metadata;
};

// ============================================
// RECIPE VALIDATION & CLEANING - HARDENED VERSION
// ============================================
export const validateAndCleanRecipeData = (rawRecipe) => {
  const cleaned = { ...rawRecipe };

  // ROBUSTNESS FIX: Ensure all array properties are initialized if they are not arrays
  if (!Array.isArray(cleaned.ingredients)) {
    cleaned.ingredients = [];
  }
  if (!Array.isArray(cleaned.ingredient_groups)) {
    cleaned.ingredient_groups = [];
  }
  if (!Array.isArray(cleaned.instructions)) {
    cleaned.instructions = [];
  }
  if (!Array.isArray(cleaned.instruction_groups)) {
    cleaned.instruction_groups = [];
  }
  if (!Array.isArray(cleaned.equipment)) {
    cleaned.equipment = [];
  }
  if (!Array.isArray(cleaned.tags)) {
    cleaned.tags = [];
  }

  // --- Original logic continues below ---

  // Validate instruction_groups
  const validInstructionGroups = cleaned.instruction_groups.filter(group => 
    group && typeof group === 'object' && group.group_name && Array.isArray(group.instructions)
  );
  if (validInstructionGroups.length === 0 && cleaned.instruction_groups.length > 0) {
    cleaned.instructions = cleaned.instructions.concat(
      cleaned.instruction_groups.flatMap(item => item.instructions || [])
      .filter(item => item && typeof item === 'object' && item.step_description)
      .map((item, index) => ({
        step_number: item.step_number || (index + 1),
        step_description: item.step_description || item.toString(),
        ingredients_for_step: item.ingredients_for_step || []
      }))
    );
    cleaned.instruction_groups = [];
  } else {
    cleaned.instruction_groups = validInstructionGroups;
  }

  // Validate ingredient_groups
  const validIngredientGroups = cleaned.ingredient_groups.filter(group => 
    group && typeof group === 'object' && group.group_name && Array.isArray(group.ingredients)
  );
  if (validIngredientGroups.length === 0 && cleaned.ingredient_groups.length > 0) {
    cleaned.ingredients = cleaned.ingredients.concat(
      cleaned.ingredient_groups.flatMap(group => group.ingredients || [])
      .filter(item => item && typeof item === 'object' && item.ingredient_name)
      .map(item => ({
        ingredient_name: item.ingredient_name,
        amount: item.amount || 0,
        unit: item.unit || "",
        preparation_notes: item.preparation_notes || ""
      }))
    );
    cleaned.ingredient_groups = [];
  } else {
    cleaned.ingredient_groups = validIngredientGroups;
  }

  // Ensure instructions have proper structure
  cleaned.instructions = cleaned.instructions
    .filter(inst => inst && typeof inst === 'object' && inst.step_description)
    .map((inst, index) => ({
      step_number: inst.step_number || (index + 1),
      step_description: inst.step_description,
      ingredients_for_step: inst.ingredients_for_step || []
    }));

  // Ensure ingredients have proper structure
  cleaned.ingredients = cleaned.ingredients
    .filter(ing => ing && typeof ing === 'object' && ing.ingredient_name)
    .map(ing => ({
      ingredient_name: ing.ingredient_name,
      amount: ing.amount || 0,
      unit: ing.unit || "",
      preparation_notes: ing.preparation_notes || ""
    }));

  // Remove empty arrays
  if (cleaned.instruction_groups.length === 0) delete cleaned.instruction_groups;
  if (cleaned.ingredient_groups.length === 0) delete cleaned.ingredient_groups;
  if (cleaned.equipment.length === 0) delete cleaned.equipment;
  if (cleaned.tags.length === 0) delete cleaned.tags;

  // Ensure required fields
  if (!cleaned.title) cleaned.title = "Unbenanntes Rezept";
  if (!cleaned.meal_type) cleaned.meal_type = "";
  if (!cleaned.gang) cleaned.gang = "";
  
  return cleaned;
};

// ============================================
// DUPLICATE DETECTION
// ============================================
export const findDuplicates = (newRecipe, existingRecipes, minScore = 65) => {
  const duplicates = [];

  for (const recipe of existingRecipes) {
    let score = 0;

    // Title similarity
    const titleSimilarity = calculateStringSimilarity(newRecipe.title, recipe.title);
    score += titleSimilarity * 40;

    // Ingredient overlap
    const newIngredients = extractAllIngredientNames(newRecipe);
    const existingIngredients = extractAllIngredientNames(recipe);
    const commonIngredients = newIngredients.filter(ing => 
      existingIngredients.some(existing => existing.toLowerCase().includes(ing.toLowerCase()))
    ).length;
    const totalIngredients = Math.max(newIngredients.length, existingIngredients.length);
    const ingredientScore = totalIngredients > 0 ? (commonIngredients / totalIngredients) * 60 : 0;
    score += ingredientScore;

    if (score >= minScore) {
      duplicates.push({
        recipe,
        score: Math.round(score),
        commonIngredients,
        totalIngredients
      });
    }
  }

  return duplicates.sort((a, b) => b.score - a.score);
};

const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  
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

// ============================================
// INGREDIENT EXTRACTION - ROBUST NULL HANDLING
// ============================================
export const extractAllIngredientNames = (recipe) => {
  const names = [];
  
  // Safely handle ingredients array
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    names.push(...recipe.ingredients.map(i => i.ingredient_name));
  }
  
  // Safely handle ingredient_groups array
  if (recipe.ingredient_groups && Array.isArray(recipe.ingredient_groups)) {
    recipe.ingredient_groups.forEach(group => {
      // Safely handle ingredients within each group
      if (group.ingredients && Array.isArray(group.ingredients)) {
        names.push(...group.ingredients.map(i => i.ingredient_name));
      }
    });
  }
  
  return names;
};

// ============================================
// STRUCTURING PROMPT - FIXED WITH EXPLICIT CLOSING TAGS
// ============================================
export const getStructuringPrompt = (rawText) => {
  return `You are an expert in structuring recipe texts.

**ABSOLUTELY CRITICAL - THESE RULES ARE NON-NEGOTIABLE:**

1. **NO REPHRASING**: Copy every sentence WORD FOR WORD. Do NOT change ANY wording.
2. **NO CORRECTIONS**: Leave all spelling, grammar, and OCR errors as they are. 1:1 copy.
3. **NO OMISSIONS**: Every single word must appear in the output.
4. **NO ADDITIONS**: Add NOTHING except the explicitly allowed tags.

**Your ONLY allowed actions:**

A) **STRUCTURAL TAGS - BOTH OPENING AND CLOSING REQUIRED:**
   
   **⚠️ CRITICAL: You MUST use BOTH opening AND closing tags for EVERY structural element! ⚠️**
   
   - Main title: [H1]Title Text[/H1]
   - Main sections: [H2]Section Name[/H2] (e.g., ZUTATEN, ZUBEREITUNG, INGREDIENTS, INSTRUCTIONS)
   - Sub-sections: [H3]Subsection Name[/H3] (e.g., Teig, Füllung, Dough, Filling)
   
   **EXAMPLES OF CORRECT TAG USAGE:**
   ✅ CORRECT: [H1]Schokoladenkuchen[/H1]
   ✅ CORRECT: [H2]Zutaten[/H2]
   ✅ CORRECT: [H3]Für den Teig[/H3]
   
   **EXAMPLES OF WRONG TAG USAGE (DO NOT DO THIS):**
   ❌ WRONG: [H1]Schokoladenkuchen (missing closing tag!)
   ❌ WRONG: Zutaten[/H2] (missing opening tag!)
   ❌ WRONG: [H2]Zutaten[H2] (wrong closing tag - must be [/H2] with forward slash!)
   ❌ WRONG: [H2]Zutaten (no closing tag at all!)
   
   **ABSOLUTE RULE: Every [H1], [H2], or [H3] tag MUST have its corresponding closing tag [/H1], [/H2], or [/H3].**
   **The closing tag MUST have a forward slash: [/H1] NOT [H1]**

B) **PORTION AND TIME MARKERS:**
   - If you find serving information (e.g., "für 4 Personen", "4 Portionen", "serves 4"), estimate a number and add at the beginning: [PORTIONS: X]
   - If you find time information (e.g., "30 Minuten", "1 Stunde"), estimate and add: [PREP_TIME: X minutes] and/or [COOK_TIME: X minutes]
   - If NO time information exists, make a reasonable estimate based on recipe complexity
   - If NO serving information exists, estimate a reasonable number (typically 2-6 servings)
   - IMPORTANT: Do NOT delete the original text containing this information

C) **INTELLIGENT STEP SEPARATION (for instruction sections only):**
   
   **THINK LIKE A PROFESSIONAL RECIPE EDITOR:**
   
   - **Combine related actions** into ONE logical step
   - **Separate** only at clear workflow breaks
   
   **When to COMBINE:**
   - Sequential actions with same ingredients: "Dice onions. Sauté until golden." = ONE step
   - Preparation + immediate use: "Beat eggs. Add to flour." = ONE step
   - Related sub-tasks: "Peel potatoes. Cut into cubes. Add to pot." = ONE step
   
   **When to SEPARATE:**
   - Change in cooking method (chopping → sautéing → baking)
   - Waiting period ("Let rest 30 minutes")
   - New ingredient group ("Now prepare the sauce")
   - Change in vessel ("Transfer to baking dish")
   
   **Format:** Number each logical step: "1. [TEXT] 2. [TEXT] 3. [TEXT]"
   **COPY original text EXACTLY** - do NOT rephrase

**Raw Text:**
${rawText}

**FINAL REMINDER: Every structural tag MUST have both opening [HX] and closing [/HX] tags with a forward slash. This is absolutely non-negotiable.**

**Now structure the text above. Return ONLY the structured text, no comments.**`;
};

// ============================================
// EXTRACTION PROMPT - ENGLISH VERSION
// ============================================
export const getExtractionPrompt = (structuredText, categories, mainIngredients) => {
  const mealTypes = categories.meal.map(c => c.name);
  const gangTypes = categories.gang.map(c => c.name);
  const cuisines = categories.cuisine.map(c => c.name);
  const topIngredients = mainIngredients.map(m => m.name);

  return `You are an expert in extracting recipe data from structured text.

**Structured Text:**
${structuredText}

**Available Categories:**
- Meal Types: ${mealTypes.join(", ")}
- Courses: ${gangTypes.join(", ")}
- Cuisines: ${cuisines.join(", ")}
- Main Ingredients: ${topIngredients.join(", ")}

**IMPORTANT RULES FOR INSTRUCTION_GROUPS:**
1. Identify Instruction Sections: If the text contains [H3] tags within instructions, create instruction_groups
2. Typical Sections: Vorbereitung, Zubereitung, Preparation, Cooking, Teig, Dough, Füllung, Filling
3. Only with Clear Structure: If no [H3] tags or logical separation exist, use flat instructions array
4. ingredients_for_step: Extract for EACH step the ingredients used from the text

**ADDITIONAL RULES:**
- Use ONLY categories from the lists above
- All amounts as numbers, not text
- Provide confidence_scores for each field (0-100)
- For grouped structures: use instruction_groups INSTEAD OF instructions

**Expected JSON Structure:**
- title: string
- description: string
- prep_time_minutes: integer
- cook_time_minutes: integer
- servings: integer
- difficulty: easy, medium, hard, or expert
- meal_type: string from Meal Types list
- gang: string from Courses list
- cuisine: string from Cuisines list (optional)
- main_ingredient: string from Main Ingredients list (optional)
- ingredients: array of objects with ingredient_name, amount, unit, preparation_notes
- instruction_groups: array of objects with group_name and instructions array (OR use flat instructions)
- instructions: array of objects with step_number, step_description, ingredients_for_step, timer_minutes
- nutrition_per_serving: object with calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg
- tags: array of strings
- confidence_scores: object with overall, ingredients, instructions, nutrition (all 0-100)

Extract the recipe as a complete JSON object.`;
}
