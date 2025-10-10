/**
 * IMPORT CONTAINER - ORCHESTRATOR COMPONENT
 * Renders the appropriate import stage based on the current state from the useImportPipeline hook.
 */
import React from "react";
import OCRReviewStage from "./file-upload/OCRReviewStage";
import RecipeReviewDialog from "./RecipeReviewDialog";

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
  
  // Component-specific props
  sourceStrategy,
  sourceType,
  inputComponent: InputComponent
}) {

  const handleSubmit = (input) => {
    handleImport(input, sourceStrategy, sourceType);
  };

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

      {(currentStage === STAGES.OCR_REVIEW || currentStage === STAGES.EXTRACTING) && (
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