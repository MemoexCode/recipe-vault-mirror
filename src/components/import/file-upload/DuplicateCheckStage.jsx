import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import RecipePreview from "../RecipePreview";

export default function DuplicateCheckStage({ 
  newRecipe, 
  duplicates, 
  onSaveNew, 
  onMerge, 
  onReplace, 
  onBack, 
  isProcessing 
}) {
  const [selectedAction, setSelectedAction] = useState("new");
  const [editedRecipe, setEditedRecipe] = useState(newRecipe);

  const handleSaveEdits = (updatedRecipe) => {
    setEditedRecipe(updatedRecipe);
  };

  const handleConfirm = () => {
    if (selectedAction === "new") {
      onSaveNew(editedRecipe);
    } else if (selectedAction === "merge") {
      onMerge(editedRecipe);
    } else if (selectedAction === "replace") {
      onReplace(editedRecipe);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-xl">Duplikat-Prüfung</CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {duplicates.length > 0 ? (
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 mb-1">
                  {duplicates.length} mögliche{duplicates.length > 1 ? ' Duplikate' : 's Duplikat'} gefunden
                </p>
                <p className="text-sm text-orange-700">
                  Bitte wähle, wie du fortfahren möchtest
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {duplicates.slice(0, 3).map((dup, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-3 border border-orange-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800">{dup.recipe.title}</span>
                    <Badge className="bg-orange-500 text-white">
                      {dup.score}% Ähnlichkeit
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {dup.commonIngredients} von {dup.totalIngredients} Zutaten identisch
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="duplicate-action"
                  value="new"
                  checked={selectedAction === "new"}
                  onChange={() => setSelectedAction("new")}
                  className="w-4 h-4"
                  style={{ accentColor: "#FF5722" }}
                />
                <span className="text-sm font-medium">Als neues Rezept speichern</span>
              </label>

              {duplicates[0] && (
                <>
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="duplicate-action"
                      value="merge"
                      checked={selectedAction === "merge"}
                      onChange={() => setSelectedAction("merge")}
                      className="w-4 h-4"
                      style={{ accentColor: "#FF5722" }}
                    />
                    <span className="text-sm font-medium">
                      Mit "{duplicates[0].recipe.title}" zusammenführen
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="duplicate-action"
                      value="replace"
                      checked={selectedAction === "replace"}
                      onChange={() => setSelectedAction("replace")}
                      className="w-4 h-4"
                      style={{ accentColor: "#FF5722" }}
                    />
                    <span className="text-sm font-medium">
                      "{duplicates[0].recipe.title}" ersetzen
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Keine Duplikate gefunden! Du kannst das Rezept speichern.
              </p>
            </div>
          </div>
        )}

        <RecipePreview
          recipe={editedRecipe}
          onSave={handleSaveEdits}
          onCancel={onBack}
          enrichedFields={[]}
        />

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-6"
          >
            <Save className="w-5 h-5 mr-2" />
            {isProcessing ? "Speichert..." : "Rezept speichern"}
          </Button>
          <Button
            onClick={onBack}
            disabled={isProcessing}
            variant="outline"
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zurück
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}