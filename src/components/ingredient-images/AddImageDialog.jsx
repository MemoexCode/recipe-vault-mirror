import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Upload, Loader2, CheckCircle2, Info } from "lucide-react";

export default function AddImageDialog({
  open,
  onOpenChange,
  ingredientName,
  onIngredientNameChange,
  uploadMethod,
  onUploadMethodChange,
  selectedFile,
  onFileSelect,
  isGenerating,
  error,
  retryAttempt,
  onSubmit
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Häufige Zutaten für Autocomplete
  const commonIngredients = [
    "Zwiebel", "Knoblauch", "Tomate", "Karotte", "Kartoffel",
    "Paprika", "Gurke", "Zucchini", "Brokkoli", "Blumenkohl",
    "Spinat", "Salat", "Champignons", "Lauch", "Sellerie",
    "Apfel", "Banane", "Zitrone", "Orange", "Erdbeeren",
    "Hähnchenbrust", "Rinderhackfleisch", "Lachs", "Garnelen",
    "Spaghetti", "Penne", "Reis", "Quinoa", "Couscous",
    "Milch", "Joghurt", "Käse", "Mozzarella", "Parmesan",
    "Olivenöl", "Butter", "Sahne", "Mehl", "Zucker"
  ];

  // Autocomplete-Logik
  useEffect(() => {
    if (ingredientName.length >= 2) {
      const filtered = commonIngredients.filter(ing =>
        ing.toLowerCase().includes(ingredientName.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [ingredientName]);

  const handleSelectSuggestion = (suggestion) => {
    onIngredientNameChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "#FF5722" }} />
            Zutatenbild hinzufügen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* ERROR MESSAGE */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* SUCCESS INDICATOR (während Generierung) */}
          {isGenerating && retryAttempt === 0 && (
            <Alert className="rounded-xl border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Generierung läuft...</strong> Dies kann 10-30 Sekunden dauern.
              </AlertDescription>
            </Alert>
          )}

          {/* INGREDIENT NAME INPUT MIT AUTOCOMPLETE */}
          <div className="relative">
            <Label htmlFor="ingredient-name" className="mb-2 block font-semibold">
              Zutatenname *
            </Label>
            <Input
              id="ingredient-name"
              placeholder="z.B. Tomate, Mehl, Zwiebel"
              value={ingredientName}
              onChange={(e) => onIngredientNameChange(e.target.value)}
              onFocus={() => ingredientName.length >= 2 && setSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="rounded-xl text-base"
              disabled={isGenerating}
              autoComplete="off"
            />
            
            {/* AUTOCOMPLETE DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Tipp: Verwende Singular (z.B. "Tomate" statt "Tomaten")
            </p>
          </div>

          {/* METHOD TOGGLE */}
          <div>
            <Label className="mb-2 block font-semibold">
              Methode
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={uploadMethod === "generate" ? "default" : "outline"}
                onClick={() => onUploadMethodChange("generate")}
                className="flex-1 rounded-xl"
                style={uploadMethod === "generate" ? { backgroundColor: "#FF5722", color: "white" } : {}}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                KI-Generierung
              </Button>
              <Button
                type="button"
                variant={uploadMethod === "upload" ? "default" : "outline"}
                onClick={() => onUploadMethodChange("upload")}
                className="flex-1 rounded-xl"
                style={uploadMethod === "upload" ? { backgroundColor: "#FF5722", color: "white" } : {}}
                disabled={isGenerating}
              >
                <Upload className="w-4 h-4 mr-2" />
                Eigenes Bild
              </Button>
            </div>
          </div>

          {/* FILE UPLOAD (nur bei Upload-Methode) */}
          {uploadMethod === "upload" && (
            <div>
              <Label htmlFor="file-upload" className="mb-2 block font-semibold">
                Bild auswählen *
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
                className="rounded-xl"
                disabled={isGenerating}
              />
              {selectedFile && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* INFO BOX für KI-Generierung */}
          {uploadMethod === "generate" && (
            <Alert className="rounded-xl" style={{ backgroundColor: "rgba(255, 87, 34, 0.05)", borderColor: "#FF5722" }}>
              <Sparkles className="h-4 w-4" style={{ color: "#FF5722" }} />
              <AlertDescription className="text-sm text-gray-700">
                <strong>KI-Bildgenerierung:</strong> Erstellt ein professionelles, freigestelltes Foto der Zutat mit weißem Hintergrund.
                {retryAttempt > 0 && (
                  <span className="block mt-2 text-blue-600 font-semibold">
                    Wiederholungsversuch {retryAttempt}/3...
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl flex-1"
            disabled={isGenerating}
          >
            Abbrechen
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              !ingredientName.trim() || 
              isGenerating || 
              (uploadMethod === "upload" && !selectedFile)
            }
            className="text-white font-medium rounded-xl flex-1"
            style={{ backgroundColor: "#FF5722" }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadMethod === "generate" 
                  ? (retryAttempt > 0 && retryAttempt <= 3 ? `${retryAttempt}/3` : "Generiere...") 
                  : "Lade hoch..."}
              </>
            ) : (
              <>
                {uploadMethod === "generate" ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generieren
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Hochladen
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}