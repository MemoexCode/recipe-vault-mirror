
/**
 * IMPORT CONTAINER - ORCHESTRATOR COMPONENT
 * Zweck: Rendert die entsprechende Import-Stage basierend auf dem aktuellen Zustand
 * Props: Erhält Zustand und Handler vom useImportPipeline Hook
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert"; // This import is no longer used in the refactored code, but keeping it as it was in the original file.
import { AlertCircle } from "lucide-react"; // This import is no longer used in the refactored code, but keeping it as it was in the original file.

import OCRReviewStage from "./file-upload/OCRReviewStage";
import RecipeReviewDialog from "./RecipeReviewDialog";

/**
 * IMPORT CONTAINER
 * Zweck: Orchestriert den Import-Prozess und rendert die entsprechenden Stages
 * Props: Alle State und Handlers von useImportPipeline, sourceStrategy, sourceType, inputComponent
 */
export default function ImportContainer({
  // State from useImportPipeline
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
  STAGES,
  
  // Handlers from useImportPipeline
  handleImport,
  handleExtraction,
  handleSaveRecipe,
  handleCancelOCRReview,
  handleCancelRecipeReview,
  setError, // This prop is passed but not explicitly used in the refactored render logic of this component.
  
  // Component-specific props
  sourceStrategy,
  sourceType,
  inputComponent: InputComponent
}) {

  // ============================================
  // WRAPPER FUNCTION FOR IMPORT
  // ============================================
  const handleSubmit = (input) => {
    handleImport(input, sourceStrategy, sourceType);
  };

  // ============================================
  // RENDER STAGES
  // ============================================
  if (currentStage === STAGES.INPUT || currentStage === STAGES.PROCESSING) {
    return (
      <InputComponent
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        progress={progress}
        currentStage={currentStage}
        error={error}
      />
    );
  }

  if (currentStage === STAGES.OCR_REVIEW) {
    return (
      <OCRReviewStage
        structuredText={structuredText}
        metadata={ocrMetadata}
        onApprove={handleExtraction}
        onCancel={handleCancelOCRReview}
        isProcessing={isProcessing}
      />
    );
  }

  if (currentStage === STAGES.RECIPE_REVIEW) {
    return (
      <RecipeReviewDialog
        recipe={extractedRecipe}
        duplicates={duplicates}
        onSave={handleSaveRecipe}
        onCancel={handleCancelRecipeReview}
        categories={categories}
        mainIngredients={mainIngredients}
      />
    );
  }

  return null;
}
