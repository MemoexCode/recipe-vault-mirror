/**
 * CUSTOM HOOK: useImportPipeline
 * Zweck: Verwaltet den gesamten Import-Zustand und die Import-Logik
 * Ermöglicht die Beibehaltung des Zustands beim Tab-Wechsel
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
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

export const useImportPipeline = (sourceType = "unknown") => {
  const navigate = useNavigate();
  
  const [currentStage, setCurrentStage] = useState(STAGES.INPUT);
  const [inputData, setInputData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", message: "", progress: 0 });
  const [error, setError] = useState(null);
  
  // OCR Review Stage State
  const [structuredText, setStructuredText] = useState("");
  const [ocrMetadata, setOcrMetadata] = useState(null);
  
  // Recipe Review Stage State
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  
  const [categories, setCategories] = useState([]);
  const [mainIngredients, setMainIngredients] = useState([]);

  // ============================================
  // LOAD CHECKPOINT ON MOUNT
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
      }
    });
  }, []);

  // ============================================
  // SAVE CHECKPOINT ON STATE CHANGE
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
      duplicates
    };
    CheckpointManager.saveCheckpoint(checkpoint);
  }, [currentStage, inputData, structuredText, ocrMetadata, extractedRecipe, duplicates]);

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
  // STEP 1: TEXT EXTRACTION & STRUCTURING
  // ============================================
  const handleImport = async (input, sourceStrategy) => {
    // CRITICAL VALIDATION: Ensure input is valid
    if (!input) {
      setError("Keine Eingabe erhalten. Bitte versuche es erneut.");
      return;
    }

    setInputData(input);
    setIsProcessing(true);
    setError(null);
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
      setError(err.message || "Fehler beim Extrahieren des Textes.");
      setCurrentStage(STAGES.INPUT);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // STEP 2: DATA EXTRACTION (after OCR approval)
  // ============================================
  const handleExtraction = async (reviewedText) => {
    // CRITICAL VALIDATION: Ensure reviewed text is valid
    if (!reviewedText || typeof reviewedText !== 'string' || reviewedText.trim() === '') {
      setError("Kein Text zum Verarbeiten. Bitte überprüfe den extrahierten Text.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStage(STAGES.EXTRACTING);
    setProgress({ stage: "extract", message: "Extrahiere Rezeptdaten...", progress: 0 });

    try {
      // PREPARE CATEGORIES
      const categoriesByType = {
        meal: categories.filter(c => c.category_type === "meal"),
        gang: categories.filter(c => c.category_type === "gang"),
        cuisine: categories.filter(c => c.category_type === "cuisine")
      };
      
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
      setError(err.message || "Fehler beim Extrahieren der Rezeptdaten.");
      setCurrentStage(STAGES.OCR_REVIEW);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // SAVE RECIPE (after final review)
  // ============================================
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

      CheckpointManager.clearCheckpoint();
      setCurrentStage(STAGES.COMPLETE);
      navigate(createPageUrl("Browse"));

    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // CANCEL HANDLERS
  // ============================================
  const handleCancelOCRReview = () => {
    CheckpointManager.clearCheckpoint();
    setStructuredText("");
    setOcrMetadata(null);
    setCurrentStage(STAGES.INPUT);
  };

  const handleCancelRecipeReview = () => {
    CheckpointManager.clearCheckpoint();
    setExtractedRecipe(null);
    setDuplicates([]);
    setCurrentStage(STAGES.INPUT);
  };

  // ============================================
  // RETURN API
  // ============================================
  return {
    // State
    currentStage,
    isProcessing,
    progress,
    error,
    structuredText,
    ocrMetadata,
    extractedRecipe,
    duplicates,
    categories,
    mainIngredients,
    
    // Handlers
    handleImport,
    handleExtraction,
    handleSaveRecipe,
    handleCancelOCRReview,
    handleCancelRecipeReview,
    setError,
    
    // Constants
    STAGES
  };
};