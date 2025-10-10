
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"; // Added Loader2
import RecipePreview from "../RecipePreview";

export default function ExtractionReviewStage({ 
  recipe, 
  confidenceScores, 
  categories, 
  mainIngredients, 
  onApprove, 
  onBack, 
  isProcessing 
}) {
  const [editedRecipe, setEditedRecipe] = useState(recipe);
  const [hasChanges, setHasChanges] = useState(false);

  // This effect ensures editedRecipe is updated if the 'recipe' prop changes,
  // e.g., when moving from a loading state to displaying a recipe.
  // We only reset if recipe is actually a new value and not null/undefined.
  React.useEffect(() => {
    if (recipe && recipe !== editedRecipe) {
      setEditedRecipe(recipe);
      setHasChanges(false); // Reset changes flag when a new recipe is loaded
    }
  }, [recipe]); // Depend on recipe prop

  const lowConfidenceFields = Object.entries(confidenceScores || {})
    .filter(([_, score]) => score < 70)
    .map(([field, _]) => field);

  const handleSaveEdits = (updatedRecipe) => {
    setEditedRecipe(updatedRecipe);
    setHasChanges(true);
  };

  const handleConfirm = () => {
    onApprove(editedRecipe);
  };

  // LOADING OVERLAY WÄHREND VERARBEITUNG
  if (isProcessing && !recipe) {
    return (
      <Card className="rounded-2xl bg-white shadow-sm">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Extrahiere Rezeptdaten...</h3>
          <p className="text-gray-600">Dies kann einige Sekunden dauern</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* WARNING CARD */}
      {lowConfidenceFields.length > 0 && (
        <Card className="rounded-2xl border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 mb-1 text-lg">
                  Niedrige Konfidenz bei einigen Feldern
                </p>
                <p className="text-sm text-orange-700">
                  Bitte überprüfe besonders: {lowConfidenceFields.join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RECIPE PREVIEW - NO HEADER/FOOTER */}
      {/* Only show RecipePreview if a recipe is available */}
      {recipe && (
        <RecipePreview
          recipe={editedRecipe}
          onSave={handleSaveEdits}
          categories={categories}
          mainIngredients={mainIngredients}
          enrichedFields={[]}
          hideActionButtons={true}
        />
      )}

      {/* ACTION BUTTONS - MIT LOADING STATE */}
      <Card className="rounded-2xl shadow-sm sticky bottom-6 z-10 bg-white border-2">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Button
              onClick={onBack}
              disabled={isProcessing}
              variant="outline"
              className="rounded-xl px-6 py-6 text-base"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Zurück zum Text
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-6 text-base font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Prüfe auf Duplikate...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {hasChanges ? "Änderungen übernehmen & weiter" : "Daten bestätigen & weiter"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
