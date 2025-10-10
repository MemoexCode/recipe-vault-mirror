
import React, { useState, useEffect } from "react";
import { RecipeCategory } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X, AlertCircle, Search, Upload, Sparkles, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateRecipeImage } from "./ImageGenerationHelper";
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // Added Card imports

const DIFFICULTIES = ["easy", "medium", "hard", "expert"];
const DIFFICULTY_LABELS = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Schwer",
  expert: "Experte"
};

const COLORS = {
  ACCENT: "#FF5722",
  TERRACOTTA: "#E07856"
};

const capitalize = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function RecipePreview({ 
  recipe, 
  onSave, 
  onCancel, 
  enrichedFields = [],
  categories: propCategories,
  mainIngredients: propMainIngredients,
  hideActionButtons = false
}) {
  const [editedRecipe, setEditedRecipe] = useState({
    ...recipe,
    ingredients: recipe.ingredients || [],
    ingredient_groups: recipe.ingredient_groups || [],
    instructions: recipe.instructions || [],
    instruction_groups: recipe.instruction_groups || [],
    nutrition_per_serving: recipe.nutrition_per_serving || {},
    nutrition_source: recipe.nutrition_source || "",
    nutrition_debug_log: recipe.nutrition_debug_log || "",
    equipment: recipe.equipment || [],
    tags: recipe.tags || [],
    meal_type: recipe.meal_type || "",
    gang: recipe.gang || "",
    cuisine: recipe.cuisine || "",
    main_ingredient: recipe.main_ingredient || ""
  });
  
  const [categories, setCategories] = useState(propCategories || []);
  const [mainIngredients, setMainIngredients] = useState(propMainIngredients || []);
  const [showMealTypeWarning, setShowMealTypeWarning] = useState(false);
  const [showGangWarning, setShowGangWarning] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationStage, setImageGenerationStage] = useState(null);
  const [mainIngredientOpen, setMainIngredientOpen] = useState(false);
  const [mainIngredientSearch, setMainIngredientSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("alle");
  const [imageGenerationError, setImageGenerationError] = useState(null);
  const [showSkipImageOption, setShowSkipImageOption] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(recipe.image_url || null); // Added for image persistence

  useEffect(() => {
    setEditedRecipe({
      ...recipe,
      ingredients: recipe.ingredients || [],
      ingredient_groups: recipe.ingredient_groups || [],
      instructions: recipe.instructions || [],
      instruction_groups: recipe.instruction_groups || [],
      nutrition_per_serving: recipe.nutrition_per_serving || {},
      nutrition_source: recipe.nutrition_source || "",
      nutrition_debug_log: recipe.nutrition_debug_log || "",
      equipment: recipe.equipment || [],
      tags: recipe.tags || [],
      meal_type: recipe.meal_type || "",
      gang: recipe.gang || "",
      cuisine: recipe.cuisine || "",
      main_ingredient: recipe.main_ingredient || ""
    });
    setGeneratedImageUrl(recipe.image_url || null); // Reset generated image URL on recipe change
    setIsGeneratingImage(false);
    setImageGenerationStage(null);
    setImageGenerationError(null);
    setShowSkipImageOption(false);
  }, [recipe]);

  useEffect(() => {
    if (!propCategories || propCategories.length === 0) { // Keep existing robust check
      loadCategories();
    }
    if (!propMainIngredients || propMainIngredients.length === 0) { // Keep existing robust check
      loadMainIngredients();
    }
  }, [propCategories, propMainIngredients]);

  const loadCategories = async () => {
    const cats = await RecipeCategory.list("name");
    setCategories(cats);
  };

  const loadMainIngredients = async () => {
    const data = await MainIngredient.list("name");
    setMainIngredients(data);
  };

  const updateField = (field, value) => {
    const updated = { ...editedRecipe, [field]: value };
    setEditedRecipe(updated);
    if (field === "meal_type" && value) setShowMealTypeWarning(false);
    if (field === "gang" && value) setShowGangWarning(false);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const updateNutrition = (field, value) => {
    const updated = {
      ...editedRecipe,
      nutrition_per_serving: { ...editedRecipe.nutrition_per_serving, [field]: parseFloat(value) || 0 }
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const addIngredient = () => {
    const updated = {
      ...editedRecipe,
      ingredients: [...editedRecipe.ingredients, { ingredient_name: "", amount: 0, unit: "", preparation_notes: "" }]
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index][field] = field === "amount" ? (parseFloat(value) || 0) : value;
    const updated = { ...editedRecipe, ingredients: newIngredients };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const removeIngredient = (index) => {
    const updated = {
      ...editedRecipe,
      ingredients: editedRecipe.ingredients.filter((_, i) => i !== index)
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const addInstruction = () => {
    const newStepNumber = editedRecipe.instructions.length + 1;
    const updated = {
      ...editedRecipe,
      instructions: [...editedRecipe.instructions, { step_number: newStepNumber, step_description: "", ingredients_for_step: [] }]
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const updateInstruction = (index, field, value) => {
    const newInstructions = [...editedRecipe.instructions];
    newInstructions[index][field] = value;
    const updated = { ...editedRecipe, instructions: newInstructions };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const removeInstruction = (index) => {
    const updated = {
      ...editedRecipe,
      instructions: editedRecipe.instructions.filter((_, i) => i !== index).map((inst, i) => ({
        ...inst,
        step_number: i + 1
      }))
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const addEquipment = () => {
    const updated = {
      ...editedRecipe,
      equipment: [...editedRecipe.equipment, ""]
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const updateEquipment = (index, value) => {
    const newEquipment = [...editedRecipe.equipment];
    newEquipment[index] = value;
    const updated = { ...editedRecipe, equipment: newEquipment };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const removeEquipment = (index) => {
    const updated = {
      ...editedRecipe,
      equipment: editedRecipe.equipment.filter((_, i) => i !== index)
    };
    setEditedRecipe(updated);
    
    // Removed onSave call here as per outline's implicit change for handleSave
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageGenerationError(null); // Clear any previous errors
    setShowSkipImageOption(false);
    try {
      const { UploadFile } = await import("@/api/integrations");
      const { file_url } = await UploadFile({ file });
      // updateField("image_url", file_url); // replaced by direct state update
      setEditedRecipe(prev => ({ ...prev, image_url: file_url }));
      setGeneratedImageUrl(file_url); // Also update generatedImageUrl for consistency
    } catch (err) {
      console.error("Fehler beim Hochladen:", err);
      alert("Fehler beim Hochladen des Bildes: " + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!editedRecipe.title) {
      alert("Bitte gib zuerst einen Titel für das Rezept ein.");
      return;
    }

    setIsGeneratingImage(true);
    setImageGenerationStage(null);
    setImageGenerationError(null);
    setShowSkipImageOption(false);

    try {
      const { url, prompt } = await generateRecipeImage(editedRecipe, (progress) => {
        setImageGenerationStage(progress.message);
        
        // Zeige Skip-Option bei Fehler
        if (progress.stage === 'error' && progress.canSkip) {
          setShowSkipImageOption(true);
          setImageGenerationError(progress.message);
        }
      });

      console.log("✅ Image generated with prompt:", prompt);

      setGeneratedImageUrl(url); // WICHTIG: Speichere URL in State
      setEditedRecipe(prev => ({ ...prev, image_url: url })); // WICHTIG: Speichere URL in editedRecipe
      setImageGenerationStage("Bild erfolgreich generiert!");
      setImageGenerationError(null);

      setTimeout(() => {
        setImageGenerationStage(null);
      }, 2000);

    } catch (err) {
      console.error("Image generation failed:", err);
      const errorMsg = err.message || "Fehler bei der Bildgenerierung.";
      setImageGenerationError(errorMsg);
      setImageGenerationStage(null);
      setShowSkipImageOption(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSkipImage = () => {
    setImageGenerationError(null);
    setShowSkipImageOption(false);
    setImageGenerationStage(null);
    setIsGeneratingImage(false);
  };

  const handleSave = () => {
    if (!editedRecipe.meal_type) {
      setShowMealTypeWarning(true);
      document.getElementById("field-meal_type")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!editedRecipe.gang) {
      setShowGangWarning(true);
      document.getElementById("field-gang")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    // Stelle sicher, dass generierte Bilder übernommen werden
    const recipeToSave = {
      ...editedRecipe,
      image_url: generatedImageUrl || editedRecipe.image_url // Prioritize generatedImageUrl
    };

    if (onSave && typeof onSave === 'function') {
      onSave(recipeToSave); // Use recipeToSave here
    }
  };

  const isFieldEnriched = (fieldName) => enrichedFields.includes(fieldName);
  const getFieldClassName = (fieldName) => isFieldEnriched(fieldName) ? "enriched-field" : "";

  const getMealCategories = () => categories.filter(c => c.category_type === "meal").sort((a, b) => (a.order || 0) - (b.order || 0));
  const getGangCategories = () => categories.filter(c => c.category_type === "gang").sort((a, b) => (a.order || 0) - (b.order || 0));
  const getCuisineCategories = () => categories.filter(c => c.category_type === "cuisine").sort((a, b) => (a.order || 0) - (b.order || 0));

  const mainIngredientsGrouped = mainIngredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {});

  const sortedCategories = Object.keys(mainIngredientsGrouped).sort();

  const categoryLabels = {
    "fleisch": "🥩 Fleisch",
    "fisch": "🐟 Fisch",
    "meeresfrüchte": "🦐 Meeresfrüchte",
    "gemüse": "🥕 Gemüse",
    "pasta": "🍝 Pasta",
    "reis": "🍚 Reis",
    "getreide": "🌾 Getreide",
    "hülsenfrüchte": "🫘 Hülsenfrüchte",
    "eier": "🥚 Eier",
    "milchprodukte": "🧀 Milchprodukte",
    "nüsse": "🥜 Nüsse",
    "obst": "🍎 Obst",
    "pilze": "🍄 Pilze",
    "tofu": "🫛 Tofu / Soja",
    "sonstiges": "🍽️ Sonstiges"
  };

  const filteredMainIngredients = mainIngredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(mainIngredientSearch.toLowerCase());
    const matchesCategory = selectedCategory === "alle" || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const hasInstructionGroups = editedRecipe.instruction_groups && editedRecipe.instruction_groups.length > 0;
  const hasEquipment = editedRecipe.equipment && editedRecipe.equipment.length > 0;

  const canSave = editedRecipe.meal_type && editedRecipe.gang;

  const nutritionFields = [
    { key: "calories_kcal", label: "Kalorien (kcal)" },
    { key: "protein_g", label: "Protein (g)" },
    { key: "carbs_g", label: "Kohlenhydrate (g)" },
    { key: "fat_g", label: "Fett (g)" },
    { key: "fiber_g", label: "Ballaststoffe (g)" },
    { key: "sugar_g", label: "Zucker (g)" },
    { key: "sodium_mg", label: "Natrium (mg)" },
    { key: "cholesterol_mg", label: "Cholesterin (mg)" }
  ];

  return (
    <Card className="rounded-2xl shadow-lg bg-white">
      {/* HEADER MIT BUTTONS - NUR WENN onCancel vorhanden UND hideActionButtons = false */}
      {onCancel && !hideActionButtons && (
        <CardHeader className="border-b p-6 bg-white sticky top-0 z-50 shadow-sm">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--warm-gray)" }}>
            Rezept überprüfen und bearbeiten
          </h2>
          
          {enrichedFields.length > 0 && (
            <p className="text-sm mb-4" style={{ color: "var(--sage)" }}>
              Felder mit <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS.TERRACOTTA }}></span> wurden automatisch ergänzt</span>
            </p>
          )}

          {(showMealTypeWarning || showGangWarning) && (
            <Alert variant="destructive" className="mb-4 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bitte wähle Mahlzeit und Gang aus.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-xl"
              style={{
                backgroundColor: canSave ? COLORS.ACCENT : "#9CA3AF",
                color: "white",
                opacity: canSave ? 1 : 0.6,
                cursor: canSave ? "pointer" : "not-allowed"
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              Änderungen übernehmen
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-6 space-y-8">
        {/* Title */}
        <div className={getFieldClassName("title")}>
          <Label className="text-base font-semibold mb-3 block">
            Rezepttitel {isFieldEnriched("title") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
          </Label>
          <Input
            value={editedRecipe.title || ""}
            onChange={(e) => updateField("title", e.target.value)}
            className="rounded-xl text-base py-5"
          />
        </div>

        {/* IMAGE SECTION - Updated as per outline */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Rezeptbild {isFieldEnriched("image_url") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-generiert</span>}
          </Label>
          
          <div className="space-y-4 mb-6">
            {/* Image Display */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {(generatedImageUrl || editedRecipe.image_url) ? (
                <>
                  <img
                    src={generatedImageUrl || editedRecipe.image_url}
                    alt={editedRecipe.title || "Rezeptbild"}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setEditedRecipe(prev => ({ ...prev, image_url: "" }));
                      setGeneratedImageUrl(null);
                    }}
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

            {/* Generate Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => document.getElementById('image-upload').click()}
                disabled={isGeneratingImage}
                className="flex-1 rounded-xl py-6"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bild hochladen
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploadingImage || isGeneratingImage}
              />
              <Button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !editedRecipe.title}
                className="flex-1 rounded-xl py-6"
                style={{ 
                  borderColor: COLORS.ACCENT,
                  color: COLORS.ACCENT
                }}
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {imageGenerationStage ? imageGenerationStage.split(" ")[0] : "Generiere..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generatedImageUrl || editedRecipe.image_url ? 'Neues KI-Bild' : 'KI-Bild generieren'}
                  </>
                )}
              </Button>
            </div>
          </div>


          {/* FORTSCHRITTSANZEIGE */}
          {imageGenerationStage && !imageGenerationError && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                {imageGenerationStage.includes("erfolgreich") ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
                <span>{imageGenerationStage}</span>
              </div>
            </div>
          )}

          {/* FEHLERANZEIGE MIT SKIP-OPTION */}
          {imageGenerationError && (
            <Alert variant="destructive" className="mt-3 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Bildgenerierung fehlgeschlagen</p>
                <p className="text-sm mb-3">{imageGenerationError}</p>
                {showSkipImageOption && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Erneut versuchen
                    </Button>
                    <Button
                      onClick={handleSkipImage}
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

        {/* Description */}
        <div className={getFieldClassName("description")}>
          <Label className="text-base font-semibold mb-3 block">Beschreibung {isFieldEnriched("description") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
          <Textarea
            value={editedRecipe.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            className="rounded-xl h-32 text-sm"
          />
        </div>

        {/* Times & Difficulty */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className={getFieldClassName("prep_time_minutes")}>
            <Label className="text-base font-semibold mb-3 block">Vorbereitung (Min) {isFieldEnriched("prep_time_minutes") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            <Input
              type="number"
              min="0"
              value={editedRecipe.prep_time_minutes || ""}
              onChange={(e) => updateField("prep_time_minutes", parseInt(e.target.value) || 0)}
              className="rounded-xl py-5 text-base"
            />
          </div>
          <div className={getFieldClassName("cook_time_minutes")}>
            <Label className="text-base font-semibold mb-3 block">Kochzeit (Min) {isFieldEnriched("cook_time_minutes") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            <Input
              type="number"
              min="0"
              value={editedRecipe.cook_time_minutes || ""}
              onChange={(e) => updateField("cook_time_minutes", parseInt(e.target.value) || 0)}
              className="rounded-xl py-5 text-base"
            />
          </div>
          <div className={getFieldClassName("servings")}>
            <Label className="text-base font-semibold mb-3 block">Portionen {isFieldEnriched("servings") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            <Input
              type="number"
              min="1"
              value={editedRecipe.servings || ""}
              onChange={(e) => updateField("servings", parseInt(e.target.value) || 1)}
              className="rounded-xl py-5 text-base"
            />
          </div>
          <div className={getFieldClassName("difficulty")}>
            <Label className="text-base font-semibold mb-3 block">Schwierigkeit {isFieldEnriched("difficulty") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            <Select value={editedRecipe.difficulty || ""} onValueChange={(value) => updateField("difficulty", value)}>
              <SelectTrigger className="rounded-xl py-5 text-base">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(diff => (
                  <SelectItem key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categories */}
        <div className="grid md:grid-cols-2 gap-6">
          <div id="field-meal_type" className={`${getFieldClassName("meal_type")} ${showMealTypeWarning ? 'ring-2 ring-red-500 rounded-xl p-4' : ''}`}>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <span className="text-red-500">*</span> Mahlzeit
              {isFieldEnriched("meal_type") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
            </Label>
            <p className="text-sm mb-2" style={{ color: showMealTypeWarning ? "#EF4444" : "var(--sage)" }}>
              {showMealTypeWarning ? "⚠️ Pflichtfeld" : "Zu welcher Tageszeit?"}
            </p>
            <Select value={editedRecipe.meal_type || ""} onValueChange={(value) => updateField("meal_type", value)}>
              <SelectTrigger className={`rounded-xl py-5 text-base ${showMealTypeWarning ? 'border-red-500 border-2' : ''}`}>
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {getMealCategories().map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{capitalize(cat.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div id="field-gang" className={`${getFieldClassName("gang")} ${showGangWarning ? 'ring-2 ring-red-500 rounded-xl p-4' : ''}`}>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <span className="text-red-500">*</span> Gang
              {isFieldEnriched("gang") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
            </Label>
            <p className="text-sm mb-2" style={{ color: showGangWarning ? "#EF4444" : "var(--sage)" }}>
              {showGangWarning ? "⚠️ Pflichtfeld" : "Welche Rolle im Menü?"}
            </p>
            <Select value={editedRecipe.gang || ""} onValueChange={(value) => updateField("gang", value)}>
              <SelectTrigger className={`rounded-xl py-5 text-base ${showGangWarning ? 'border-red-500 border-2' : ''}`}>
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {getGangCategories().map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{capitalize(cat.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={getFieldClassName("cuisine")}>
            <Label className="text-base font-semibold mb-3 block">
              Küche (optional) {isFieldEnriched("cuisine") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
            </Label>
            <Select value={editedRecipe.cuisine || ""} onValueChange={(value) => updateField("cuisine", value === "none" ? "" : value)}>
              <SelectTrigger className="rounded-xl py-5 text-base">
                <SelectValue placeholder="Keine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine</SelectItem>
                {getCuisineCategories().map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{capitalize(cat.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={getFieldClassName("main_ingredient")}>
            <Label className="text-base font-semibold mb-3 block">
              Hauptzutat {isFieldEnriched("main_ingredient") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
            </Label>
            <p className="text-sm mb-2" style={{ color: "var(--sage)" }}>
              💡 Tipp: Kategorien helfen beim schnellen Finden
            </p>
            
            <Popover open={mainIngredientOpen} onOpenChange={setMainIngredientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={mainIngredientOpen}
                  className="w-full justify-between rounded-xl py-5 text-base"
                >
                  {editedRecipe.main_ingredient || "Wähle Hauptzutat..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Suche Hauptzutat..." 
                    value={mainIngredientSearch}
                    onValueChange={setMainIngredientSearch}
                  />
                  
                  <div className="flex flex-wrap gap-1 p-2 border-b">
                    <Button
                      variant={selectedCategory === "alle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory("alle")}
                      className="text-xs"
                    >
                      Alle
                    </Button>
                    {sortedCategories.map(cat => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className="text-xs"
                      >
                        {categoryLabels[cat] || cat}
                      </Button>
                    ))}
                  </div>

                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>Keine Zutat gefunden.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          updateField("main_ingredient", "");
                          setMainIngredientOpen(false);
                          setMainIngredientSearch("");
                          setSelectedCategory("alle");
                        }}
                      >
                        Keine
                      </CommandItem>
                      {filteredMainIngredients.map((ing) => (
                        <CommandItem
                          key={ing.id}
                          value={ing.name}
                          onSelect={(currentValue) => {
                            updateField("main_ingredient", currentValue);
                            setMainIngredientOpen(false);
                            setMainIngredientSearch("");
                            setSelectedCategory("alle");
                          }}
                        >
                          {ing.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Equipment */}
        {(hasEquipment || isFieldEnriched("equipment")) && (
          <div className={getFieldClassName("equipment")}>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold">
                Benötigte Utensilien {isFieldEnriched("equipment") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addEquipment} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Hinzufügen
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editedRecipe.equipment.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Utensil"
                    value={item}
                    onChange={(e) => updateEquipment(index, e.target.value)}
                    className="flex-1 rounded-xl py-4 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipment(index)}>
                    <Trash2 className="w-4 h-4" style={{ color: COLORS.TERRACOTTA }} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition */}
        <div className={getFieldClassName("nutrition_per_serving")}>
          <Label className="text-lg font-semibold mb-4 block">
            Nährwertangaben (pro Portion) {isFieldEnriched("nutrition_per_serving") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
          </Label>

          <div className={getFieldClassName("nutrition_source")}>
            <Label className="text-base font-semibold mb-3 block">
              Quelle der Nährwertangaben {isFieldEnriched("nutrition_source") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}
            </Label>
            <Input
              value={editedRecipe.nutrition_source || ""}
              onChange={(e) => updateField("nutrition_source", e.target.value)}
              placeholder="z.B. BLS 3.02, USDA"
              className="rounded-xl py-4 text-sm"
            />
          </div>

          {editedRecipe.nutrition_debug_log && (
            <div className="mt-4 p-4 rounded-xl border-2" style={{ borderColor: "var(--sage)", backgroundColor: "rgba(139, 157, 131, 0.05)" }}>
              <Label className="text-sm font-semibold mb-2 block" style={{ color: "var(--sage)" }}>
                🔍 Detailliertes Debug-Protokoll der Nährwert-Berechnung
              </Label>
              <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--warm-gray)" }}>
                {editedRecipe.nutrition_debug_log}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {nutritionFields.map(field => (
              <div key={field.key}>
                <Label className="text-sm mb-2 block font-semibold">{field.label}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedRecipe.nutrition_per_serving?.[field.key] || ""}
                  onChange={(e) => updateNutrition(field.key, e.target.value)}
                  className="rounded-xl py-4 text-sm"
                  placeholder="0"
                />
                {editedRecipe.nutrition_per_serving?.[field.key] === 0 || !editedRecipe.nutrition_per_serving?.[field.key] ? (
                  <p className="text-xs mt-1 text-amber-600">⚠️ Wert fehlt oder ist 0</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients - MEHR PLATZ */}
        <div className={getFieldClassName("ingredients")}>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">Zutaten {isFieldEnriched("ingredients") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Hinzufügen
            </Button>
          </div>
          <div className="space-y-3">
            {editedRecipe.ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-12 gap-3">
                <Input
                  type="number"
                  placeholder="Menge"
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                  className="col-span-2 rounded-xl py-4 text-sm"
                />
                <Input
                  placeholder="Einheit"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  className="col-span-2 rounded-xl py-4 text-sm"
                />
                <Input
                  placeholder="Zutat"
                  value={ingredient.ingredient_name}
                  onChange={(e) => updateIngredient(index, "ingredient_name", e.target.value)}
                  className="col-span-4 rounded-xl py-4 text-sm"
                />
                <Input
                  placeholder="Notizen (optional)"
                  value={ingredient.preparation_notes || ""}
                  onChange={(e) => updateIngredient(index, "preparation_notes", e.target.value)}
                  className="col-span-3 rounded-xl py-4 text-sm"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="col-span-1">
                  <Trash2 className="w-4 h-4" style={{ color: COLORS.TERRACOTTA }} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className={getFieldClassName("instructions")}>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-semibold">Zubereitungsschritte {isFieldEnriched("instructions") && <span className="text-xs" style={{ color: COLORS.TERRACOTTA }}>● Auto-ergänzt</span>}</Label>
            {!hasInstructionGroups && (
              <Button type="button" variant="outline" size="sm" onClick={addInstruction} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Hinzufügen
              </Button>
            )}
          </div>

          {hasInstructionGroups ? (
            <div className="space-y-6">
              {editedRecipe.instruction_groups.map((group, groupIndex) => (
                <div key={groupIndex} className="p-6 rounded-2xl" style={{ backgroundColor: "rgba(139, 157, 131, 0.05)", border: "2px solid rgba(139, 157, 131, 0.2)" }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: "var(--sage)" }}>
                    {group.group_name}
                  </h3>
                  <div className="space-y-4">
                    {group.instructions.map((instruction, instIndex) => (
                      <div key={instIndex} className="flex gap-4 items-start">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                          style={{ backgroundColor: COLORS.ACCENT, color: "white" }}
                        >
                          {instruction.step_number}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed" style={{ color: "var(--warm-gray)" }}>
                            {instruction.step_description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {editedRecipe.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                    style={{ backgroundColor: COLORS.ACCENT, color: "white" }}
                  >
                    {instruction.step_number}
                  </div>
                  <Textarea
                    value={instruction.step_description}
                    onChange={(e) => updateInstruction(index, "step_description", e.target.value)}
                    className="flex-1 rounded-xl min-h-[100px] text-sm"
                    rows={3}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeInstruction(index)} className="mt-2">
                    <Trash2 className="w-4 h-4" style={{ color: COLORS.TERRACOTTA }} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* FOOTER MIT BUTTONS - NUR WENN onCancel vorhanden UND hideActionButtons = false */}
      {onCancel && !hideActionButtons && (
        <div className="border-t p-6 bg-gray-50 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl"
            style={{
              backgroundColor: canSave ? COLORS.ACCENT : "#9CA3AF",
              color: "white",
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? "pointer" : "not-allowed"
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Änderungen übernehmen
          </Button>
        </div>
      )}

      <style>{`
        .enriched-field {
          position: relative;
          padding: 1rem;
          border-radius: 12px;
          border: 2px solid rgba(224, 120, 86, 0.3);
          background: rgba(224, 120, 86, 0.05);
          transition: all 0.3s ease;
        }
        .enriched-field::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(224, 120, 86, 0.2), rgba(224, 120, 86, 0.05));
          z-index: -1;
        }
        .enriched-field:hover {
          border-color: rgba(224, 120, 86, 0.5);
          background: rgba(224, 120, 86, 0.08);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(224, 120, 86, 0.15);
        }
      `}</style>
    </Card>
  );
}
