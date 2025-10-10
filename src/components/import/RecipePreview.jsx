import React, { useState, useEffect } from "react";
import { RecipeCategory } from "@/api/entities";
import { MainIngredient } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Save, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { generateRecipeImage } from "./ImageGenerationHelper";

// TASK 3: Import sub-components
import RecipeBasicInfo from "../recipe-preview/RecipeBasicInfo";
import RecipeImageSection from "../recipe-preview/RecipeImageSection";
import RecipeCategories from "../recipe-preview/RecipeCategories";
import RecipeIngredients from "../recipe-preview/RecipeIngredients";
import RecipeInstructions from "../recipe-preview/RecipeInstructions";

const COLORS = {
  ACCENT: "#FF5722"
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
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [editedRecipe, setEditedRecipe] = useState({
    ...recipe,
    ingredients: recipe.ingredients || [],
    ingredient_groups: recipe.ingredient_groups || [],
    instructions: recipe.instructions || [],
    instruction_groups: recipe.instruction_groups || [],
    nutrition_per_serving: recipe.nutrition_per_serving || {},
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationStage, setImageGenerationStage] = useState(null);
  const [imageGenerationError, setImageGenerationError] = useState(null);
  const [showSkipImageOption, setShowSkipImageOption] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(recipe.image_url || null);
  const [imageGenerationProgress, setImageGenerationProgress] = useState(0);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    setEditedRecipe({
      ...recipe,
      ingredients: recipe.ingredients || [],
      ingredient_groups: recipe.ingredient_groups || [],
      instructions: recipe.instructions || [],
      instruction_groups: recipe.instruction_groups || [],
      nutrition_per_serving: recipe.nutrition_per_serving || {},
      equipment: recipe.equipment || [],
      tags: recipe.tags || [],
      meal_type: recipe.meal_type || "",
      gang: recipe.gang || "",
      cuisine: recipe.cuisine || "",
      main_ingredient: recipe.main_ingredient || ""
    });
    setGeneratedImageUrl(recipe.image_url || null);
    setIsGeneratingImage(false);
    setImageGenerationStage(null);
    setImageGenerationError(null);
    setShowSkipImageOption(false);
    setImageGenerationProgress(0);
  }, [recipe]);

  useEffect(() => {
    if (!propCategories || propCategories.length === 0) {
      loadCategories();
    }
    if (!propMainIngredients || propMainIngredients.length === 0) {
      loadMainIngredients();
    }
  }, [propCategories, propMainIngredients]);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadCategories = async () => {
    const cats = await RecipeCategory.list("name");
    const categoriesByType = {
      meal: cats.filter(c => c.category_type === "meal").sort((a, b) => (a.order || 0) - (b.order || 0)),
      gang: cats.filter(c => c.category_type === "gang").sort((a, b) => (a.order || 0) - (b.order || 0)),
      cuisine: cats.filter(c => c.category_type === "cuisine").sort((a, b) => (a.order || 0) - (b.order || 0))
    };
    setCategories(categoriesByType);
  };

  const loadMainIngredients = async () => {
    const data = await MainIngredient.list("name");
    setMainIngredients(data);
  };

  // ============================================
  // HANDLERS
  // ============================================
  const updateField = (field, value) => {
    const updated = { ...editedRecipe, [field]: value };
    setEditedRecipe(updated);
    if (field === "meal_type" && value) setShowMealTypeWarning(false);
    if (field === "gang" && value) setShowGangWarning(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { UploadFile } = await import("@/api/integrations");
      const { file_url } = await UploadFile({ file });
      setEditedRecipe(prev => ({ ...prev, image_url: file_url }));
      setGeneratedImageUrl(file_url);
    } catch (err) {
      console.error("Fehler beim Hochladen:", err);
      alert("Fehler beim Hochladen des Bildes: " + err.message);
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
    setImageGenerationProgress(0);

    try {
      const { url, prompt } = await generateRecipeImage(editedRecipe, (progress) => {
        setImageGenerationStage(progress.message);
        setImageGenerationProgress(progress.progress || 0);
        
        if (progress.stage === 'error' && progress.canSkip) {
          setShowSkipImageOption(true);
          setImageGenerationError(progress.message);
        }
      });

      console.log("✅ Image generated with prompt:", prompt);

      setGeneratedImageUrl(url);
      setEditedRecipe(prev => ({ ...prev, image_url: url }));
      setImageGenerationStage("Bild erfolgreich generiert!");
      setImageGenerationError(null);
      setImageGenerationProgress(100);

      setTimeout(() => {
        setImageGenerationStage(null);
      }, 2000);

    } catch (err) {
      console.error("Image generation failed:", err);
      const errorMsg = err.message || "Fehler bei der Bildgenerierung.";
      setImageGenerationError(errorMsg);
      setImageGenerationStage(null);
      setShowSkipImageOption(true);
      setImageGenerationProgress(0);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSkipImage = () => {
    setImageGenerationError(null);
    setShowSkipImageOption(false);
    setImageGenerationStage(null);
    setIsGeneratingImage(false);
    setImageGenerationProgress(0);
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
    
    const recipeToSave = {
      ...editedRecipe,
      image_url: generatedImageUrl || editedRecipe.image_url
    };

    if (onSave && typeof onSave === 'function') {
      onSave(recipeToSave);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const isFieldEnriched = (fieldName) => enrichedFields.includes(fieldName);
  const canSave = editedRecipe.meal_type && editedRecipe.gang;

  // ============================================
  // RENDER
  // ============================================
  return (
    <Card className="rounded-2xl shadow-lg bg-white">
      {/* HEADER WITH BUTTONS */}
      {onCancel && !hideActionButtons && (
        <CardHeader className="border-b p-6 bg-white sticky top-0 z-50 shadow-sm">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Rezept überprüfen und bearbeiten
          </h2>
          
          {enrichedFields.length > 0 && (
            <p className="text-sm mb-4 text-gray-600">
              Felder mit <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-terracotta"></span> wurden automatisch ergänzt</span>
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
        {/* TASK 3: Use sub-components */}
        <RecipeBasicInfo 
          recipe={editedRecipe} 
          onChange={updateField} 
          isFieldEnriched={isFieldEnriched}
        />

        <RecipeImageSection 
          recipe={editedRecipe}
          onChange={updateField}
          isFieldEnriched={isFieldEnriched}
          onGenerateImage={handleGenerateImage}
          isGenerating={isGeneratingImage}
          generationStage={imageGenerationStage}
          generationProgress={imageGenerationProgress}
          generationError={imageGenerationError}
          showSkipOption={showSkipImageOption}
          onSkipGeneration={handleSkipImage}
          onUploadImage={handleImageUpload}
        />

        <RecipeCategories 
          recipe={editedRecipe}
          onChange={updateField}
          categories={categories}
          mainIngredients={mainIngredients}
          isFieldEnriched={isFieldEnriched}
          showMealTypeWarning={showMealTypeWarning}
          showGangWarning={showGangWarning}
        />

        <RecipeIngredients 
          recipe={editedRecipe}
          onChange={updateField}
          isFieldEnriched={isFieldEnriched}
        />

        <RecipeInstructions 
          recipe={editedRecipe}
          onChange={updateField}
          isFieldEnriched={isFieldEnriched}
        />
      </CardContent>

      {/* FOOTER WITH BUTTONS */}
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
        .text-terracotta {
          color: #E07856;
        }
        .bg-terracotta {
          background-color: #E07856;
        }
      `}</style>
    </Card>
  );
}