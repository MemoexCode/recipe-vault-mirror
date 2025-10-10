/**
 * Automatische Erkennung von Zutaten in Zubereitungsschritten
 * Für Rezepte, die keine ingredients_for_step Daten haben
 */

/**
 * Extrahiert Zutatennamen aus einem Zubereitungsschritt
 * Nutzt einfaches String-Matching gegen verfügbare Zutaten
 */
export const detectIngredientsInStep = (stepDescription, availableIngredients) => {
  if (!stepDescription || !availableIngredients || availableIngredients.length === 0) {
    return [];
  }

  const normalizedStep = stepDescription.toLowerCase();
  const detectedIngredients = [];

  // Durchsuche alle verfügbaren Zutaten
  for (const ingredient of availableIngredients) {
    const ingredientName = ingredient.ingredient_name.toLowerCase();
    
    // Prüfe ob Zutat im Text vorkommt
    // Nutze Wort-Grenzen für präziseres Matching
    const regex = new RegExp(`\\b${ingredientName}\\b`, 'i');
    
    if (regex.test(normalizedStep)) {
      detectedIngredients.push(ingredient.ingredient_name);
    }
    
    // Prüfe auch Teilwörter (z.B. "Tomate" in "Tomaten")
    if (normalizedStep.includes(ingredientName)) {
      if (!detectedIngredients.includes(ingredient.ingredient_name)) {
        detectedIngredients.push(ingredient.ingredient_name);
      }
    }
  }

  return detectedIngredients;
};

/**
 * Erweitert Rezept-Instructions um fehlende ingredients_for_step
 * Nutzt intelligente String-Erkennung
 */
export const enrichInstructionsWithIngredients = (recipe) => {
  // Sammle alle verfügbaren Zutaten
  let allIngredients = [];
  
  if (recipe.ingredient_groups && recipe.ingredient_groups.length > 0) {
    recipe.ingredient_groups.forEach(group => {
      if (group.ingredients) {
        allIngredients.push(...group.ingredients);
      }
    });
  } else if (recipe.ingredients) {
    allIngredients = recipe.ingredients;
  }

  // Verarbeite instruction_groups
  if (recipe.instruction_groups && recipe.instruction_groups.length > 0) {
    recipe.instruction_groups = recipe.instruction_groups.map(group => ({
      ...group,
      instructions: group.instructions.map(instruction => {
        // Wenn bereits vorhanden, behalte sie
        if (instruction.ingredients_for_step && instruction.ingredients_for_step.length > 0) {
          return instruction;
        }
        
        // Sonst: automatisch erkennen
        const detected = detectIngredientsInStep(instruction.step_description, allIngredients);
        return {
          ...instruction,
          ingredients_for_step: detected
        };
      })
    }));
  }
  
  // Verarbeite flache instructions
  if (recipe.instructions && recipe.instructions.length > 0) {
    recipe.instructions = recipe.instructions.map(instruction => {
      if (instruction.ingredients_for_step && instruction.ingredients_for_step.length > 0) {
        return instruction;
      }
      
      const detected = detectIngredientsInStep(instruction.step_description, allIngredients);
      return {
        ...instruction,
        ingredients_for_step: detected
      };
    });
  }

  return recipe;
};