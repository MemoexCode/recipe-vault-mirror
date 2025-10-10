/**
 * IMPORT CONTAINER - ORCHESTRATOR COMPONENT
 * Renders the appropriate import stage based on the current state from the useImportPipeline hook.
 */
import React from "react";
import OCRReviewStage from "./file-upload/OCRReviewStage";

export default function ImportContainer({
  // State from useImportPipeline
  currentStage,
  isProcessing,
  progress,
  error,
  structuredText,
  ocrMetadata,
  STAGES,
  
  // Handlers from useImportPipeline
  handleImport,
  handleExtraction,
  handleCancelOCRReview,
  
  // Component-specific props
  sourceStrategy,
  sourceType,
  inputComponent: InputComponent
}) {

  const handleSubmit = (input) => {
    handleImport(input, sourceStrategy, sourceType);
  };

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

  if (currentStage === STAGES.OCR_REVIEW || currentStage === STAGES.EXTRACTING) {
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

  // RecipeReviewDialog is now handled at the ImportPage level
  return null;
}