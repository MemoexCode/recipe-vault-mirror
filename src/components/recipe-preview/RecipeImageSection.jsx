import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Sparkles, Loader2, CheckCircle2, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const COLORS = {
  ACCENT: "#FF5722",
  TERRACOTTA: "#E07856"
};

export default function RecipeImageSection({ 
  recipe, 
  onChange, 
  isFieldEnriched,
  onGenerateImage,
  isGenerating,
  generationStage,
  generationProgress,
  generationError,
  showSkipOption,
  onSkipGeneration,
  onUploadImage
}) {
  return (
    <div>
      <Label className="text-base font-semibold mb-3 block">
        Rezeptbild {isFieldEnriched("image_url") && <span className="text-xs text-terracotta">● Auto-generiert</span>}
      </Label>
      
      <div className="space-y-4 mb-6">
        {/* Image Display */}
        <div className="relative w-full h-80 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          {recipe.image_url ? (
            <>
              <img
                src={recipe.image_url}
                alt={recipe.title || "Rezeptbild"}
                className="w-full h-full object-cover"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onChange("image_url", "")}
                className="absolute top-3 right-3 rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Entfernen
              </Button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Upload className="w-12 h-12 text-gray-300" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => document.getElementById('image-upload-input').click()}
            disabled={isGenerating}
            className="flex-1 rounded-xl py-6"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bild hochladen
          </Button>
          <input
            id="image-upload-input"
            type="file"
            accept="image/*"
            onChange={onUploadImage}
            className="hidden"
            disabled={isGenerating}
          />
          <Button
            onClick={onGenerateImage}
            disabled={isGenerating || !recipe.title}
            className="flex-1 rounded-xl py-6"
            style={{ 
              borderColor: COLORS.ACCENT,
              color: COLORS.ACCENT
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {generationStage ? generationStage.split(" ")[0] : "Generiere..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {recipe.image_url ? 'Neues KI-Bild' : 'KI-Bild generieren'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {generationStage && !generationError && (
        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
            {generationStage.includes("erfolgreich") ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
            <span>{generationStage}</span>
          </div>
          {generationProgress > 0 && (
            <Progress value={generationProgress} className="h-2" />
          )}
        </div>
      )}

      {/* Error Display */}
      {generationError && (
        <Alert variant="destructive" className="mt-3 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Bildgenerierung fehlgeschlagen</p>
            <p className="text-sm mb-3">{generationError}</p>
            {showSkipOption && (
              <div className="flex gap-2">
                <Button
                  onClick={onGenerateImage}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Erneut versuchen
                </Button>
                <Button
                  onClick={onSkipGeneration}
                  size="sm"
                  className="rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Ohne Bild fortfahren
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-gray-500 mt-2">
        💡 Tipp: Das KI-Bild wird intelligent aus deinem Rezept (Titel, Zutaten, Beschreibung) generiert
      </p>
    </div>
  );
}