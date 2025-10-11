
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import http from "@/components/lib/http";

import {
  normalizeRawText,
  getStructuringPrompt, // Still used internally by processRecipeImport or its helpers
  getExtractionPrompt,
  validateAndCleanRecipeData,
  findDuplicates,
  retryWithBackoff,
  extractMetadataFromOCRText // Still used internally by processRecipeImport or its helpers
} from "../import/importHelpers";
import { processRecipeImport, saveProcessedRecipe } from "../import/unifiedImportPipeline";
import CheckpointManager from "../import/file-upload/CheckpointManager";
import { migrateCheckpoint, createDefaultFilters } from "../utils/domainKeys";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

// ============================================
// STAGES - TWO-STEP ARCHITECTURE
// ============================================
const STAGES = {
  INPUT: "input",
  PROCESSING: "processing",
  OCR_REVIEW: "ocr_review",
  EXTRACTING: "extracting",
  RECIPE_REVIEW: "recipe_review",
  COMPLETE: "complete"
};

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();

  // ============================================
  // RECIPE/CATEGORY/COLLECTION STATE
  // ============================================
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [ingredientImages, setIngredientImages] = useState([]);

  const [isLoading, setIsLoading] = useState({
    recipes: true,
    categories: true,
    collections: true,
    ingredientImages: true
  });

  const [error, setError] = useState(null); // General application error

  // ============================================
  // IMPORT PROCESS STATE
  // ============================================
  const [currentStage, setCurrentStage] = useState(STAGES.INPUT);
  const [inputData, setInputData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", message: "", progress: 0 });
  const [importError, setImportError] = useState(null); // Import-specific error

  // OCR Review Stage State
  const [structuredText, setStructuredText] = useState("");
  const [ocrMetadata, setOcrMetadata] = useState(null);

  // Recipe Review Stage State
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  const [sourceType, setSourceType] = useState("unknown");
  const [mainIngredients, setMainIngredients] = useState([]); // ADDED

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const activeRecipes = recipes.filter(r => !r.deleted);
  const trashedRecipes = recipes.filter(r => r.deleted);

  const categoriesByType = {
    meal: categories.filter(c => c.category_type === "meal"),
    gang: categories.filter(c => c.category_type === "gang"),
    cuisine: categories.filter(c => c.category_type === "cuisine")
  };

  const recipeCounts = {
    meal: {},
    gang: {},
    cuisine: {}
  };

  categoriesByType.meal.forEach(cat => {
    recipeCounts.meal[cat.name] = activeRecipes.filter(r => r.meal_type === cat.name).length;
  });

  categoriesByType.gang.forEach(cat => {
    recipeCounts.gang[cat.name] = activeRecipes.filter(r => r.gang === cat.name).length;
  });

  categoriesByType.cuisine.forEach(cat => {
    recipeCounts.cuisine[cat.name] = activeRecipes.filter(r => r.cuisine === cat.name).length;
  });

  // ============================================
  // RESET IMPORT PROCESS (MUSS VOR ANDEREN HANDLERN DEFINIERT WERDEN)
  // ============================================
  const resetImportProcess = useCallback(() => {
    CheckpointManager.clearCheckpoint();
    setCurrentStage(STAGES.INPUT);
    setInputData(null);
    setIsProcessing(false);
    setProgress({ stage: "", message: "", progress: 0 });
    setImportError(null);
    setStructuredText("");
    setOcrMetadata(null);
    setExtractedRecipe(null);
    setDuplicates([]);
    setSourceType("unknown");
  }, []);

  // ============================================
  // LOAD CHECKPOINT ON MOUNT (IMPORT PROCESS)
  // ============================================
  useEffect(() => {
    CheckpointManager.loadCheckpoint((checkpoint) => {
      if (checkpoint) {
        console.log("Checkpoint loaded:", checkpoint);
        
        // Migriere Checkpoint-Daten (alte Keys → neue Keys)
        const migratedCheckpoint = migrateCheckpoint(checkpoint);
        
        setCurrentStage(migratedCheckpoint.currentStage || STAGES.INPUT);
        setInputData(migratedCheckpoint.inputData || null);
        setStructuredText(migratedCheckpoint.structuredText || "");
        setOcrMetadata(migratedCheckpoint.ocrMetadata || null);
        setExtractedRecipe(migratedCheckpoint.extractedRecipe || null);
        setDuplicates(migratedCheckpoint.duplicates || []);
        setSourceType(migratedCheckpoint.sourceType || "unknown");
      }
    });
  }, []);

  // ============================================
  // SAVE CHECKPOINT ON STATE CHANGE (IMPORT PROCESS)
  // ============================================
  useEffect(() => {
    if (currentStage === STAGES.INPUT || currentStage === STAGES.COMPLETE) {
      return;
    }
    const checkpoint = {
      currentStage,
      inputData,
      structuredText,
      ocrMetadata,
      extractedRecipe,
      duplicates,
      sourceType
    };
    CheckpointManager.saveCheckpoint(checkpoint);
  }, [currentStage, inputData, structuredText, ocrMetadata, extractedRecipe, duplicates, sourceType]);

  // ============================================
  // INITIAL DATA LOAD
  // ============================================
  useEffect(() => {
    loadRecipes();
    loadCategories();
    loadCollections();
    loadIngredientImages();
    loadMainIngredients(); // ADDED
  }, []);

  // ============================================
  // RECIPES
  // ============================================
  const loadRecipes = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, recipes: true }));
    try {
      const data = await http.entityList('Recipe', '-created_date', 1000);
      setRecipes(data || []);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError(err.message);
    } finally {
      setIsLoading(prev => ({ ...prev, recipes: false }));
    }
  }, []);

  const createRecipe = useCallback(async (recipeData) => {
    const newRecipe = await http.entityCreate('Recipe', recipeData);
    setRecipes(prev => [newRecipe, ...prev]);
    return newRecipe;
  }, []);

  const updateRecipe = useCallback(async (id, updates) => {
    const updated = await http.entityUpdate('Recipe', id, updates);
    setRecipes(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const deleteRecipe = useCallback(async (id) => {
    await http.entityUpdate('Recipe', id, { deleted: true, deleted_date: new Date().toISOString() });
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: true, deleted_date: new Date().toISOString() } : r));
  }, []);

  const restoreRecipe = useCallback(async (id) => {
    await http.entityUpdate('Recipe', id, { deleted: false, deleted_date: null });
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: false, deleted_date: null } : r));
  }, []);

  const permanentlyDeleteRecipe = useCallback(async (id) => {
    await http.entityDelete('Recipe', id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  // ============================================
  // CATEGORIES
  // ============================================
  const loadCategories = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const data = await http.entityList('RecipeCategory', 'name', 100);
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    const newCategory = await http.entityCreate('RecipeCategory', categoryData);
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, []);

  const updateCategory = useCallback(async (id, updates) => {
    const updated = await http.entityUpdate('RecipeCategory', id, updates);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await http.entityDelete('RecipeCategory', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // ============================================
  // COLLECTIONS
  // ============================================
  const loadCollections = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, collections: true }));
    try {
      const data = await http.entityList('RecipeCollection', '-created_date', 100);
      setCollections(data || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, collections: false }));
    }
  }, []);

  const createCollection = useCallback(async (collectionData) => {
    const newCollection = await http.entityCreate('RecipeCollection', collectionData);
    setCollections(prev => [...prev, newCollection]);
    return newCollection;
  }, []);

  const updateCollection = useCallback(async (id, updates) => {
    const updated = await http.entityUpdate('RecipeCollection', id, updates);
    setCollections(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCollection = useCallback(async (id) => {
    await http.entityDelete('RecipeCollection', id);
    setCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  // ============================================
  // INGREDIENT IMAGES
  // ============================================
  const loadIngredientImages = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, ingredientImages: true }));
    try {
      const data = await http.entityList('IngredientImage', 'ingredient_name', 500);
      setIngredientImages(data || []);
    } catch (err) {
      console.error('Failed to load ingredient images:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, ingredientImages: false }));
    }
  }, []);

  const refreshIngredientImages = useCallback(async () => {
    await loadIngredientImages();
  }, [loadIngredientImages]);

  const createIngredientImage = useCallback(async (imageData) => {
    const newImage = await http.entityCreate('IngredientImage', imageData);
    setIngredientImages(prev => [newImage, ...prev]);
    return newImage;
  }, []);

  const updateIngredientImage = useCallback(async (id, updates) => {
    const updated = await http.entityUpdate('IngredientImage', id, updates);
    setIngredientImages(prev => prev.map(img => img.id === id ? updated : img));
    return updated;
  }, []);

  const deleteIngredientImage = useCallback(async (id) => {
    await http.entityDelete('IngredientImage', id);
    setIngredientImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // ============================================
  // MAIN INGREDIENTS
  // ============================================
  const loadMainIngredients = useCallback(async () => {
    try {
      const data = await http.entityList('MainIngredient', 'name', 500);
      setMainIngredients(data || []);
    } catch (err) {
      console.error('Failed to load main ingredients:', err);
    }
  }, []);


  // ============================================
  // IMPORT PROCESS HANDLERS (MOVED FROM useImportPipeline)
  // ============================================

  // STEP 1: TEXT EXTRACTION & STRUCTURING
  const handleImport = useCallback(async (input, sourceStrategy, importSourceType) => {
    if (!input) {
      setImportError("Keine Eingabe erhalten. Bitte versuche es erneut.");
      return;
    }

    setCurrentStage(STAGES.PROCESSING);
    setIsProcessing(true);
    setImportError(null);
    setSourceType(importSourceType);
    setInputData(input);
    setProgress({ stage: "start", message: "Starte Import...", progress: 0 }); // Retained initial progress message

    try {
      // processRecipeImport (from unifiedImportPipeline) is assumed to encapsulate
      // raw text extraction, normalization, LLM structuring, and metadata extraction.
      const result = await processRecipeImport(
        input,
        sourceStrategy,
        (progressUpdate) => setProgress(progressUpdate)
      );

      if (!result.success) {
        throw new Error(result.error || "Import fehlgeschlagen");
      }

      setStructuredText(result.structured_text);
      setOcrMetadata(result.metadata);
      setCurrentStage(STAGES.OCR_REVIEW);
      setProgress({ stage: "ocr_complete", message: "Text erfolgreich extrahiert!", progress: 100 }); // Retained completion progress

    } catch (err) {
      console.error("Text Extraction Error:", err);
      setImportError(err.message || "Fehler beim Extrahieren des Textes.");
      setCurrentStage(STAGES.INPUT);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // STEP 2: DATA EXTRACTION (after OCR approval)
  const handleExtraction = useCallback(async (reviewedText) => {
    if (!reviewedText || typeof reviewedText !== 'string' || reviewedText.trim() === '') {
      setImportError("Kein Text zum Verarbeiten. Bitte überprüfe den extrahierten Text.");
      return;
    }

    setIsProcessing(true);
    setImportError(null);
    setCurrentStage(STAGES.EXTRACTING);
    setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 0 });

    try {
      setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 20 });
      // CRITICAL REFINEMENT: Pass categories and mainIngredients to getExtractionPrompt
      const extractionPrompt = getExtractionPrompt(reviewedText, categoriesByType, mainIngredients);

      // CRITICAL REFINEMENT: Blended schema from original and outline for completeness and correct types
      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          prep_time_minutes: { type: "integer" },
          cook_time_minutes: { type: "integer" },
          servings: { type: "integer" },
          difficulty: { type: "string" },
          meal_type: { type: "string" },
          gang: { type: "string" },
          cuisine: { type: "string" },
          main_ingredient: { type: "string" },
          equipment: { type: "array", items: { type: "string" } },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "string" }
              },
              required: ["name", "amount"] // Added for robust schema validation
            }
          },
          ingredient_groups: { type: "array", items: { type: "object" } },
          instructions: { type: "array", items: { type: "object" } }, // Kept object for consistency with original structure
          instruction_groups: { type: "array", items: { type: "object" } },
          tags: { type: "array", items: { type: "string" } },
          confidence_scores: { type: "object" }
        }
      };

      setProgress({ stage: "extract", message: "KI analysiert Rezept...", progress: 40 });
      const result = await retryWithBackoff(async () => {
        return await base44.integrations.Core.InvokeLLM({ // Changed InvokeLLM to base44
          prompt: extractionPrompt,
          add_context_from_internet: false,
          response_json_schema: schema
        });
      }, 4, 4000);

      // CRITICAL VALIDATION: Check if LLM returned valid data
      if (!result || typeof result !== 'object' || Object.keys(result).length === 0) {
        throw new Error("AI-Datenextraktion fehlgeschlagen. Der strukturierte Text könnte ungültig sein oder das AI-Modell konnte die Anfrage nicht verarbeiten. Bitte überprüfe die Quelldatei und versuche es erneut.");
      }

      // VALIDATE AND CLEAN DATA
      setProgress({ stage: "validate", message: "Validiere Daten...", progress: 70 });
      const cleanedRecipe = validateAndCleanRecipeData(result);

      // CHECK DUPLICATES
      setProgress({ stage: "duplicates", message: "Prüfe auf Duplikate...", progress: 85 });
      // CRITICAL REFINEMENT: Use original findDuplicates signature (full recipe obj, all recipes, threshold)
      const potentialDuplicates = findDuplicates(cleanedRecipe, recipes, 65);

      // MOVE TO RECIPE REVIEW STAGE
      setExtractedRecipe(cleanedRecipe);
      setDuplicates(potentialDuplicates);
      setCurrentStage(STAGES.RECIPE_REVIEW);
      setProgress({ stage: "complete", message: "Extraktion abgeschlossen!", progress: 100 });

    } catch (err) {
      console.error("Data Extraction Error:", err);
      setImportError(err.message || "Fehler beim Extrahieren der Rezeptdaten.");
      setCurrentStage(STAGES.OCR_REVIEW);
    } finally {
      setIsProcessing(false);
    }
  }, [categoriesByType, mainIngredients, recipes]); // Added dependencies

  // SAVE RECIPE (after final review)
  const handleSaveRecipe = useCallback(async (finalRecipe, action = "new") => {
    setIsProcessing(true);
    setImportError(null);

    try {
      let saveResult;
      // CRITICAL REFINEMENT: Retain logic for handling new/merge/replace actions
      // Assumes saveProcessedRecipe (from unifiedImportPipeline) handles the actual DB operations via http client.
      if (action === "new") {
        saveResult = await saveProcessedRecipe(finalRecipe, { action: "new", sourceType: sourceType, sourceUrl: typeof inputData === 'string' ? inputData : inputData?.name });
      } else if (action === "merge" && duplicates[0]) {
        saveResult = await saveProcessedRecipe(finalRecipe, { action: "merge", duplicateId: duplicates[0].recipe.id, sourceType: sourceType, sourceUrl: typeof inputData === 'string' ? inputData : inputData?.name });
      } else if (action === "replace" && duplicates[0]) {
        saveResult = await saveProcessedRecipe(finalRecipe, { action: "replace", duplicateId: duplicates[0].recipe.id, sourceType: sourceType, sourceUrl: typeof inputData === 'string' ? inputData : inputData?.name });
      } else {
        throw new Error("Ungültige Speicheraktion. Bitte wählen Sie eine Option (Neu, Zusammenführen, Ersetzen).");
      }

      if (!saveResult.success) throw new Error(saveResult.error);

      CheckpointManager.clearCheckpoint();
      setCurrentStage(STAGES.COMPLETE);

      // Reload recipes to reflect the new addition
      await loadRecipes();

      // Navigate after a short delay for UX
      setTimeout(() => {
        resetImportProcess();
        navigate(createPageUrl("Browse"));
      }, 1000);


    } catch (err) {
      console.error("Save failed:", err);
      setImportError(err.message || "Speichern fehlgeschlagen");
    } finally {
      setIsProcessing(false);
    }
  }, [sourceType, inputData, duplicates, navigate, loadRecipes, resetImportProcess]);

  // CANCEL HANDLERS
  const handleCancelOCRReview = useCallback(() => {
    CheckpointManager.clearCheckpoint();
    setStructuredText("");
    setOcrMetadata(null);
    setSourceType("unknown");
    setCurrentStage(STAGES.INPUT); // Reset to input stage
    setImportError(null); // Clear import specific error
  }, []);

  const handleCancelRecipeReview = useCallback(() => {
    setExtractedRecipe(null);
    setDuplicates([]);
    setCurrentStage(STAGES.OCR_REVIEW); // Return to OCR review stage for re-evaluation
    setSourceType("unknown");
  }, []);


  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value = {
    // Data
    recipes,
    activeRecipes,
    trashedRecipes,
    categories,
    categoriesByType,
    recipeCounts,
    collections,
    ingredientImages,
    mainIngredients, // ADDED

    // Loading states
    isLoading,
    error, // General app error
    setError, // Setter for general app error

    // Recipe actions
    loadRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    restoreRecipe,
    permanentlyDeleteRecipe,

    // Category actions
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    // Collection actions
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,

    // Ingredient Image actions
    loadIngredientImages,
    refreshIngredientImages,
    createIngredientImage,
    updateIngredientImage,
    deleteIngredientImage,

    // Main Ingredient actions (only load is currently exposed)
    loadMainIngredients,

    // Import Process State
    currentStage,
    isProcessing,
    progress,
    importError, // Import-specific error
    setImportError, // Setter for import-specific error
    structuredText,
    ocrMetadata,
    extractedRecipe,
    duplicates,
    sourceType,
    STAGES,

    // Import Process Handlers
    handleImport,
    handleExtraction,
    handleSaveRecipe,
    handleCancelOCRReview,
    handleCancelRecipeReview,
    resetImportProcess,

    // HTTP Client
    http
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook für Kategorien (für Sidebar)
export const useCategories = () => {
  const { categories, categoriesByType, recipeCounts, isLoading } = useApp();
  return {
    categories: categoriesByType, // Still exposes the categorized version
    recipeCounts,
    isLoading: isLoading.categories
  };
};
