
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Recipe } from "@/api/entities";
import { RecipeCategory } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { UploadFile, InvokeLLM, ExtractDataFromUploadedFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  compressImage, 
  retryWithBackoff, 
  uploadFileWithRetry, 
  extractMetadataFromOCRText, 
  validateAndCleanRecipeData, 
  findDuplicates, 
  getStructuringPrompt, 
  getExtractionPrompt,
  normalizeRawText // Added to imports, as the function will be moved
} from "./importHelpers";
import { processRecipeImport, saveProcessedRecipe } from "./unifiedImportPipeline";
import BatchUploadZone from "./file-upload/BatchUploadZone";
import OCRReviewStage from "./file-upload/OCRReviewStage";
import ExtractionReviewStage from "./file-upload/ExtractionReviewStage";
import DuplicateCheckStage from "./file-upload/DuplicateCheckStage";
import CheckpointManager from "./file-upload/CheckpointManager";

const STAGES = {
  UPLOAD: "upload",
  OCR_REVIEW: "ocr_review",
  EXTRACTION_REVIEW: "extraction_review",
  DUPLICATE_CHECK: "duplicate_check",
  COMPLETE: "complete"
};

const STAGE_LABELS = {
  [STAGES.UPLOAD]: "Upload",
  [STAGES.OCR_REVIEW]: "Text-Erkennung",
  [STAGES.EXTRACTION_REVIEW]: "Daten-Extraktion",
  [STAGES.DUPLICATE_CHECK]: "Duplikat-Prüfung",
  [STAGES.COMPLETE]: "Fertig"
};

export default function ImportFileUpload() {
  const navigate = useNavigate();
  
  const [currentStage, setCurrentStage] = useState(STAGES.UPLOAD);
  const [batchQueue, setBatchQueue] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const [ocrText, setOcrText] = useState("");
  const [ocrMetadata, setOcrMetadata] = useState(null);
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  
  const [categories, setCategories] = useState([]);
  const [mainIngredients, setMainIngredients] = useState([]);
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);

  // New state variables for extraction progress
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStage, setExtractionStage] = useState("");
  
  const currentFile = batchQueue[currentFileIndex] || null;
  
  useEffect(() => {
    const hasCheckpoint = CheckpointManager.hasCheckpoint();
    if (hasCheckpoint) {
      setShowEmergencyReset(true);
      try {
        CheckpointManager.loadCheckpoint((checkpoint) => {
          if (isProcessing) return;
          const checkpointAge = Date.now() - (checkpoint.timestamp || 0);
          if (checkpointAge > 24 * 60 * 60 * 1000) {
            CheckpointManager.clearCheckpoint();
            setShowEmergencyReset(false);
            return;
          }
          setBatchQueue(checkpoint.batchQueue || []);
          setCurrentFileIndex(checkpoint.currentFileIndex || 0);
          setCurrentStage(checkpoint.currentStage || STAGES.UPLOAD);
          setOcrText(checkpoint.ocrText || "");
          setExtractedRecipe(checkpoint.extractedRecipe || null);
        });
      } catch (err) {
        CheckpointManager.clearCheckpoint();
        setShowEmergencyReset(false);
      }
    }
  }, []);

  const saveCheckpoint = useCallback(() => {
    if (error) return;
    CheckpointManager.saveCheckpoint({
      batchQueue,
      currentFileIndex,
      currentStage,
      ocrText,
      extractedRecipe,
      timestamp: Date.now()
    });
  }, [batchQueue, currentFileIndex, currentStage, ocrText, extractedRecipe, error]);

  useEffect(() => {
    if (isProcessing && !error) {
      const interval = setInterval(saveCheckpoint, 5000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, saveCheckpoint, error]);

  const handleEmergencyReset = () => {
    if (confirm("⚠️ NOTFALL-RESET: Fortfahren?")) {
      CheckpointManager.clearCheckpoint();
      setBatchQueue([]);
      setCurrentFileIndex(0);
      setCurrentStage(STAGES.UPLOAD);
      setOcrText("");
      setOcrMetadata(null);
      setExtractedRecipe(null);
      setConfidenceScores({});
      setDuplicates([]);
      setError(null);
      setIsProcessing(false);
      setShowEmergencyReset(false);
      window.location.reload();
    }
  };
  
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

  const handleBatchUpload = async (files) => {
    // TASK 4: Guard clause for empty files
    if (!files || files.length === 0) {
      setError("Keine Dateien ausgewählt. Bitte Dateien hochladen.");
      return;
    }

    const queue = files.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      file,
      name: file.name,
      status: "pending",
      progress: 0,
      ocrText: null,
      extractedRecipe: null,
      error: null
    }));
    
    setBatchQueue(queue);
    setCurrentFileIndex(0);
    setShowEmergencyReset(true);
    await startOCRProcessing(queue[0]);
  };

  const startOCRProcessing = async (fileItem) => {
    setIsProcessing(true);
    setError(null);
    setCurrentStage(STAGES.OCR_REVIEW);
    
    try {
      updateQueueItem(fileItem.id, { status: "processing", progress: 5 });
      
      // ============================================
      // SCHRITT 1: DATEI HOCHLADEN
      // ============================================
      updateQueueItem(fileItem.id, { progress: 10 });
      
      const result = await uploadFileWithRetry(fileItem.file);
      const file_url = result.file_url;
      
      updateQueueItem(fileItem.id, { progress: 30 });
      
      // ============================================
      // SCHRITT 2: ROHEN TEXT EXTRAHIEREN (OCR)
      // ============================================
      const rawTextSchema = {
        type: "object",
        properties: {
          full_text_content: { 
            type: "string", 
            description: "Complete text content extracted from the file, exactly as it appears" 
          }
        },
        required: ["full_text_content"]
      };
      
      const extractionResult = await retryWithBackoff(async () => {
        return await ExtractDataFromUploadedFile({ file_url, json_schema: rawTextSchema });
      }, 4, 5000);
      
      if (extractionResult.status === "error") {
        throw new Error(extractionResult.details || "Text-Extraktion fehlgeschlagen.");
      }
      
      const rawText = extractionResult.output?.full_text_content || "";
      if (!rawText || rawText.length < 50) {
        throw new Error("Extrahierter Text ist zu kurz oder leer.");
      }
      
      updateQueueItem(fileItem.id, { progress: 50 });
      
      // ============================================
      // SCHRITT 3: TEXT NORMALISIEREN (using centralized function)
      // ============================================
      const normalizedText = normalizeRawText(rawText);
      
      // ============================================
      // SCHRITT 4: TEXT MIT H-TAGS STRUKTURIEREN
      // ============================================
      const structuringPrompt = getStructuringPrompt(normalizedText);
      
      const structuredText = await retryWithBackoff(async () => {
        return await InvokeLLM({ 
          prompt: structuringPrompt, 
          add_context_from_internet: false 
        });
      }, 3, 5000);
      
      updateQueueItem(fileItem.id, { progress: 75, status: "ocr_review" });
      
      // ============================================
      // SCHRITT 5: STRUKTURIERTEN TEXT ANZEIGEN
      // ============================================
      const metadata = extractMetadataFromOCRText(structuredText);
      setOcrText(structuredText);
      setOcrMetadata(metadata);
      updateQueueItem(fileItem.id, { ocrText: structuredText });
      saveCheckpoint();
      
    } catch (err) {
      const userFriendlyMessage = err.message || "Unbekannter Fehler beim OCR-Prozess.";
      setError(userFriendlyMessage);
      updateQueueItem(fileItem.id, { status: "error", error: userFriendlyMessage });
    }
    
    setIsProcessing(false);
  };

  const startExtraction = async (reviewedText) => {
    setIsProcessing(true);
    setError(null);
    setCurrentStage(STAGES.EXTRACTION_REVIEW);
    setExtractionProgress(0);
    setExtractionStage("Starte Datenextraktion...");
    
    try {
      const fileToProcess = batchQueue[currentFileIndex];
      if (!fileToProcess) throw new Error("Kein aktuelles File gefunden.");
      
      updateQueueItem(fileToProcess.id, { status: "processing", progress: 60 });
      
      // ============================================
      // SCHRITT 1: TEXT STRUKTURIEREN
      // ============================================
      setExtractionStage("Strukturiere Text...");
      setExtractionProgress(10);
      
      const structuringPrompt = getStructuringPrompt(reviewedText);
      
      const structuredText = await retryWithBackoff(async () => {
        return await InvokeLLM({ 
          prompt: structuringPrompt, 
          add_context_from_internet: false 
        });
      }, 3, 5000);
      
      updateQueueItem(fileToProcess.id, { progress: 70 });
      setExtractionProgress(40);
      
      // ============================================
      // SCHRITT 2: DATEN EXTRAHIEREN
      // ============================================
      setExtractionStage("Extrahiere Rezeptdaten...");
      
      const categoriesByType = {
        meal: categories.filter(c => c.category_type === "meal"),
        gang: categories.filter(c => c.category_type === "gang"),
        cuisine: categories.filter(c => c.category_type === "cuisine")
      };
      
      const extractionPrompt = getExtractionPrompt(structuredText, categoriesByType, mainIngredients);
      
      setExtractionProgress(60);
      
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
                ingredient_name: { type: "string" },
                amount: { type: "number" },
                unit: { type: "string" },
                preparation_notes: { type: "string" }
              }
            }
          },
          ingredient_groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                group_name: { type: "string" },
                ingredients: { type: "array", items: { type: "object" } }
              }
            }
          },
          instructions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_number: { type: "integer" },
                step_description: { type: "string" },
                ingredients_for_step: { type: "array", items: { type: "string" } }
              }
            }
          },
          instruction_groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                group_name: { type: "string" },
                instructions: { type: "array", items: { type: "object" } }
              }
            }
          },
          tags: { type: "array", items: { type: "string" } },
          confidence_scores: { type: "object" }
        }
      };

      setExtractionProgress(80);

      const result = await retryWithBackoff(async () => {
        return await InvokeLLM({
          prompt: extractionPrompt,
          add_context_from_internet: false,
          response_json_schema: schema
        });
      }, 4, 4000);
      
      setExtractionStage("Validiere Daten...");
      setExtractionProgress(95);
      
      const cleanedRecipe = validateAndCleanRecipeData(result);
      setExtractedRecipe(cleanedRecipe);
      setConfidenceScores(cleanedRecipe.confidence_scores || {});
      updateQueueItem(fileToProcess.id, { progress: 80, status: "extraction_review", extractedRecipe: cleanedRecipe });
      
      setExtractionProgress(100);
      setExtractionStage("Extraktion abgeschlossen!");
      
      saveCheckpoint();
      
    } catch (err) {
      const userMessage = err.message || "Unbekannter Fehler bei der Extraktion";
      setError(`Extraktion fehlgeschlagen: ${userMessage}. Überprüfen Sie Ihre Internetverbindung oder den Serverstatus.`);
      const fileToProcess = batchQueue[currentFileIndex];
      if (fileToProcess) updateQueueItem(fileToProcess.id, { status: "error", error: userMessage });
      setExtractionProgress(0);
      setExtractionStage("");
    }
    
    setIsProcessing(false);
  };

  const checkDuplicates = async (recipe) => {
    setIsProcessing(true);
    setCurrentStage(STAGES.DUPLICATE_CHECK);
    
    try {
      const cleanedRecipe = validateAndCleanRecipeData(recipe);
      setExtractedRecipe(cleanedRecipe);
      
      const allRecipes = await Recipe.list();
      const potentialDuplicates = findDuplicates(cleanedRecipe, allRecipes, 65);
      
      setDuplicates(potentialDuplicates);
      if (currentFile) updateQueueItem(currentFile.id, { progress: 90 });
      
    } catch (err) {
      setError(err.message);
      if (currentFile) updateQueueItem(currentFile.id, { status: "error", error: err.message });
    }
    
    setIsProcessing(false);
  };

  const saveRecipe = async (recipeData, action = "new") => {
    setIsProcessing(true);
    
    try {
      const fileToProcess = batchQueue[currentFileIndex];
      if (!fileToProcess) throw new Error("Kein aktuelles File gefunden.");

      const processed = await processRecipeImport(recipeData, {
        autoGenerateImage: false,
        checkDuplicates: false,
        sourceType: "file_upload",
        sourceUrl: fileToProcess.name,
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
      } else {
        throw new Error("Invalid save action.");
      }

      if (!saveResult.success) throw new Error(saveResult.error);
      
      updateQueueItem(fileToProcess.id, { status: "complete", progress: 100 });
      
      const nextIndex = currentFileIndex + 1;
      if (nextIndex < batchQueue.length) {
        setCurrentFileIndex(nextIndex);
        resetStages();
        await startOCRProcessing(batchQueue[nextIndex]);
      } else {
        setCurrentStage(STAGES.COMPLETE);
        CheckpointManager.clearCheckpoint();
        setShowEmergencyReset(false);
      }
      
    } catch (err) {
      setError(err.message);
      const fileToProcess = batchQueue[currentFileIndex];
      if (fileToProcess) updateQueueItem(fileToProcess.id, { status: "error", error: err.message });
    }
    
    setIsProcessing(false);
  };

  const updateQueueItem = (id, updates) => {
    setBatchQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const resetStages = () => {
    setCurrentStage(STAGES.OCR_REVIEW);
    setOcrText("");
    setOcrMetadata(null);
    setExtractedRecipe(null);
    setConfidenceScores({});
    setDuplicates([]);
    setError(null);
    setExtractionProgress(0); // Reset extraction specific progress
    setExtractionStage(""); // Reset extraction specific stage
  };

  const handleReset = () => {
    CheckpointManager.clearCheckpoint();
    setBatchQueue([]);
    setCurrentFileIndex(0);
    resetStages();
    setCurrentStage(STAGES.UPLOAD);
    setShowEmergencyReset(false);
  };

  const overallProgress = batchQueue.length > 0 ? (batchQueue.filter(item => item.status === "complete").length / batchQueue.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {currentStage !== STAGES.UPLOAD && batchQueue.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">{STAGE_LABELS[currentStage]}</h3>
              <p className="text-sm text-gray-600">Datei {currentFileIndex + 1} von {batchQueue.length}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{Math.round(overallProgress)}%</div>
              <p className="text-xs text-gray-500">Gesamt-Fortschritt</p>
            </div>
            {showEmergencyReset && (
              <Button onClick={handleEmergencyReset} variant="destructive" size="sm">🚨 NOTFALL-RESET</Button>
            )}
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex gap-2 mt-4">
            {Object.keys(STAGES).map((stage, idx) => (
              <div
                key={stage}
                className={`flex-1 px-3 py-2 rounded-lg text-center text-sm font-medium transition-all ${
                  stage === currentStage ? "bg-blue-500 text-white" : idx < Object.keys(STAGES).indexOf(currentStage) ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                }`}
              >
                {STAGE_LABELS[stage]}
              </div>
            ))}
          </div>
          
          {/* FORTSCHRITTSANZEIGE FÜR EXTRAKTION */}
          {currentStage === STAGES.EXTRACTION_REVIEW && isProcessing && extractionProgress > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{extractionStage}</span>
                <span className="text-sm font-bold text-blue-600">{extractionProgress}%</span>
              </div>
              <Progress value={extractionProgress} className="h-2" />
            </div>
          )}

          {batchQueue.length > 1 && currentStage !== STAGES.COMPLETE && ( // Only show if more than one file and not complete
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Warteschlange ({batchQueue.length} Dateien)</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {batchQueue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${
                      index === currentFileIndex
                        ? 'border-blue-500 bg-blue-50'
                        : item.status === 'complete'
                        ? 'border-green-500 bg-green-50'
                        : item.status === 'error'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {item.name}
                      </span>
                      {item.status === 'complete' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      {item.status === 'processing' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="w-full"> {/* Changed from lg:col-span-2 to w-full */}
        {currentStage === STAGES.UPLOAD && <BatchUploadZone onUpload={handleBatchUpload} />}
        {currentStage === STAGES.OCR_REVIEW && ocrText && (
          <OCRReviewStage
            ocrText={ocrText}
            metadata={ocrMetadata}
            onApprove={startExtraction}
            onReject={handleReset}
            isProcessing={isProcessing}
          />
        )}
        {currentStage === STAGES.EXTRACTION_REVIEW && extractedRecipe && (
          <ExtractionReviewStage
            recipe={extractedRecipe}
            confidenceScores={confidenceScores}
            categories={categories}
            mainIngredients={mainIngredients}
            onApprove={checkDuplicates}
            onBack={() => setCurrentStage(STAGES.OCR_REVIEW)}
            isProcessing={isProcessing}
          />
        )}
        {currentStage === STAGES.DUPLICATE_CHECK && extractedRecipe && (
          <DuplicateCheckStage
            newRecipe={extractedRecipe}
            duplicates={duplicates}
            onSaveNew={() => saveRecipe(extractedRecipe, "new")}
            onMerge={() => saveRecipe(extractedRecipe, "merge")}
            onReplace={() => saveRecipe(extractedRecipe, "replace")}
            onBack={() => setCurrentStage(STAGES.EXTRACTION_REVIEW)}
            isProcessing={isProcessing}
          />
        )}
        {currentStage === STAGES.COMPLETE && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Import abgeschlossen!</h2>
            <p className="text-gray-600 mb-6">{batchQueue.filter(item => item.status === "complete").length} Rezept(e) erfolgreich importiert</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate(createPageUrl("Browse"))} className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl">Zu den Rezepten</Button>
              <Button variant="outline" onClick={handleReset} className="rounded-xl">Weitere importieren</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
