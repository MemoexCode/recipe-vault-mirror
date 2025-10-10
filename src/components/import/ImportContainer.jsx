/**
 * IMPORT CONTAINER - ORCHESTRATOR COMPONENT
 * Zweck: Rendert die entsprechende Import-Stage basierend auf dem aktuellen Zustand
 * Props: Erhält Zustand und Handler vom useImportPipeline Hook
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import OCRReviewStage from "./file-upload/OCRReviewStage";
import RecipeReviewDialog from "./RecipeReviewDialog";

export default function ImportContainer({ 
  inputComponent: InputComponent,
  sourceStrategy,
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
  handleImport,
  handleExtraction,
  handleSaveRecipe,
  handleCancelOCRReview,
  handleCancelRecipeReview,
  setError,
  STAGES
}) {
  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* INPUT STAGE */}
      {currentStage === STAGES.INPUT && (
        <InputComponent 
          onSubmit={(input) => handleImport(input, sourceStrategy)}
          isProcessing={isProcessing}
          progress={progress}
          currentStage={currentStage}
        />
      )}

      {/* PROCESSING STAGE */}
      {currentStage === STAGES.PROCESSING && (
        <InputComponent 
          onSubmit={(input) => handleImport(input, sourceStrategy)}
          isProcessing={isProcessing}
          progress={progress}
          currentStage={currentStage}
        />
      )}

      {/* OCR REVIEW STAGE */}
      {currentStage === STAGES.OCR_REVIEW && (
        <OCRReviewStage
          structuredText={structuredText}
          metadata={ocrMetadata}
          onApprove={handleExtraction}
          onCancel={handleCancelOCRReview}
          isProcessing={false}
        />
      )}

      {/* DATA EXTRACTION STAGE */}
      {currentStage === STAGES.EXTRACTING && (
        <OCRReviewStage
          structuredText={structuredText}
          metadata={ocrMetadata}
          onApprove={handleExtraction}
          onCancel={handleCancelOCRReview}
          isProcessing={isProcessing}
        />
      )}

      {/* RECIPE REVIEW STAGE */}
      {currentStage === STAGES.RECIPE_REVIEW && extractedRecipe && (
        <RecipeReviewDialog
          recipe={extractedRecipe}
          duplicates={duplicates}
          categories={categories}
          mainIngredients={mainIngredients}
          onSave={handleSaveRecipe}
          onCancel={handleCancelRecipeReview}
        />
      )}
    </div>
  );
}