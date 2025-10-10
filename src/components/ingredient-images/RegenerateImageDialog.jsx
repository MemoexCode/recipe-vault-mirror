
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { GenerateImage } from "@/api/integrations";
import { generateIngredientPrompt } from "./constants";

export default function RegenerateImageDialog({ open, onOpenChange, image, onSave }) {
  const [mode, setMode] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setRetryAttempt(0);

    try {
      let prompt;
      
      if (mode === "auto") {
        // AUTOMATISCHER MODUS: MIT INTELLIGENTER ANALYSE
        prompt = await generateIngredientPrompt(image.ingredient_name);
      } else {
        // MANUELLER MODUS: Nutze Custom Prompt direkt
        prompt = customPrompt.trim();
      }

      if (!prompt) {
        setError("Bitte gib einen Prompt ein.");
        setIsGenerating(false);
        return;
      }

      // Retry-Logik (identisch mit ImageGenerationService)
      let imageUrl = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        setRetryAttempt(attempt);
        
        try {
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          }

          const { url } = await GenerateImage({ prompt });
          imageUrl = url;
          break;
        } catch (err) {
          console.error(`Versuch ${attempt}/${maxRetries} fehlgeschlagen:`, err);
          
          if (attempt === maxRetries) {
            throw new Error("Bildgenerierung nach 3 Versuchen fehlgeschlagen. Bitte versuche es später erneut.");
          }
        }
      }

      onSave({
        ...image,
        image_url: imageUrl
      });

      setMode("auto");
      setCustomPrompt("");
      setRetryAttempt(0);
    } catch (err) {
      setError(err.message || "Fehler bei der Bildgenerierung.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setMode("auto");
    setCustomPrompt("");
    setError(null);
    setRetryAttempt(0);
    onOpenChange(false);
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Bild neu generieren:</span>
            <span className="font-normal text-gray-600 capitalize">{image.ingredient_name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <img 
              src={image.image_url}
              alt={image.ingredient_name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Aktuelles Bild wird ersetzt. Die Tags bleiben erhalten.
              </p>
              <div className="flex gap-2">
                <Button
                  variant={mode === "auto" ? "default" : "outline"}
                  onClick={() => setMode("auto")}
                  className="flex-1 rounded-xl"
                  style={mode === "auto" ? { backgroundColor: "#FF5722" } : {}}
                  disabled={isGenerating}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Automatisch
                </Button>
                <Button
                  variant={mode === "custom" ? "default" : "outline"}
                  onClick={() => setMode("custom")}
                  className="flex-1 rounded-xl"
                  style={mode === "custom" ? { backgroundColor: "#FF5722" } : {}}
                  disabled={isGenerating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Eigener Prompt
                </Button>
              </div>
            </div>
          </div>

          {mode === "custom" && (
            <div>
              <Label htmlFor="custom-prompt" className="mb-2 block">
                Eigener Prompt für Bildgenerierung
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="z.B. fresh red chili peppers, isolated on white background, professional food photography..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="rounded-xl h-32"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-2">
                Tipp: Beschreibe das gewünschte Bild auf Englisch für beste Ergebnisse
              </p>
            </div>
          )}

          {mode === "auto" && (
            <Alert className="rounded-xl" style={{ backgroundColor: "rgba(139, 157, 131, 0.05)" }}>
              <Wand2 className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-sm text-gray-700">
                <strong>Automatischer Modus:</strong> Übersetzt die Zutat automatisch ins Englische und nutzt den Standard-Prompt für konsistente, hochwertige Ergebnisse.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
            disabled={isGenerating}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (mode === "custom" && !customPrompt.trim())}
            className="text-white font-medium rounded-xl"
            style={{ backgroundColor: "#FF5722" }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {retryAttempt > 0 && retryAttempt <= 3 ? `Generiere (${retryAttempt}/3)...` : "Generiere..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Bild generieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
