import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { InvokeLLM, ExtractDataFromUploadedFile } from "@/api/integrations";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

import { processRecipeImport, saveProcessedRecipe } from "./unifiedImportPipeline";
import { 
  validateAndCleanRecipeData, 
  findDuplicates, 
  getExtractionPrompt, 
  retryWithBackoff,
  getStructuringPrompt,
  normalizeRawText
} from "./importHelpers";
import RecipeReviewDialog from "./RecipeReviewDialog";

export default function ImportWebUrl() {
  const navigate = useNavigate();
  
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleImportFromWeb = async () => {
    if (!url.trim()) {
      setError("Bitte gib eine gültige URL ein.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // ============================================
      // STEP 1: HTML TEXT EXTRACTION
      // ============================================
      const rawTextSchema = {
        type: "object",
        properties: {
          full_text_content: {
            type: "string",
            description: "Complete text content extracted from the webpage"
          }
        },
        required: ["full_text_content"]
      };

      const extractionResult = await retryWithBackoff(async () => {
        return await ExtractDataFromUploadedFile({
          file_url: url,
          json_schema: rawTextSchema
        });
      }, 3, 4000);

      if (extractionResult.status === "error") {
        throw new Error(extractionResult.details || "Fehler beim Laden der Webseite.");
      }

      const rawText = extractionResult.output?.full_text_content || "";
      if (!rawText || rawText.length < 100) {
        throw new Error("Zu wenig Text von der Webseite extrahiert. Bitte prüfe die URL.");
      }

      // ============================================
      // STEP 2: NORMALIZE (using centralized function)
      // ============================================
      const normalizedText = normalizeRawText(rawText);

      // ============================================
      // STEP 3: STRUCTURE (using centralized function)
      // ============================================
      const structuringPrompt = getStructuringPrompt(normalizedText);

      const structuredText = await retryWithBackoff(async () => {
        return await InvokeLLM({
          prompt: structuringPrompt,
          add_context_from_internet: false
        });
      }, 2, 3000);

      // ============================================
      // STEP 4: JSON EXTRACTION
      // ============================================
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

      const cleanedRecipe = validateAndCleanRecipeData(result);
      
      // ============================================
      // STEP 5: DUPLICATE CHECK
      // ============================================
      const allRecipes = await Recipe.list();
      const potentialDuplicates = findDuplicates(cleanedRecipe, allRecipes, 65);
      
      setExtractedRecipe(cleanedRecipe);
      setDuplicates(potentialDuplicates);
      setShowReviewDialog(true);

    } catch (err) {
      console.error("Web-Import Error:", err);
      setError(err.message || "Fehler beim Importieren des Rezepts.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRecipe = async (finalRecipe, action = "new") => {
    try {
      const processed = await processRecipeImport(finalRecipe, {
        autoGenerateImage: true,
        checkDuplicates: false,
        sourceType: "web_url",
        sourceUrl: url,
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
      navigate(createPageUrl("Browse"));

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800">Von Webseite importieren</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Gib die URL einer Rezept-Webseite ein, um automatisch alle Informationen zu extrahieren.
          </p>

          {error && (
            <Alert variant="destructive" className="rounded-xl mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://www.beispiel.de/rezept"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="rounded-xl text-base"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleImportFromWeb();
                }
              }}
            />
            <Button
              onClick={handleImportFromWeb}
              disabled={isProcessing || !url.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Importieren
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Tipp:</strong> Funktioniert mit den meisten Rezept-Webseiten wie Chefkoch, Essen & Trinken, etc.
            </p>
          </div>
        </CardContent>
      </Card>

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
          }}
        />
      )}
    </div>
  );
}