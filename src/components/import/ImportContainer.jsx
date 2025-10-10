
/**
 * UNIFIED IMPORT CONTAINER
 * Orchestrates the entire import pipeline using Strategy Pattern
 * Replaces duplicated logic from ImportFileUpload and ImportWebUrl
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { 
  normalizeRawText,
  getStructuringPrompt,
  getExtractionPrompt,
  validateAndCleanRecipeData,
  findDuplicates,
  retryWithBackoff,
  extractMetadataFromOCRText
} from "./importHelpers";
import { processRecipeImport, saveProcessedRecipe } from "./unifiedImportPipeline";
import RecipeReviewDialog from "./RecipeReviewDialog";

// ============================================
// STAGES
// ============================================
const STAGES = {
  INPUT: "input",
  PROCESSING: "processing",
  REVIEW: "review",
  COMPLETE: "complete"
};

export default function ImportContainer({ 
  sourceStrategy, 
  inputComponent: InputComponent,
  sourceType = "unknown"
}) {
  const navigate = useNavigate();
  
  const [currentStage, setCurrentStage] = useState(STAGES.INPUT);
  const [inputData, setInputData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", message: "", progress: 0 });
  const [error, setError] = useState(null);
  
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [mainIngredients, setMainIngredients] = useState([]);

  useEffect(() => {
    loadCategories();
    loadMainIngredients();
  }, []);

  const loadCategories = async () => {
    const cats = await RecipeCategory.list("name");
    setCategories(cats);
  };

  const loadMainIngredients = async () => {
    const ingredients = await MainIngredient.list("name");
    setMainIngredients(ingredients);
  };

  // ============================================
  // UNIFIED IMPORT PIPELINE
  // ============================================
  const handleImport = async (input) => {
    setInputData(input);
    setIsProcessing(true);
    setError(null);
    setCurrentStage(STAGES.PROCESSING);
    setProgress({ stage: "start", message: "Starte Import...", progress: 0 });

    try {
      // STEP 1: EXTRACT RAW TEXT (Strategy Pattern)
      const rawText = await sourceStrategy.extractRawText(input, setProgress);
      
      // STEP 2: NORMALIZE TEXT
      setProgress({ stage: "normalize", message: "Normalisiere Text...", progress: 55 });
      const normalizedText = normalizeRawText(rawText);
      
      // STEP 3: STRUCTURE TEXT
      setProgress({ stage: "structure", message: "Strukturiere Text...", progress: 60 });
      const structuringPrompt = getStructuringPrompt(normalizedText);
      
      const structuredText = await retryWithBackoff(async () => {
        return await InvokeLLM({
          prompt: structuringPrompt,
          add_context_from_internet: false
        });
      }, 2, 3000);
      
      // STEP 4: EXTRACT RECIPE DATA
      setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 70 });
      
      const categoriesByType = {
        meal: categories.filter(c => c.category_type === "meal"),
        gang: categories.filter(c => c.category_type === "gang"),
        cuisine: categories.filter(c => c.category_type === "cuisine")
      };
      
      const extractionPrompt = getExtractionPrompt(structuredText, categoriesByType, mainIngredients);
      
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
      
      setProgress({ stage: "validate", message: "Validiere Daten...", progress: 90 });
      const cleanedRecipe = validateAndCleanRecipeData(result);
      
      // STEP 5: CHECK DUPLICATES
      setProgress({ stage: "duplicates", message: "Prüfe auf Duplikate...", progress: 95 });
      const allRecipes = await Recipe.list();
      const potentialDuplicates = findDuplicates(cleanedRecipe, allRecipes, 65);
      
      setExtractedRecipe(cleanedRecipe);
      setDuplicates(potentialDuplicates);
      setCurrentStage(STAGES.REVIEW);
      setShowReviewDialog(true);
      setProgress({ stage: "complete", message: "Import abgeschlossen!", progress: 100 });

    } catch (err) {
      console.error("Import Error:", err);
      setError(err.message || "Fehler beim Importieren des Rezepts.");
      setCurrentStage(STAGES.INPUT);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRecipe = async (finalRecipe, action = "new") => {
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

      setShowReviewDialog(false);
      setCurrentStage(STAGES.COMPLETE);
      navigate(createPageUrl("Browse"));

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <InputComponent 
        onSubmit={handleImport}
        isProcessing={isProcessing}
        progress={progress}
        currentStage={currentStage}
      />

      {showReviewDialog && extractedRecipe && (
        <RecipeReviewDialog
          recipe={extractedRecipe}
          duplicates={duplicates}
          categories={categories}
          mainIngredients={mainIngredients}
          onSave={handleSaveRecipe}
          onCancel={() => {
            setShowReviewDialog(false);
            setExtractedRecipe(null);
            setDuplicates([]);
            setCurrentStage(STAGES.INPUT);
          }}
        />
      )}
    </div>
  );
}
