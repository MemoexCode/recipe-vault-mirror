import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { http } from "@/components/lib/http";
import { showSuccess, showError, showInfo } from "@/components/ui/toastUtils";
import { logError, logInfo, logWarn } from "@/components/utils/logging";

import {
  normalizeRawText,
  getStructuringPrompt,
  getExtractionPrompt,
  validateAndCleanRecipeData,
  findDuplicates,
  retryWithBackoff,
  extractMetadataFromOCRText
} from "../import/importHelpers";
import { processRecipeImport, saveProcessedRecipe } from "../import/unifiedImportPipeline";
import CheckpointManager from "../import/file-upload/CheckpointManager";
import { migrateCheckpoint, createDefaultFilters } from "../utils/domainKeys";

// ============================================
// CACHING UTILITIES
// ============================================
const CACHE_PREFIX = 'base44_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error retrieving cached data:', err);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Failed to cache data:', err);
  }
};


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
  const [mainIngredients, setMainIngredients] = useState([]);

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
      showError("Fehler beim Laden der Rezepte.");
    } finally {
      setIsLoading(prev => ({ ...prev, recipes: false }));
    }
  }, []);

  const createRecipe = useCallback(async (recipeData) => {
    try {
      const newRecipe = await http.entityCreate('Recipe', recipeData);
      setRecipes(prev => [newRecipe, ...prev]);
      showSuccess("Rezept erfolgreich erstellt!");
      return newRecipe;
    } catch (err) {
      console.error('Failed to create recipe:', err);
      showError("Fehler beim Erstellen des Rezepts.");
      throw err;
    }
  }, []);

  const updateRecipe = useCallback(async (id, updates) => {
    try {
      const updated = await http.entityUpdate('Recipe', id, updates);
      setRecipes(prev => prev.map(r => r.id === id ? updated : r));
      showSuccess("Rezept erfolgreich aktualisiert!");
      return updated;
    } catch (err) {
      console.error('Failed to update recipe:', err);
      showError("Fehler beim Aktualisieren des Rezepts.");
      throw err;
    }
  }, []);

  const deleteRecipe = useCallback(async (id) => {
    try {
      await http.entityUpdate('Recipe', id, { deleted: true, deleted_date: new Date().toISOString() });
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: true, deleted_date: new Date().toISOString() } : r));
      showSuccess("Rezept in den Papierkorb gelegt.");
    } catch (err) {
      console.error('Failed to delete recipe:', err);
      showError("Fehler beim Löschen des Rezepts.");
      throw err;
    }
  }, []);

  const restoreRecipe = useCallback(async (id) => {
    try {
      await http.entityUpdate('Recipe', id, { deleted: false, deleted_date: null });
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: false, deleted_date: null } : r));
      showSuccess("Rezept wiederhergestellt!");
    } catch (err) {
      console.error('Failed to restore recipe:', err);
      showError("Fehler beim Wiederherstellen des Rezepts.");
      throw err;
    }
  }, []);

  const permanentlyDeleteRecipe = useCallback(async (id) => {
    try {
      await http.entityDelete('Recipe', id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      showSuccess("Rezept endgültig gelöscht.");
    } catch (err) {
      console.error('Failed to permanently delete recipe:', err);
      showError("Fehler beim endgültigen Löschen.");
      throw err;
    }
  }, []);

  // ============================================
  // CATEGORIES (WITH CACHING)
  // ============================================
  const loadCategories = useCallback(async () => {
    // Check cache first
    const cached = getCachedData('categories');
    if (cached) {
      setCategories(cached);
      setIsLoading(prev => ({ ...prev, categories: false }));
      logInfo('Categories loaded from cache', 'CACHE');
      return;
    }

    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const data = await http.entityList('RecipeCategory', 'name', 100);
      setCategories(data || []);
      setCachedData('categories', data || []);
      logInfo(`Loaded ${data?.length || 0} categories`, 'DATA');
    } catch (err) {
      console.error('Failed to load categories:', err);
      showError("Fehler beim Laden der Kategorien.");
      logError(err, 'CATEGORIES_LOAD');
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    try {
      const newCategory = await http.entityCreate('RecipeCategory', categoryData);
      setCategories(prev => [...prev, newCategory]);
      // Invalidate cache for categories
      sessionStorage.removeItem(`${CACHE_PREFIX}categories`); 
      showSuccess("Kategorie erfolgreich erstellt!");
      return newCategory;
    } catch (err) {
      console.error('Failed to create category:', err);
      showError("Fehler beim Erstellen der Kategorie.");
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id, updates) => {
    try {
      const updated = await http.entityUpdate('RecipeCategory', id, updates);
      setCategories(prev => prev.map(c => c.id === id ? updated : c));
      // Invalidate cache for categories
      sessionStorage.removeItem(`${CACHE_PREFIX}categories`);
      showSuccess("Kategorie erfolgreich aktualisiert!");
      return updated;
    } catch (err) {
      console.error('Failed to update category:', err);
      showError("Fehler beim Aktualisieren der Kategorie.");
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id) => {
    try {
      await http.entityDelete('RecipeCategory', id);
      setCategories(prev => prev.filter(c => c.id !== id));
      // Invalidate cache for categories
      sessionStorage.removeItem(`${CACHE_PREFIX}categories`);
      showSuccess("Kategorie erfolgreich gelöscht!");
    } catch (err) {
      console.error('Failed to delete category:', err);
      showError("Fehler beim Löschen der Kategorie.");
      throw err;
    }
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
      showError("Fehler beim Laden der Kollektionen.");
    } finally {
      setIsLoading(prev => ({ ...prev, collections: false }));
    }
  }, []);

  const createCollection = useCallback(async (collectionData) => {
    try {
      const newCollection = await http.entityCreate('RecipeCollection', collectionData);
      setCollections(prev => [...prev, newCollection]);
      showSuccess("Kollektion erfolgreich erstellt!");
      return newCollection;
    } catch (err) {
      console.error('Failed to create collection:', err);
      showError("Fehler beim Erstellen der Kollektion.");
      throw err;
    }
  }, []);

  const updateCollection = useCallback(async (id, updates) => {
    try {
      const updated = await http.entityUpdate('RecipeCollection', id, updates);
      setCollections(prev => prev.map(c => c.id === id ? updated : c));
      showSuccess("Kollektion erfolgreich aktualisiert!");
      return updated;
    } catch (err) {
      console.error('Failed to update collection:', err);
      showError("Fehler beim Aktualisieren der Kollektion.");
      throw err;
    }
  }, []);

  const deleteCollection = useCallback(async (id) => {
    try {
      await http.entityDelete('RecipeCollection', id);
      setCollections(prev => prev.filter(c => c.id !== id));
      showSuccess("Kollektion erfolgreich gelöscht!");
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showError("Fehler beim Löschen der Kollektion.");
      throw err;
    }
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
      showError("Fehler beim Laden der Zutatenbilder.");
    } finally {
      setIsLoading(prev => ({ ...prev, ingredientImages: false }));
    }
  }, []);

  const refreshIngredientImages = useCallback(async () => {
    await loadIngredientImages();
  }, [loadIngredientImages]);

  const createIngredientImage = useCallback(async (imageData) => {
    try {
      const newImage = await http.entityCreate('IngredientImage', imageData);
      setIngredientImages(prev => [newImage, ...prev]);
      showSuccess("Zutatenbild erfolgreich erstellt!");
      return newImage;
    } catch (err) {
      console.error('Failed to create ingredient image:', err);
      showError("Fehler beim Erstellen des Zutatenbilds.");
      throw err;
    }
  }, []);

  const updateIngredientImage = useCallback(async (id, updates) => {
    try {
      const updated = await http.entityUpdate('IngredientImage', id, updates);
      setIngredientImages(prev => prev.map(img => img.id === id ? updated : img));
      showSuccess("Zutatenbild erfolgreich aktualisiert!");
      return updated;
    } catch (err) {
      console.error('Failed to update ingredient image:', err);
      showError("Fehler beim Aktualisieren des Zutatenbilds.");
      throw err;
    }
  }, []);

  const deleteIngredientImage = useCallback(async (id) => {
    try {
      await http.entityDelete('IngredientImage', id);
      setIngredientImages(prev => prev.filter(img => img.id !== id));
      showSuccess("Zutatenbild erfolgreich gelöscht!");
    } catch (err) {
      console.error('Failed to delete ingredient image:', err);
      showError("Fehler beim Löschen des Zutatenbilds.");
      throw err;
    }
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
      showError("Fehler beim Laden der Hauptzutaten.");
    }
  }, []);

  // ============================================
  // INITIAL DATA LOAD (OPTIMIZED WITH PROMISE.ALL)
  // ============================================
  useEffect(() => {
    // Load critical data first
    const loadAllInitialData = async () => {
      await Promise.all([
        loadRecipes(),
        loadCategories(),
        loadCollections()
      ]);

      // Defer non-critical data
      setTimeout(() => {
        loadIngredientImages();
        loadMainIngredients();
      }, 1000);
    };

    loadAllInitialData();
  }, [loadRecipes, loadCategories, loadCollections, loadIngredientImages, loadMainIngredients]);

  // ============================================
  // IMPORT PROCESS HANDLERS (MOVED FROM useImportPipeline)
  // ============================================

  // STEP 1: TEXT EXTRACTION & STRUCTURING
  const handleImport = useCallback(async (input, sourceStrategy, importSourceType) => {
    if (!input) {
      const errorMsg = "Keine Eingabe erhalten. Bitte versuche es erneut.";
      setImportError(errorMsg);
      showError(errorMsg);
      logWarn(errorMsg, 'IMPORT');
      return;
    }

    logInfo(`Starting import: ${importSourceType}`, 'IMPORT');
    setCurrentStage(STAGES.PROCESSING);
    setIsProcessing(true);
    setImportError(null);
    setSourceType(importSourceType);
    setInputData(input);
    setProgress({ stage: "start", message: "Starte Import...", progress: 0 });

    try {
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
      setProgress({ stage: "ocr_complete", message: "Text erfolgreich extrahiert!", progress: 100 });
      showSuccess("Text erfolgreich extrahiert!");
      logInfo('Text extraction successful', 'IMPORT');

    } catch (err) {
      console.error("Text Extraction Error:", err);
      const errorMsg = err.message || "Fehler beim Extrahieren des Textes.";
      setImportError(errorMsg);
      setCurrentStage(STAGES.INPUT);
      showError(errorMsg);
      logError(err, 'IMPORT_EXTRACTION');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // STEP 2: DATA EXTRACTION (after OCR approval)
  const handleExtraction = useCallback(async (reviewedText) => {
    if (!reviewedText || typeof reviewedText !== 'string' || reviewedText.trim() === '') {
      const errorMsg = "Kein Text zum Verarbeiten. Bitte überprüfe den extrahierten Text.";
      setImportError(errorMsg);
      showError(errorMsg);
      logWarn(errorMsg, 'IMPORT');
      return;
    }

    logInfo('Starting recipe data extraction', 'IMPORT');
    setIsProcessing(true);
    setImportError(null);
    setCurrentStage(STAGES.EXTRACTING);
    setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 0 });

    try {
      setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 20 });
      const extractionPrompt = getExtractionPrompt(reviewedText, categoriesByType, mainIngredients);

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
              required: ["name", "amount"]
            }
          },
          ingredient_groups: { type: "array", items: { type: "object" } },
          instructions: { type: "array", items: { type: "object" } },
          instruction_groups: { type: "array", items: { type: "object" } },
          tags: { type: "array", items: { type: "string" } },
          confidence_scores: { type: "object" }
        }
      };

      setProgress({ stage: "extract", message: "KI analysiert Rezept...", progress: 40 });
      const result = await retryWithBackoff(async () => {
        return await base44.integrations.Core.InvokeLLM({
          prompt: extractionPrompt,
          add_context_from_internet: false,
          response_json_schema: schema
        });
      }, 4, 4000);

      if (!result || typeof result !== 'object' || Object.keys(result).length === 0) {
        throw new Error("AI-Datenextraktion fehlgeschlagen. Der strukturierte Text könnte ungültig sein oder das AI-Modell konnte die Anfrage nicht verarbeiten. Bitte überprüfe die Quelldatei und versuche es erneut.");
      }

      setProgress({ stage: "validate", message: "Validiere Daten...", progress: 70 });
      const cleanedRecipe = validateAndCleanRecipeData(result);

      setProgress({ stage: "duplicates", message: "Prüfe auf Duplikate...", progress: 85 });
      const potentialDuplicates = findDuplicates(cleanedRecipe, recipes, 65);

      setExtractedRecipe(cleanedRecipe);
      setDuplicates(potentialDuplicates);
      setCurrentStage(STAGES.RECIPE_REVIEW);
      setProgress({ stage: "complete", message: "Extraktion abgeschlossen!", progress: 100 });
      showSuccess("Rezeptdaten erfolgreich extrahiert!");
      logInfo(`Recipe extraction successful: ${cleanedRecipe.title}`, 'IMPORT');

    } catch (err) {
      console.error("Data Extraction Error:", err);
      const errorMsg = err.message || "Fehler beim Analysieren der Rezeptdaten.";
      setImportError(errorMsg);
      setCurrentStage(STAGES.OCR_REVIEW);
      showError(errorMsg);
      logError(err, 'IMPORT_DATA_EXTRACTION');
    } finally {
      setIsProcessing(false);
    }
  }, [categoriesByType, mainIngredients, recipes]);

  // SAVE RECIPE (after final review)
  const handleSaveRecipe = useCallback(async (finalRecipe, action = "new") => {
    logInfo(`Saving recipe: ${finalRecipe.title}, action: ${action}`, 'IMPORT');
    setIsProcessing(true);
    setImportError(null);

    try {
      let saveResult;
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
      
      showSuccess("Rezept erfolgreich gespeichert!");
      logInfo(`Recipe saved successfully: ${finalRecipe.title}`, 'IMPORT');

      await loadRecipes();

      setTimeout(() => {
        resetImportProcess();
        navigate(createPageUrl("Browse"));
      }, 1000);


    } catch (err) {
      console.error("Save failed:", err);
      const errorMsg = err.message || "Fehler beim Speichern. Bitte erneut versuchen.";
      setImportError(errorMsg);
      showError(errorMsg);
      logError(err, 'IMPORT_SAVE');
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
    setCurrentStage(STAGES.INPUT);
    setImportError(null);
    showInfo("Importvorgang abgebrochen.");
  }, []);

  const handleCancelRecipeReview = useCallback(() => {
    setExtractedRecipe(null);
    setDuplicates([]);
    setCurrentStage(STAGES.OCR_REVIEW);
    setSourceType("unknown");
    showInfo("Rezeptüberprüfung abgebrochen.");
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
    mainIngredients,

    // Loading states
    isLoading,
    error,
    setError,

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

    // Main Ingredient actions
    loadMainIngredients,

    // Import Process State
    currentStage,
    isProcessing,
    progress,
    importError,
    setImportError,
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
    categories: categoriesByType,
    recipeCounts,
    isLoading: isLoading.categories
  };
};