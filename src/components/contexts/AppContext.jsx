import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
import { RecipeCollection } from "@/api/entities";
import { IngredientImage } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";

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
  
  const [error, setError] = useState(null);

  // ============================================
  // IMPORT PROCESS STATE (MOVED FROM useImportPipeline)
  // ============================================
  const [currentStage, setCurrentStage] = useState(STAGES.INPUT);
  const [inputData, setInputData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", message: "", progress: 0 });
  const [importError, setImportError] = useState(null);
  
  // OCR Review Stage State
  const [structuredText, setStructuredText] = useState("");
  const [ocrMetadata, setOcrMetadata] = useState(null);
  
  // Recipe Review Stage State
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  
  const [sourceType, setSourceType] = useState("unknown");

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
  // LOAD CHECKPOINT ON MOUNT (IMPORT PROCESS)
  // ============================================
  useEffect(() => {
    CheckpointManager.loadCheckpoint((checkpoint) => {
      if (checkpoint) {
        console.log("Checkpoint loaded:", checkpoint);
        setCurrentStage(checkpoint.currentStage || STAGES.INPUT);
        setInputData(checkpoint.inputData || null);
        setStructuredText(checkpoint.structuredText || "");
        setOcrMetadata(checkpoint.ocrMetadata || null);
        setExtractedRecipe(checkpoint.extractedRecipe || null);
        setDuplicates(checkpoint.duplicates || []);
        setSourceType(checkpoint.sourceType || "unknown");
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
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadRecipes(),
        loadCategories(),
        loadCollections(),
        loadIngredientImages()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Fehler beim Laden der Daten. Bitte Seite neu laden.");
    }
  };

  // ============================================
  // RECIPES
  // ============================================
  const loadRecipes = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, recipes: true }));
    try {
      const data = await Recipe.list("-updated_date");
      setRecipes(data);
    } catch (err) {
      console.error("Error loading recipes:", err);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, recipes: false }));
    }
  }, []);

  const createRecipe = useCallback(async (recipeData) => {
    const newRecipe = await Recipe.create(recipeData);
    setRecipes(prev => [newRecipe, ...prev]);
    return newRecipe;
  }, []);

  const updateRecipe = useCallback(async (id, updates) => {
    const updated = await Recipe.update(id, updates);
    setRecipes(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const deleteRecipe = useCallback(async (id) => {
    await Recipe.update(id, { deleted: true, deleted_date: new Date().toISOString() });
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: true, deleted_date: new Date().toISOString() } : r));
  }, []);

  const restoreRecipe = useCallback(async (id) => {
    await Recipe.update(id, { deleted: false, deleted_date: null });
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, deleted: false, deleted_date: null } : r));
  }, []);

  const permanentlyDeleteRecipe = useCallback(async (id) => {
    await Recipe.delete(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  // ============================================
  // CATEGORIES
  // ============================================
  const loadCategories = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const data = await RecipeCategory.list("order");
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    const newCategory = await RecipeCategory.create(categoryData);
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, []);

  const updateCategory = useCallback(async (id, updates) => {
    const updated = await RecipeCategory.update(id, updates);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await RecipeCategory.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // ============================================
  // COLLECTIONS
  // ============================================
  const loadCollections = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, collections: true }));
    try {
      const data = await RecipeCollection.list("-created_date");
      setCollections(data);
    } catch (err) {
      console.error("Error loading collections:", err);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, collections: false }));
    }
  }, []);

  const createCollection = useCallback(async (collectionData) => {
    const newCollection = await RecipeCollection.create(collectionData);
    setCollections(prev => [...prev, newCollection]);
    return newCollection;
  }, []);

  const updateCollection = useCallback(async (id, updates) => {
    const updated = await RecipeCollection.update(id, updates);
    setCollections(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCollection = useCallback(async (id) => {
    await RecipeCollection.delete(id);
    setCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  // ============================================
  // INGREDIENT IMAGES
  // ============================================
  const loadIngredientImages = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, ingredientImages: true }));
    try {
      const data = await IngredientImage.list("-created_date");
      setIngredientImages(data);
    } catch (err) {
      console.error("Error loading ingredient images:", err);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, ingredientImages: false }));
    }
  }, []);

  const refreshIngredientImages = useCallback(async () => {
    await loadIngredientImages();
  }, [loadIngredientImages]);

  const createIngredientImage = useCallback(async (imageData) => {
    const newImage = await IngredientImage.create(imageData);
    setIngredientImages(prev => [newImage, ...prev]);
    return newImage;
  }, []);

  const updateIngredientImage = useCallback(async (id, updates) => {
    const updated = await IngredientImage.update(id, updates);
    setIngredientImages(prev => prev.map(img => img.id === id ? updated : img));
    return updated;
  }, []);

  const deleteIngredientImage = useCallback(async (id) => {
    await IngredientImage.delete(id);
    setIngredientImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // ============================================
  // IMPORT PROCESS HANDLERS (MOVED FROM useImportPipeline)
  // ============================================
  
  // STEP 1: TEXT EXTRACTION & STRUCTURING
  const handleImport = useCallback(async (input, sourceStrategy, importSourceType) => {
    // CRITICAL VALIDATION: Ensure input is valid
    if (!input) {
      setImportError("Keine Eingabe erhalten. Bitte versuche es erneut.");
      return;
    }

    setInputData(input);
    setSourceType(importSourceType);
    setIsProcessing(true);
    setImportError(null);
    setCurrentStage(STAGES.PROCESSING);
    setProgress({ stage: "start", message: "Starte Import...", progress: 0 });

    try {
      // EXTRACT RAW TEXT (Strategy Pattern)
      const rawText = await sourceStrategy.extractRawText(input, setProgress);
      
      // VALIDATE RAW TEXT
      if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
        throw new Error("Kein Text konnte extrahiert werden. Bitte überprüfe die Quelldatei.");
      }
      
      // NORMALIZE TEXT
      setProgress({ stage: "normalize", message: "Normalisiere Text...", progress: 55 });
      const normalizedText = normalizeRawText(rawText);
      
      // STRUCTURE TEXT
      setProgress({ stage: "structure", message: "Strukturiere Text...", progress: 60 });
      const structuringPrompt = getStructuringPrompt(normalizedText);
      
      const structuredTextResult = await retryWithBackoff(async () => {
        return await InvokeLLM({
          prompt: structuringPrompt,
          add_context_from_internet: false
        });
      }, 2, 3000);
      
      // VALIDATE STRUCTURED TEXT
      if (!structuredTextResult || typeof structuredTextResult !== 'string' || structuredTextResult.trim() === '') {
        throw new Error("Text-Strukturierung fehlgeschlagen. Das AI-Modell konnte keinen strukturierten Text erstellen.");
      }
      
      // CALCULATE OCR METADATA
      const metadata = extractMetadataFromOCRText(structuredTextResult);
      
      // STORE AND MOVE TO OCR REVIEW STAGE
      setStructuredText(structuredTextResult);
      setOcrMetadata(metadata);
      setCurrentStage(STAGES.OCR_REVIEW);
      setProgress({ stage: "ocr_complete", message: "Text erfolgreich extrahiert!", progress: 100 });

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
    // CRITICAL VALIDATION: Ensure reviewed text is valid
    if (!reviewedText || typeof reviewedText !== 'string' || reviewedText.trim() === '') {
      setImportError("Kein Text zum Verarbeiten. Bitte überprüfe den extrahierten Text.");
      return;
    }

    setIsProcessing(true);
    setImportError(null);
    setCurrentStage(STAGES.EXTRACTING);
    setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 0 });

    try {
      // PREPARE CATEGORIES
      const categoriesByType = {
        meal: categories.filter(c => c.category_type === "meal"),
        gang: categories.filter(c => c.category_type === "gang"),
        cuisine: categories.filter(c => c.category_type === "cuisine")
      };
      
      // LOAD MAIN INGREDIENTS
      const mainIngredients = await MainIngredient.list();
      
      // EXTRACT RECIPE DATA
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
          ingredients: { type: "array", items: { type: "object" } },
          ingredient_groups: { type: "array", items: { type: "object" } },
          instructions: { type: "array", items: { type: "object" } },
          instruction_groups: { type: "array", items: { type: "object" } },
          tags: { type: "array", items: { type: "string" } },
          confidence_scores: { type: "object" }
        }
      };

      setProgress({ stage: "extract", message: "KI analysiert Rezept...", progress: 40 });
      const result = await retryWithBackoff(async () => {
        return await InvokeLLM({
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
      const allRecipes = await Recipe.list();
      const potentialDuplicates = findDuplicates(cleanedRecipe, allRecipes, 65);
      
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
  }, [categories]);

  // SAVE RECIPE (after final review)
  const handleSaveRecipe = useCallback(async (finalRecipe, action = "new") => {
    try {
      const processed = await processRecipeImport(finalRecipe, {
        autoGenerateImage: sourceType === "web_url",
        checkDuplicates: false,
        sourceType: sourceType,
        sourceUrl: typeof inputData === 'string' ? inputData : inputData?.name,
        onProgress: null
      });

      if (!processed.success) throw new Error(processed.error);

      let saveResult;
      if (action === "new") {
        saveResult = await saveProcessedRecipe(processed, "new");
      } else if (action === "merge" && duplicates[0]) {
        saveResult = await saveProcessedRecipe(processed, "merge", duplicates[0].recipe.id);
      } else if (action === "replace" && duplicates[0]) {
        saveResult = await saveProcessedRecipe(processed, "replace", duplicates[0].recipe.id);
      }

      if (!saveResult.success) throw new Error(saveResult.error);

      CheckpointManager.clearCheckpoint();
      setCurrentStage(STAGES.COMPLETE);
      
      // Reload recipes to reflect the new addition
      await loadRecipes();
      
      navigate(createPageUrl("Browse"));

    } catch (err) {
      setImportError(err.message);
    }
  }, [sourceType, inputData, duplicates, navigate, loadRecipes]);

  // CANCEL HANDLERS
  const handleCancelOCRReview = useCallback(() => {
    CheckpointManager.clearCheckpoint();
    setStructuredText("");
    setOcrMetadata(null);
    setSourceType("unknown");
    setCurrentStage(STAGES.INPUT);
  }, []);

  const handleCancelRecipeReview = useCallback(() => {
    CheckpointManager.clearCheckpoint();
    setExtractedRecipe(null);
    setDuplicates([]);
    setSourceType("unknown");
    setCurrentStage(STAGES.INPUT);
  }, []);

  // RESET IMPORT PROCESS
  const resetImportProcess = useCallback(() => {
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
    CheckpointManager.clearCheckpoint();
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
    
    // Loading states
    isLoading,
    error,
    
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

    // Import Process State
    currentStage,
    isProcessing,
    progress,
    importError,
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
    setError: setImportError
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook für Kategorien (für Sidebar)
export const useCategories = () => {
  const { categoriesByType, recipeCounts, isLoading } = useApp();
  return {
    categories: categoriesByType,
    recipeCounts,
    isLoading: isLoading.categories
  };
};