
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
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
import {
  saveSessionData,
  loadSessionData,
  clearExpiredSessions
} from "../utils/sessionStore";


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
  // ============================================
  // RECIPE/CATEGORY/COLLECTION STATE
  // ============================================
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [ingredientImages, setIngredientImages] = useState([]);
  const [shoppingLists, setShoppingLists] = useState([]);

  const [isLoading, setIsLoading] = useState({
    recipes: true,
    categories: true,
    collections: true,
    ingredientImages: true,
    shoppingLists: true
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
    // Bereinige abgelaufene Sessions beim App-Start
    clearExpiredSessions();
    
    CheckpointManager.loadCheckpoint((checkpoint) => {
      if (checkpoint) {
        console.log("Checkpoint loaded:", checkpoint);
        
        // Prüfe Checkpoint-Alter
        const age = CheckpointManager.getCheckpointAge();
        if (age > 12 * 60 * 60 * 1000) { // 12 Stunden
          showInfo("Import-Zwischenspeicher älter als 12 Stunden. Import wurde zurückgesetzt.");
          CheckpointManager.clearCheckpoint();
          return;
        }
        
        // Migriere Checkpoint-Daten (alte Keys → neue Keys)
        const migratedCheckpoint = migrateCheckpoint(checkpoint);
        
        setCurrentStage(migratedCheckpoint.currentStage || STAGES.INPUT);
        setInputData(migratedCheckpoint.inputData || null);
        setStructuredText(migratedCheckpoint.structuredText || "");
        setOcrMetadata(migratedCheckpoint.ocrMetadata || null);
        setExtractedRecipe(migratedCheckpoint.extractedRecipe || null);
        setDuplicates(migratedCheckpoint.duplicates || []);
        setSourceType(migratedCheckpoint.sourceType || "unknown");
        
        showInfo("Letzter Importfortschritt wiederhergestellt");
        logInfo("Import checkpoint restored successfully", 'ImportRecovery');
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
  // RECIPES (WITH SESSION RECOVERY)
  // ============================================
  const loadRecipes = useCallback(async () => {
    // Versuche zuerst aus Cache zu laden
    const cachedRecipes = loadSessionData('recipes');
    if (cachedRecipes) {
      setRecipes(cachedRecipes);
      setIsLoading(prev => ({ ...prev, recipes: false }));
      
      // TOAST CONTROL: Nur einmal pro Session anzeigen
      const cacheToastShown = sessionStorage.getItem('rv_cache_toast_shown');
      if (!cacheToastShown) {
        showInfo('Daten aus Zwischenspeicher geladen');
        sessionStorage.setItem('rv_cache_toast_shown', 'true');
      }
      
      logInfo(`Loaded ${cachedRecipes.length} recipes from session cache`, 'SessionRecovery');
      
      // DEAKTIVIERT: Background refresh um Rate Limit zu vermeiden
      // Refresh nur auf manuellen Trigger oder nach längerer Zeit (>5 Min)
      
      return;
    }

    // Keine Cache-Daten → normales Laden
    setIsLoading(prev => ({ ...prev, recipes: true }));
    try {
      const data = await http.entityList('Recipe', '-created_date', 1000);
      setRecipes(data || []);
      saveSessionData('recipes', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} recipes from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError(err.message);
      showError("Fehler beim Laden der Rezepte.");
      logError(err, 'AppContext');

      // Add silent auth flow handling
      // Check if the error is due to an authentication issue (e.g., 401 Unauthorized)
      // This assumes that if a 401 reaches this point, automatic token refresh
      // or re-attempt by the http client (e.g., via interceptors) has already failed.
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        // Redirect to login page to re-initiate the authentication flow
        window.location.href = "/login";
      }
    } finally {
      setIsLoading(prev => ({ ...prev, recipes: false }));
    }
  }, []);

  const createRecipe = useCallback(async (recipeData) => {
    try {
      const newRecipe = await http.entityCreate('Recipe', recipeData);
      
      // Wenn offline ge-queued (newRecipe ist null)
      if (!newRecipe) {
        // Optimistic update for UI, but actual persistence is pending
        const tempId = `temp-${Date.now()}`; // Assign a temporary ID
        const optimisticRecipe = { ...recipeData, id: tempId, created_date: new Date().toISOString() };
        setRecipes(prev => {
          const updated = [optimisticRecipe, ...prev];
          saveSessionData('recipes', updated, 12 * 60 * 60 * 1000);
          return updated;
        });
        showInfo("Rezept wurde zur Offline-Synchronisation vorgemerkt.");
        return optimisticRecipe; // Return the optimistic recipe
      }
      
      setRecipes(prev => {
        const updated = [newRecipe, ...prev];
        saveSessionData('recipes', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
      
      // Wenn offline ge-queued
      if (!updated) {
        // Optimistic Update im Local State
        setRecipes(prev => {
          const optimistic = prev.map(r => r.id === id ? { ...r, ...updates } : r);
          saveSessionData('recipes', optimistic, 12 * 60 * 60 * 1000);
          return optimistic;
        });
        showInfo("Rezeptänderungen zur Offline-Synchronisation vorgemerkt.");
        return null; // Indicates it's an optimistic update, actual update pending
      }
      
      setRecipes(prev => {
        const updatedList = prev.map(r => r.id === id ? updated : r);
        saveSessionData('recipes', updatedList, 12 * 60 * 60 * 1000);
        return updatedList;
      });
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
      setRecipes(prev => {
        const updated = prev.map(r => r.id === id ? { ...r, deleted: true, deleted_date: new Date().toISOString() } : r);
        saveSessionData('recipes', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
      setRecipes(prev => {
        const updated = prev.map(r => r.id === id ? { ...r, deleted: false, deleted_date: null } : r);
        saveSessionData('recipes', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
      setRecipes(prev => {
        const updated = prev.filter(r => r.id !== id);
        saveSessionData('recipes', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
      showSuccess("Rezept endgültig gelöscht.");
    } catch (err) {
      console.error('Failed to permanently delete recipe:', err);
      showError("Fehler beim endgültigen Löschen.");
      throw err;
    }
  }, []);

  // ============================================
  // CATEGORIES (WITH SESSION RECOVERY)
  // ============================================
  const loadCategories = useCallback(async () => {
    // Cache-Check
    const cachedCategories = loadSessionData('categories');
    if (cachedCategories) {
      setCategories(cachedCategories);
      setIsLoading(prev => ({ ...prev, categories: false }));
      logInfo('Categories loaded from session cache', 'SessionRecovery');
      
      // DEAKTIVIERT: Background refresh
      
      return;
    }

    setIsLoading(prev => ({ ...prev, categories: true }));
    try {
      const data = await http.entityList('RecipeCategory', 'name', 100);
      setCategories(data || []);
      saveSessionData('categories', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} categories from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load categories:', err);
      showError("Fehler beim Laden der Kategorien.");
      logError(err, 'AppContext');
      // Handle authentication errors
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
    } finally {
      setIsLoading(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    try {
      const newCategory = await http.entityCreate('RecipeCategory', categoryData);
      setCategories(prev => {
        const updated = [...prev, newCategory];
        saveSessionData('categories', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
      setCategories(prev => {
        const updatedList = prev.map(c => c.id === id ? updated : c);
        saveSessionData('categories', updatedList, 12 * 60 * 60 * 1000);
        return updatedList;
      });
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
      setCategories(prev => {
        const updated = prev.filter(c => c.id !== id);
        saveSessionData('categories', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
      showSuccess("Kategorie erfolgreich gelöscht!");
    } catch (err) {
      console.error('Failed to delete category:', err);
      showError("Fehler beim Löschen der Kategorie.");
      throw err;
    }
  }, []);

  // ============================================
  // COLLECTIONS (WITH SESSION RECOVERY)
  // ============================================
  const loadCollections = useCallback(async () => {
    // Cache-Check
    const cachedCollections = loadSessionData('collections');
    if (cachedCollections) {
      setCollections(cachedCollections);
      setIsLoading(prev => ({ ...prev, collections: false }));
      logInfo('Collections loaded from session cache', 'SessionRecovery');
      
      // DEAKTIVIERT: Background refresh
      
      return;
    }

    setIsLoading(prev => ({ ...prev, collections: true }));
    try {
      const data = await http.entityList('RecipeCollection', '-created_date', 100);
      setCollections(data || []);
      saveSessionData('collections', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} collections from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load collections:', err);
      showError("Fehler beim Laden der Kollektionen.");
      // Handle authentication errors
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
    } finally {
      setIsLoading(prev => ({ ...prev, collections: false }));
    }
  }, []);

  const createCollection = useCallback(async (collectionData) => {
    try {
      const newCollection = await http.entityCreate('RecipeCollection', collectionData);
      setCollections(prev => {
        const updated = [...prev, newCollection];
        saveSessionData('collections', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
      setCollections(prev => {
        const updatedList = prev.map(c => c.id === id ? updated : c);
        saveSessionData('collections', updatedList, 12 * 60 * 60 * 1000);
        return updatedList;
      });
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
      setCollections(prev => {
        const updated = prev.filter(c => c.id !== id);
        saveSessionData('collections', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
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
    const cachedImages = loadSessionData('ingredientImages');
    if (cachedImages) {
      setIngredientImages(cachedImages);
      setIsLoading(prev => ({ ...prev, ingredientImages: false }));
      logInfo('Ingredient images loaded from session cache', 'SessionRecovery');
      return;
    }

    setIsLoading(prev => ({ ...prev, ingredientImages: true }));
    try {
      const data = await http.entityList('IngredientImage', 'ingredient_name', 500);
      setIngredientImages(data || []);
      saveSessionData('ingredientImages', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} ingredient images from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load ingredient images:', err);
      showError("Fehler beim Laden der Zutatenbilder.");
      // Handle authentication errors
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
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
  // MAIN INGREDIENTS (WITH CACHING)
  // ============================================
  const loadMainIngredients = useCallback(async () => {
    // Cache-Check
    const cachedIngredients = loadSessionData('mainIngredients');
    if (cachedIngredients) {
      setMainIngredients(cachedIngredients);
      logInfo('Main ingredients loaded from session cache', 'SessionRecovery');
      
      // DEAKTIVIERT: Background refresh
      
      return;
    }

    // Keine Cache-Daten → normales Laden
    try {
      const data = await http.entityList('MainIngredient', 'name', 500);
      setMainIngredients(data || []);
      saveSessionData('mainIngredients', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} main ingredients from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load main ingredients:', err);
      showError("Fehler beim Laden der Hauptzutaten.");
      logError(err, 'AppContext');
      // Handle authentication errors
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
    }
  }, []);

  // ============================================
  // SHOPPING LISTS (WITH SESSION RECOVERY)
  // ============================================
  const loadShoppingLists = useCallback(async () => {
    // Cache-Check
    const cachedLists = loadSessionData('shoppingLists');
    if (cachedLists) {
      setShoppingLists(cachedLists);
      setIsLoading(prev => ({ ...prev, shoppingLists: false }));
      logInfo('Shopping lists loaded from session cache', 'SessionRecovery');
      
      // DEAKTIVIERT: Background refresh
      
      return;
    }

    setIsLoading(prev => ({ ...prev, shoppingLists: true }));
    try {
      const data = await http.entityList('ShoppingList', '-created_date', 100);
      setShoppingLists(data || []);
      saveSessionData('shoppingLists', data || [], 12 * 60 * 60 * 1000);
      logInfo(`Loaded ${data?.length || 0} shopping lists from server`, 'SessionRecovery');
    } catch (err) {
      console.error('Failed to load shopping lists:', err);
      showError("Fehler beim Laden der Einkaufslisten.");
      logError(err, 'AppContext');
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected. User session might have expired. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
    } finally {
      setIsLoading(prev => ({ ...prev, shoppingLists: false }));
    }
  }, []);

  const createShoppingList = useCallback(async (listData) => {
    try {
      const newList = await http.entityCreate('ShoppingList', listData);
      if (!newList) {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticList = { ...listData, id: tempId, created_date: new Date().toISOString() };
        setShoppingLists(prev => {
          const updated = [optimisticList, ...prev];
          saveSessionData('shoppingLists', updated, 12 * 60 * 60 * 1000);
          return updated;
        });
        showInfo("Einkaufsliste zur Offline-Synchronisation vorgemerkt.");
        return optimisticList;
      }
      
      setShoppingLists(prev => {
        const updated = [newList, ...prev];
        saveSessionData('shoppingLists', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
      showSuccess("Einkaufsliste erfolgreich erstellt!");
      return newList;
    } catch (err) {
      console.error('Failed to create shopping list:', err);
      showError("Fehler beim Erstellen der Einkaufsliste.");
      throw err;
    }
  }, []);

  const updateShoppingList = useCallback(async (id, updates) => {
    try {
      const updated = await http.entityUpdate('ShoppingList', id, updates);
      
      if (!updated) {
        // Optimistic Update
        setShoppingLists(prev => {
          const optimistic = prev.map(l => l.id === id ? { ...l, ...updates } : l);
          saveSessionData('shoppingLists', optimistic, 12 * 60 * 60 * 1000);
          return optimistic;
        });
        showInfo("Änderungen zur Offline-Synchronisation vorgemerkt.");
        return null;
      }
      
      setShoppingLists(prev => {
        const updatedList = prev.map(l => l.id === id ? updated : l);
        saveSessionData('shoppingLists', updatedList, 12 * 60 * 60 * 1000);
        return updatedList;
      });
      showSuccess("Einkaufsliste erfolgreich aktualisiert!");
      return updated;
    } catch (err) {
      console.error('Failed to update shopping list:', err);
      showError("Fehler beim Aktualisieren der Einkaufsliste.");
      throw err;
    }
  }, []);

  const deleteShoppingList = useCallback(async (id) => {
    try {
      await http.entityDelete('ShoppingList', id);
      setShoppingLists(prev => {
        const updated = prev.filter(l => l.id !== id);
        saveSessionData('shoppingLists', updated, 12 * 60 * 60 * 1000);
        return updated;
      });
      showSuccess("Einkaufsliste erfolgreich gelöscht!");
    } catch (err) {
      console.error('Failed to delete shopping list:', err);
      showError("Fehler beim Löschen der Einkaufsliste.");
      throw err;
    }
  }, []);

  // ============================================
  // INITIAL DATA LOAD (SEQUENTIELL MIT LANGEN DELAYS)
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      // 1. Kritische Daten parallel laden
      await Promise.all([
        loadRecipes(),
        loadCategories()
      ]);
      
      // 2. Warte 3 Sekunden vor nächster Gruppe
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadCollections();
      
      // 3. Warte weitere 3 Sekunden
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadIngredientImages();
      
      // 4. Warte weitere 3 Sekunden
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadMainIngredients();
      
      // 5. Shopping Lists nur wenn auf der Page
      // Wird später lazy geladen wenn User die Seite besucht
    };

    loadData();
  }, [loadRecipes, loadCategories, loadCollections, loadIngredientImages, loadMainIngredients]);

  // Lazy load shopping lists nur wenn benötigt
  useEffect(() => {
    if (window.location.pathname.includes('ShoppingList')) {
      loadShoppingLists();
    }
  }, [loadShoppingLists]);

  // ============================================
  // GLOBAL ERROR HANDLERS (REGISTERED ONCE)
  // ============================================
  useEffect(() => {
    // Already registered in layout.jsx via registerGlobalErrorHandlers()
    // No need to duplicate here
  }, []);

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
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected during import processing. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
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
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected during data extraction. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
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
        window.location.href = createPageUrl("Browse");
      }, 1000);


    } catch (err) {
      console.error("Save failed:", err);
      const errorMsg = err.message || "Fehler beim Speichern. Bitte erneut versuchen.";
      setImportError(errorMsg);
      showError(errorMsg);
      logError(err, 'IMPORT_SAVE');
      if (err.response && err.response.status === 401) {
        logWarn("Authentication error (401) detected during recipe save. Navigating to login.", 'AUTH');
        showInfo("Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.");
        window.location.href = "/login";
      }
    } finally {
      setIsProcessing(false);
    }
  }, [sourceType, inputData, duplicates, loadRecipes, resetImportProcess]);

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
    shoppingLists,

    // Loading states
    isLoading,
    setError, // Directly exposed for general app errors

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

    // Shopping List actions
    loadShoppingLists,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,

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
