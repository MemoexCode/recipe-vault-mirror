import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RecipePreview from "../components/import/RecipePreview";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";

export default function EditRecipePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const recipeId = urlParams.get("id");

  // Context Data
  const {
    activeRecipes,
    updateRecipe,
    isLoading
  } = useApp();

  // Local State
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (!recipeId) {
      navigate(createPageUrl("Browse"));
      return;
    }

    if (!isLoading.recipes) {
      const foundRecipe = activeRecipes.find(r => r.id === recipeId);
      
      if (foundRecipe) {
        setRecipe(foundRecipe);
      } else {
        setError("Rezept nicht gefunden.");
      }
    }
  }, [recipeId, activeRecipes, isLoading.recipes, navigate]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSave = async (updatedRecipeData) => {
    try {
      await updateRecipe(recipeId, updatedRecipeData);
      navigate(`${createPageUrl("RecipeDetail")}?id=${recipeId}`);
    } catch (err) {
      setError("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
      console.error(err);
    }
  };

  const handleCancel = () => {
    navigate(`${createPageUrl("RecipeDetail")}?id=${recipeId}`);
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading.recipes) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="animate-pulse text-gray-600">Rezept wird geladen...</div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error && !recipe) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(createPageUrl("Browse"))} className="mt-4 rounded-xl">
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // NO RECIPE STATE
  // ============================================
  if (!recipe) {
    return null;
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handleCancel}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Rezept bearbeiten
            </h1>
            <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              {recipe.title}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recipe Preview Component */}
        <RecipePreview 
          recipe={recipe}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}