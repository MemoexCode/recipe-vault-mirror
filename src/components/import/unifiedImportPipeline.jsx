/**
 * UNIFIED IMPORT PIPELINE
 * Einheitliche Pipeline für alle Import-Quellen (Web, PDF, Bild)
 * Stellt sicher, dass alle Rezepte durch dieselben Validierungs- und Optimierungsschritte laufen
 */

import { validateAndCleanRecipeData } from "./importHelpers";
import { findDuplicates } from "./importHelpers";
import { generateRecipeImage } from "./ImageGenerationHelper";
import { Recipe } from "@/api/entities";

/**
 * Einheitliche Import-Pipeline
 * Wird von allen Import-Quellen verwendet
 */
export const processRecipeImport = async (rawRecipe, options = {}) => {
  const {
    autoGenerateImage = true,
    checkDuplicates = true,
    sourceType = "unknown",
    sourceUrl = null,
    onProgress = null
  } = options;

  const pipeline = {
    steps: [],
    errors: [],
    warnings: []
  };

  try {
    // ============================================
    // STEP 1: DATA VALIDATION & CLEANING
    // ============================================
    if (onProgress) onProgress({ stage: "validate", message: "Validiere Rezeptdaten..." });
    
    pipeline.steps.push("validate");
    const cleanedRecipe = validateAndCleanRecipeData(rawRecipe);
    
    // Füge Source-Informationen hinzu
    cleanedRecipe.source_type = sourceType;
    if (sourceUrl) cleanedRecipe.source_url = sourceUrl;

    // ============================================
    // STEP 2: REQUIRED FIELDS CHECK
    // ============================================
    if (!cleanedRecipe.title || cleanedRecipe.title.trim() === "") {
      throw new Error("Titel ist erforderlich");
    }
    if (!cleanedRecipe.meal_type || cleanedRecipe.meal_type === "") {
      pipeline.warnings.push("Mahlzeittyp fehlt - sollte manuell ergänzt werden");
    }
    if (!cleanedRecipe.gang || cleanedRecipe.gang === "") {
      pipeline.warnings.push("Gang fehlt - sollte manuell ergänzt werden");
    }

    // ============================================
    // STEP 3: IMAGE GENERATION (if needed)
    // ============================================
    if (autoGenerateImage && !cleanedRecipe.image_url) {
      if (onProgress) onProgress({ stage: "image", message: "Generiere Rezeptbild..." });
      
      try {
        pipeline.steps.push("image_generation");
        const { url } = await generateRecipeImage(cleanedRecipe, onProgress);
        cleanedRecipe.image_url = url;
      } catch (imgErr) {
        console.warn("Image generation failed:", imgErr);
        pipeline.warnings.push("Bildgenerierung fehlgeschlagen - kann später nachgeholt werden");
      }
    }

    // ============================================
    // STEP 4: DUPLICATE CHECK
    // ============================================
    let duplicates = [];
    if (checkDuplicates) {
      if (onProgress) onProgress({ stage: "duplicates", message: "Prüfe auf Duplikate..." });
      
      pipeline.steps.push("duplicate_check");
      const allRecipes = await Recipe.list();
      duplicates = findDuplicates(cleanedRecipe, allRecipes, 65);
    }

    // ============================================
    // STEP 5: QUALITY SCORE
    // ============================================
    const qualityScore = calculateQualityScore(cleanedRecipe);
    pipeline.steps.push("quality_check");

    // ============================================
    // RETURN RESULT
    // ============================================
    return {
      success: true,
      recipe: cleanedRecipe,
      duplicates,
      qualityScore,
      pipeline,
      needsReview: duplicates.length > 0 || qualityScore < 70 || pipeline.warnings.length > 0
    };

  } catch (err) {
    return {
      success: false,
      error: err.message,
      pipeline
    };
  }
};

/**
 * Berechnet einen Quality Score für das Rezept (0-100)
 */
const calculateQualityScore = (recipe) => {
  let score = 0;
  let maxScore = 0;

  // Titel (10 Punkte)
  maxScore += 10;
  if (recipe.title && recipe.title.length > 5) score += 10;

  // Beschreibung (10 Punkte)
  maxScore += 10;
  if (recipe.description && recipe.description.length > 20) score += 10;

  // Bild (10 Punkte)
  maxScore += 10;
  if (recipe.image_url) score += 10;

  // Zutaten (20 Punkte)
  maxScore += 20;
  const ingredientCount = getIngredientCount(recipe);
  if (ingredientCount >= 3) score += 10;
  if (ingredientCount >= 6) score += 10;

  // Zubereitungsschritte (20 Punkte)
  maxScore += 20;
  const stepCount = getInstructionCount(recipe);
  if (stepCount >= 2) score += 10;
  if (stepCount >= 4) score += 10;

  // Zeiten (10 Punkte)
  maxScore += 10;
  if (recipe.prep_time_minutes > 0 || recipe.cook_time_minutes > 0) score += 10;

  // Portionen (5 Punkte)
  maxScore += 5;
  if (recipe.servings && recipe.servings > 0) score += 5;

  // Kategorien (15 Punkte)
  maxScore += 15;
  if (recipe.meal_type) score += 5;
  if (recipe.gang) score += 5;
  if (recipe.cuisine) score += 3;
  if (recipe.main_ingredient) score += 2;

  return Math.round((score / maxScore) * 100);
};

const getIngredientCount = (recipe) => {
  if (recipe.ingredient_groups && recipe.ingredient_groups.length > 0) {
    return recipe.ingredient_groups.reduce((sum, g) => sum + (g.ingredients?.length || 0), 0);
  }
  return recipe.ingredients?.length || 0;
};

const getInstructionCount = (recipe) => {
  if (recipe.instruction_groups && recipe.instruction_groups.length > 0) {
    return recipe.instruction_groups.reduce((sum, g) => sum + (g.instructions?.length || 0), 0);
  }
  return recipe.instructions?.length || 0;
};

/**
 * Speichert ein Rezept nach der Pipeline-Verarbeitung
 */
export const saveProcessedRecipe = async (processedRecipe, action = "new", duplicateId = null) => {
  try {
    if (action === "new") {
      const created = await Recipe.create(processedRecipe.recipe);
      return { success: true, recipe: created };
    } else if (action === "merge" && duplicateId) {
      const existing = await Recipe.list();
      const duplicate = existing.find(r => r.id === duplicateId);
      if (!duplicate) throw new Error("Duplikat nicht gefunden");
      
      const merged = { ...duplicate, ...processedRecipe.recipe, id: duplicate.id };
      const updated = await Recipe.update(duplicateId, merged);
      return { success: true, recipe: updated };
    } else if (action === "replace" && duplicateId) {
      const updated = await Recipe.update(duplicateId, processedRecipe.recipe);
      return { success: true, recipe: updated };
    }
    
    throw new Error("Ungültige Aktion");
  } catch (err) {
    return { success: false, error: err.message };
  }
};