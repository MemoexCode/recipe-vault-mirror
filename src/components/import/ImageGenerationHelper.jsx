import { GenerateImage } from "@/api/integrations";

/**
 * ANALYZE RECIPE FOR OPTIMIZED IMAGE PROMPT
 */
const analyzeRecipeForPrompt = async (recipe) => {
  const analysis = {
    hasIngredientGroups: recipe.ingredient_groups && recipe.ingredient_groups.length > 0,
    mainIngredients: [],
    cuisineType: recipe.cuisine || "international",
    mealType: recipe.meal_type || "dish",
    gang: recipe.gang || "hauptgericht"
  };

  const allIngredients = [];
  if (analysis.hasIngredientGroups) {
    recipe.ingredient_groups.forEach(group => {
      if (group.ingredients) {
        group.ingredients.forEach(ing => allIngredients.push(ing.ingredient_name));
      }
    });
  } else if (recipe.ingredients) {
    recipe.ingredients.forEach(ing => allIngredients.push(ing.ingredient_name));
  }

  analysis.mainIngredients = allIngredients.slice(0, 5);

  return analysis;
};

/**
 * GENERATE OPTIMIZED IMAGE PROMPT - ENGLISH VERSION
 */
const generateOptimizedPrompt = async (recipe, analysis) => {
  const promptParts = [];

  promptParts.push(recipe.title);

  if (analysis.mainIngredients.length > 0) {
    const ingredientsText = analysis.mainIngredients.slice(0, 3).join(", ");
    promptParts.push(`with ${ingredientsText}`);
  }

  promptParts.push("professional food photography");
  promptParts.push("delicious plated dish");
  promptParts.push("beautifully presented on a white plate");
  promptParts.push("garnished");
  
  if (analysis.gang === "dessert" || analysis.gang === "getränk") {
    promptParts.push("appetizing dessert presentation");
  } else if (analysis.gang === "vorspeise") {
    promptParts.push("elegant appetizer presentation");
  }

  promptParts.push("top-down view");
  promptParts.push("natural lighting");
  promptParts.push("sharp focus");
  promptParts.push("appetizing");
  promptParts.push("high-quality restaurant-style presentation");

  return promptParts.join(", ");
};

/**
 * GENERATE RECIPE IMAGE WITH RETRY LOGIC
 */
export const generateRecipeImage = async (recipe, onRetryUpdate = null) => {
  const maxRetries = 3;
  const baseDelay = 2000;

  const analysis = await analyzeRecipeForPrompt(recipe);
  const prompt = await generateOptimizedPrompt(recipe, analysis);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onRetryUpdate) {
        onRetryUpdate(attempt);
      }

      if (attempt > 1) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const { url } = await GenerateImage({ prompt });
      return url;
    } catch (err) {
      console.error(`Recipe image generation attempt ${attempt}/${maxRetries} failed:`, err);

      if (attempt === maxRetries) {
        throw new Error(`Image generation failed after ${maxRetries} attempts. Please try again later.`);
      }
    }
  }
};

export default {
  generateRecipeImage
};