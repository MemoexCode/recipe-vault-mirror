import { useState, useCallback } from "react";

/**
 * CUSTOM HOOK: useRecipeForm
 * Manages all recipe form state, validation, and business logic
 * Extracted from RecipePreview.jsx for better separation of concerns
 */
export const useRecipeForm = (initialRecipe = {}) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [recipe, setRecipe] = useState({
    title: "",
    description: "",
    image_url: "",
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    servings: 1,
    difficulty: "medium",
    meal_type: "",
    gang: "",
    cuisine: "",
    main_ingredient: "",
    equipment: [],
    ingredients: [],
    ingredient_groups: [],
    instructions: [],
    instruction_groups: [],
    nutrition_per_serving: {},
    tags: [],
    ...initialRecipe
  });

  const [errors, setErrors] = useState({});
  const [showMealTypeWarning, setShowMealTypeWarning] = useState(false);
  const [showGangWarning, setShowGangWarning] = useState(false);

  // ============================================
  // VALIDATION LOGIC
  // ============================================
  const validateRecipe = useCallback(() => {
    const newErrors = {};
    
    if (!recipe.title || recipe.title.trim() === "") {
      newErrors.title = "Titel ist erforderlich";
    }
    
    if (!recipe.meal_type || recipe.meal_type === "") {
      newErrors.meal_type = "Mahlzeittyp ist erforderlich";
      setShowMealTypeWarning(true);
    } else {
      setShowMealTypeWarning(false);
    }
    
    if (!recipe.gang || recipe.gang === "") {
      newErrors.gang = "Gang ist erforderlich";
      setShowGangWarning(true);
    } else {
      setShowGangWarning(false);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [recipe]);

  // ============================================
  // UPDATE HANDLERS
  // ============================================
  const updateField = useCallback((field, value) => {
    setRecipe(prev => ({ ...prev, [field]: value }));
    
    // Clear specific warnings when fields are set
    if (field === "meal_type" && value) {
      setShowMealTypeWarning(false);
      setErrors(prev => {
        const { meal_type, ...rest } = prev;
        return rest;
      });
    }
    if (field === "gang" && value) {
      setShowGangWarning(false);
      setErrors(prev => {
        const { gang, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const updateRecipe = useCallback((updates) => {
    setRecipe(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================
  // INGREDIENT HANDLERS
  // ============================================
  const addIngredient = useCallback(() => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredient_name: "", amount: 0, unit: "", preparation_notes: "" }
      ]
    }));
  }, []);

  const updateIngredient = useCallback((index, field, value) => {
    setRecipe(prev => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: field === "amount" ? (parseFloat(value) || 0) : value
      };
      return { ...prev, ingredients: newIngredients };
    });
  }, []);

  const removeIngredient = useCallback((index) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  }, []);

  // ============================================
  // INSTRUCTION HANDLERS
  // ============================================
  const addInstruction = useCallback(() => {
    setRecipe(prev => ({
      ...prev,
      instructions: [
        ...prev.instructions,
        {
          step_number: prev.instructions.length + 1,
          step_description: "",
          ingredients_for_step: []
        }
      ]
    }));
  }, []);

  const updateInstruction = useCallback((index, field, value) => {
    setRecipe(prev => {
      const newInstructions = [...prev.instructions];
      newInstructions[index] = {
        ...newInstructions[index],
        [field]: value
      };
      return { ...prev, instructions: newInstructions };
    });
  }, []);

  const removeInstruction = useCallback((index) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  }, []);

  // ============================================
  // RESET HANDLER
  // ============================================
  const resetForm = useCallback((newRecipe = {}) => {
    setRecipe({
      title: "",
      description: "",
      image_url: "",
      prep_time_minutes: 0,
      cook_time_minutes: 0,
      servings: 1,
      difficulty: "medium",
      meal_type: "",
      gang: "",
      cuisine: "",
      main_ingredient: "",
      equipment: [],
      ingredients: [],
      ingredient_groups: [],
      instructions: [],
      instruction_groups: [],
      nutrition_per_serving: {},
      tags: [],
      ...newRecipe
    });
    setErrors({});
    setShowMealTypeWarning(false);
    setShowGangWarning(false);
  }, []);

  // ============================================
  // RETURN API
  // ============================================
  return {
    // State
    recipe,
    errors,
    showMealTypeWarning,
    showGangWarning,
    
    // Validation
    validateRecipe,
    isValid: Object.keys(errors).length === 0 && recipe.meal_type && recipe.gang,
    
    // Update handlers
    updateField,
    updateRecipe,
    resetForm,
    
    // Ingredient handlers
    addIngredient,
    updateIngredient,
    removeIngredient,
    
    // Instruction handlers
    addInstruction,
    updateInstruction,
    removeInstruction
  };
};