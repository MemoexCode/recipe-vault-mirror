import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, AlertTriangle, XCircle, Sparkles, 
  Users, Clock, ChefHat, Loader2 
} from "lucide-react";
import { COLORS } from "@/components/utils/constants";

/**
 * Universelle Review-Dialog für alle Import-Quellen
 * Zeigt Quality Score, Warnungen und Duplikate
 */
export default function RecipeReviewDialog({
  open,
  onOpenChange,
  processedRecipe,
  onSave,
  isProcessing = false
}) {
  const [selectedAction, setSelectedAction] = useState("new");
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);

  if (!processedRecipe) return null;

  const { recipe, duplicates, qualityScore, pipeline } = processedRecipe;

  const getQualityColor = (score) => {
    if (score >= 80) return { color: "#10B981", label: "Hervorragend", icon: CheckCircle2 };
    if (score >= 60) return { color: "#3B82F6", label: "Gut", icon: CheckCircle2 };
    if (score >= 40) return { color: "#F59E0B", label: "Ausreichend", icon: AlertTriangle };
    return { color: "#EF4444", label: "Unvollständig", icon: XCircle };
  };

  const quality = getQualityColor(qualityScore);
  const QualityIcon = quality.icon;

  const handleSave = () => {
    onSave(selectedAction, selectedDuplicate?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Sparkles className="w-6 h-6" style={{ color: COLORS.ACCENT }} />
            Rezept-Import-Prüfung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QUALITY SCORE */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700">Qualitätsbewertung</span>
              <div className="flex items-center gap-2">
                <QualityIcon className="w-5 h-5" style={{ color: quality.color }} />
                <span className="text-2xl font-bold" style={{ color: quality.color }}>
                  {qualityScore}%
                </span>
                <Badge style={{ backgroundColor: quality.color, color: "white" }}>
                  {quality.label}
                </Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{ 
                  width: `${qualityScore}%`,
                  backgroundColor: quality.color
                }}
              />
            </div>
          </div>

          {/* RECIPE PREVIEW */}
          <div className="border rounded-xl p-4">
            <div className="flex items-start gap-4">
              {recipe.image_url && (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-2">{recipe.title}</h3>
                {recipe.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {recipe.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {recipe.meal_type && (
                    <Badge variant="outline">{recipe.meal_type}</Badge>
                  )}
                  {recipe.gang && (
                    <Badge variant="outline">{recipe.gang}</Badge>
                  )}
                  {recipe.servings && (
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {recipe.servings} Port.
                    </Badge>
                  )}
                  {(recipe.prep_time_minutes > 0 || recipe.cook_time_minutes > 0) && (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} Min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WARNINGS */}
          {pipeline.warnings && pipeline.warnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Hinweise:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {pipeline.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* DUPLICATES */}
          {duplicates && duplicates.length > 0 && (
            <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-orange-800">
                  {duplicates.length} mögliche{duplicates.length > 1 ? ' Duplikate' : 's Duplikat'} gefunden
                </span>
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
                    onChange={() => {
                      setSelectedAction("new");
                      setSelectedDuplicate(null);
                    }}
                    className="w-4 h-4"
                    style={{ accentColor: COLORS.ACCENT }}
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
                        onChange={() => {
                          setSelectedAction("merge");
                          setSelectedDuplicate(duplicates[0]);
                        }}
                        className="w-4 h-4"
                        style={{ accentColor: COLORS.ACCENT }}
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
                        onChange={() => {
                          setSelectedAction("replace");
                          setSelectedDuplicate(duplicates[0]);
                        }}
                        className="w-4 h-4"
                        style={{ accentColor: COLORS.ACCENT }}
                      />
                      <span className="text-sm font-medium">
                        "{duplicates[0].recipe.title}" ersetzen
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* PIPELINE INFO */}
          <div className="text-xs text-gray-500">
            <ChefHat className="w-4 h-4 inline mr-1" />
            Verarbeitungsschritte: {pipeline.steps.join(" → ")}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing}
            className="text-white"
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Rezept speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}