
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
// METADATA EXTRACTION
// ============================================
export const extractMetadataFromOCRText = (text) => {
  const metadata = {
    hasPortions: false,
    hasTime: false,
    hasIngredients: false,
    hasInstructions: false,
    confidence: 0
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

  return metadata;
};

// ============================================
// RECIPE VALIDATION & CLEANING
// ============================================
export const validateAndCleanRecipeData = (rawRecipe) => {
  const cleaned = { ...rawRecipe };
  
  // Validate instruction_groups
  if (cleaned.instruction_groups && Array.isArray(cleaned.instruction_groups)) {
    const validGroups = cleaned.instruction_groups.filter(group => {
      return group && typeof group === 'object' && group.group_name && Array.isArray(group.instructions);
    });
    
    if (validGroups.length === 0 && cleaned.instruction_groups.length > 0) {
      cleaned.instructions = (cleaned.instructions || []).concat(
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
      cleaned.instruction_groups = validGroups;
    }
  }
  
  // Validate ingredient_groups
  if (cleaned.ingredient_groups && Array.isArray(cleaned.ingredient_groups)) {
    const validGroups = cleaned.ingredient_groups.filter(group => {
      return group && typeof group === 'object' && group.group_name && Array.isArray(group.ingredients);
    });
    
    if (validGroups.length === 0 && cleaned.ingredient_groups.length > 0) {
      cleaned.ingredients = (cleaned.ingredients || []).concat(
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
      cleaned.ingredient_groups = validGroups;
    }
  }
  
  // Ensure instructions have proper structure
  if (cleaned.instructions && Array.isArray(cleaned.instructions)) {
    cleaned.instructions = cleaned.instructions
      .filter(inst => inst && typeof inst === 'object' && inst.step_description)
      .map((inst, index) => ({
        step_number: inst.step_number || (index + 1),
        step_description: inst.step_description,
        ingredients_for_step: inst.ingredients_for_step || []
      }));
  }
  
  // Ensure ingredients have proper structure
  if (cleaned.ingredients && Array.isArray(cleaned.ingredients)) {
    cleaned.ingredients = cleaned.ingredients
      .filter(ing => ing && typeof ing === 'object' && ing.ingredient_name)
      .map(ing => ({
        ingredient_name: ing.ingredient_name,
        amount: ing.amount || 0,
        unit: ing.unit || "",
        preparation_notes: ing.preparation_notes || ""
      }));
  }
  
  // Remove empty arrays
  if (cleaned.instruction_groups && cleaned.instruction_groups.length === 0) delete cleaned.instruction_groups;
  if (cleaned.ingredient_groups && cleaned.ingredient_groups.length === 0) delete cleaned.ingredient_groups;
  if (cleaned.equipment && cleaned.equipment.length === 0) delete cleaned.equipment;
  if (cleaned.tags && cleaned.tags.length === 0) delete cleaned.tags;
  
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

const extractAllIngredientNames = (recipe) => {
  const names = [];
  if (recipe.ingredients) {
    names.push(...recipe.ingredients.map(i => i.ingredient_name));
  }
  if (recipe.ingredient_groups) {
    recipe.ingredient_groups.forEach(group => {
      if (group.ingredients) {
        names.push(...group.ingredients.map(i => i.ingredient_name));
      }
    });
  }
  return names;
};

// ============================================
// STRUCTURING PROMPT - ENGLISH VERSION
// ============================================
export const getStructuringPrompt = (rawText) => {
  return `You are an expert in structuring recipe texts.

**ABSOLUTELY CRITICAL - THESE RULES ARE NON-NEGOTIABLE:**

1. **NO REPHRASING**: Copy every sentence WORD FOR WORD. Do NOT change ANY wording.
2. **NO CORRECTIONS**: Leave all spelling, grammar, and OCR errors as they are. 1:1 copy.
3. **NO OMISSIONS**: Every single word must appear in the output.
4. **NO ADDITIONS**: Add NOTHING except the explicitly allowed tags.

**Your ONLY allowed actions:**

A) **STRUCTURAL TAGS:**
   - [H1] around the main title
   - [H2] around main sections (ZUTATEN, ZUBEREITUNG, INGREDIENTS, INSTRUCTIONS, etc.)
   - [H3] around sub-sections (Teig, Füllung, Dough, Filling, etc.)

B) **PORTION MARKER:**
   - If you find serving information (e.g., "für 4 Personen", "4 Portionen", "serves 4"), add at the beginning: [PORTIONS: X]
   - IMPORTANT: Do NOT delete the original text containing the serving information

C) **STEP NUMBERING** (only for continuous text without numbers):
   - If instructions are presented as continuous text (Sentence1. Sentence2. Sentence3.)
   - Separate them with a period at the end of the sentence: "[SENTENCE 1] . [SENTENCE 2] . [SENTENCE 3]"
   - COPY the sentences EXACTLY - do NOT change a single word
   - If periods already exist at the end of the sentence, leave it unchanged

**Raw Text:**
${rawText}

**FORBIDDEN example (DO NOT DO THIS!):**
Input: "Spaghetti nach Packungsanweisung kochen"
Output: "Die Spaghetti gemäß Packungsanleitung kochen" ❌ WRONG - rephrased!

**CORRECT example:**
Input: "Spaghetti nach Packungsanweisung kochen"
Output: "Spaghetti nach Packungsanweisung kochen" ✅ CORRECT - 1:1 copy!

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
1. **Identify Instruction Sections:** If the text contains [H3] tags within instructions (e.g., [H3]Vorbereitung[/H3], [H3]Preparation[/H3]), create instruction_groups
2. **Typical Sections:** "Vorbereitung", "Zubereitung", "Preparation", "Cooking", "Teig", "Dough", "Füllung", "Filling", "Glasur", "Glaze", "Marinade", "Zusammensetzen", "Assembly", "Backen", "Baking"
3. **Only with Clear Structure:** If no [H3] tags or logical separation exist, use flat "instructions"
4. **ingredients_for_step:** Extract for EACH step the ingredients used from the text

**ADDITIONAL RULES:**
- Use ONLY categories from the lists above
- All amounts as numbers, not text
- Provide confidence_scores for each field (0-100)
- For grouped structures: use instruction_groups INSTEAD OF instructions

**JSON Schema:**
{
  "title": string,
  "description": string,
  "prep_time_minutes": integer,
  "cook_time_minutes": integer,
  "servings": integer,
  "difficulty": "easy" | "medium" | "hard" | "expert",
  "meal_type": string (from Meal Types list),
  "gang": string (from Courses list),
  "cuisine": string (from Cuisines list, optional),
  "main_ingredient": string (from Main Ingredients list, optional),
  "ingredients": [ { "ingredient_name": string, "amount": number, "unit": string, "preparation_notes": string } ],
  "instruction_groups": [
    {
      "group_name": string (e.g., "Vorbereitung", "Zubereitung", "Preparation"),
      "instructions": [
        {
          "step_number": integer,
          "step_description": string,
          "ingredients_for_step": [string],
          "timer_minutes": integer (optional)
        }
      ]
    }
  ],
  "instructions": [
    {
      "step_number": integer,
      "step_description": string,
      "ingredients_for_step": [string],
      "timer_minutes": integer (optional)
    }
  ],
  "nutrition_per_serving": {
    "calories_kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "sodium_mg": number
  },
  "tags": [string],
  "confidence_scores": {
    "overall": integer (0-100),
    "ingredients": integer (0-100),
    "instructions": integer (0-100),
    "nutrition": integer (0-100)
  }
}

Extract the recipe as a complete JSON object.`;
};
