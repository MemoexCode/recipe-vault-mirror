/**
 * IMPORT CONTAINER - ORCHESTRATOR COMPONENT
 * Zweck: Rendert die entsprechende Import-Stage basierend auf dem aktuellen Zustand
 * Props: Erhält Zustand und Handler vom useImportPipeline Hook
 */

import React from "react";
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
  setError,
  
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
  return (
    <div className="space-y-6">
      {(currentStage === STAGES.INPUT || currentStage === STAGES.PROCESSING) && (
        <InputComponent
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          progress={progress}
          currentStage={currentStage}
          error={error}
        />
      )}

      {currentStage === STAGES.OCR_REVIEW && (
        <OCRReviewStage
          structuredText={structuredText}
          metadata={ocrMetadata}
          onApprove={handleExtraction}
          onCancel={handleCancelOCRReview}
          isProcessing={isProcessing}
        />
      )}

      {currentStage === STAGES.EXTRACTING && (
        <OCRReviewStage
          structuredText={structuredText}
          metadata={ocrMetadata}
          onApprove={handleExtraction}
          onCancel={handleCancelOCRReview}
          isProcessing={isProcessing}
        />
      )}

      {currentStage === STAGES.RECIPE_REVIEW && extractedRecipe && (
        <RecipeReviewDialog
          recipe={extractedRecipe}
          duplicates={duplicates}
          onSave={handleSaveRecipe}
          onCancel={handleCancelRecipeReview}
          categories={categories}
          mainIngredients={mainIngredients}
        />
      )}
    </div>
  );
}