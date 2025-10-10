
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
import { Globe, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

import { processRecipeImport, saveProcessedRecipe } from "./unifiedImportPipeline";
import { validateAndCleanRecipeData, findDuplicates, getExtractionPrompt, retryWithBackoff } from "./importHelpers";
import RecipeReviewDialog from "./RecipeReviewDialog";

// ============================================
// RAW TEXT NORMALIZATION - NUR GRUNDLEGENDE CLEANUP
// ============================================
const normalizeRawText = (rawText) => {
  if (!rawText) return rawText;
  
  let normalized = rawText;
  
  // Bulletpoints und Layout-Symbole entfernen
  normalized = normalized.replace(/[•●○▪▫■□◆◇\-–—\*]/g, ' ');
  
  // Mehrfache Leerzeichen reduzieren
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Fehlende Punkte am Zeilenende ergänzen
  normalized = normalized.replace(/([a-zäöüß0-9])\s*\n\s*([A-ZÄÖÜ])/g, '$1.\n$2');
  
  // Fehlende Punkte zwischen Sätzen ergänzen
  normalized = normalized.replace(/([a-zäöüß0-9])\s+([A-ZÄÖÜ])/g, '$1. $2');
  
  // Mehrfache Zeilenumbrüche reduzieren
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  return normalized.trim();
};

// ============================================
// STRUCTURING PROMPT - IMPORTIERT AUS importHelpers
// ============================================
const getStructuringPrompt = (rawText) => {
  return `You are an expert in structuring and analyzing recipe texts.

**ABSOLUTELY CRITICAL - THESE RULES ARE NON-NEGOTIABLE:**

1. **NO REPHRASING**: Copy every sentence WORD FOR WORD. Do NOT change ANY wording.
2. **NO CORRECTIONS**: Leave all spelling, grammar, and OCR errors as they are. 1:1 copy.
3. **NO OMISSIONS**: Every single word must appear in the output.

**Your tasks:**

A) **ADD STRUCTURAL TAGS WITH CLOSING TAGS:**
   - [H1]Title Text[/H1] for the main title
   - [H2]Section Name[/H2] for main sections
   - [H3]Subsection Name[/H3] for sub-sections
   - IMPORTANT: Always use both opening and closing tags!

B) **ESTIMATE MISSING INFORMATION:**
   - **Servings**: If no serving size is mentioned, estimate based on ingredients. Add: [PORTIONS: X]
   - **Times**: If no times mentioned, estimate based on complexity. Add: [PREP_TIME: X minutes] [COOK_TIME: X minutes]
   - **IMPORTANT**: Do NOT delete any original text

C) **INTELLIGENT STEP SEPARATION (for instructions only):**
   - **Combine related actions** into ONE logical step
   - **Separate** only at clear workflow breaks
   - Number each logical step: "1. [STEP] 2. [STEP]"
   - COPY original text EXACTLY

**Raw Text:**
${rawText}

**Return ONLY the structured text with tags and estimates, no comments.**`;
};

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
      // STEP 2: NORMALIZE (nur Cleanup)
      // ============================================
      const normalizedText = normalizeRawText(rawText);

      // ============================================
      // STEP 3: STRUCTURE (H-Tags, Schätzungen, Schritte)
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
