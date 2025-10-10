import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
import { RecipeCollection } from "@/api/entities";
import { IngredientImage } from "@/api/entities";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // ============================================
  // STATE
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
    deleteIngredientImage
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