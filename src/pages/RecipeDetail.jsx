
import React, { useState, useEffect, useMemo } from "react";
// ❌ REMOVED: import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Edit, Clock, Minus, Plus, Flame, Beef, Wheat, Droplet,
  Apple, Candy, Droplets, MoreVertical, Trash2, BookmarkPlus, Share2,
  ChefHat, Timer, Play, Pause, RotateCcw, StickyNote, Save, ShoppingCart
} from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { showSuccess, showError, showInfo } from "@/components/ui/toastUtils"; // Added toast import

import IngredientImage from "../components/recipe/IngredientImage";
import ExportButton from "../components/recipe/ExportButton";
import { useApp } from "@/components/contexts/AppContext";
import { batchMatchIngredients } from "@/components/utils/ingredientMatcher";
import { COLORS, DIFFICULTY_LABELS } from "@/components/utils/constants";
import { groupIngredientsByCategory, SUPERMARKET_CATEGORIES } from "@/components/utils/ingredientCategorizer";
import { enrichInstructionsWithIngredients } from "../components/recipe/AutoIngredientDetector";

export default function RecipeDetailPage() {
  // ❌ REMOVED: const navigate = useNavigate();
  // ❌ REMOVED: const location = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const recipeId = urlParams.get("id");

  // Context Data
  const {
    activeRecipes,
    categoriesByType,
    collections,
    ingredientImages: allIngredientImages,
    isLoading,
    deleteRecipe,
    updateCollection,
    updateRecipe,
    refreshIngredientImages
  } = useApp();

  // Local State
  const [servings, setServings] = useState(null);
  const [showGroupedView, setShowGroupedView] = useState(true);
  const [showCategoryView, setShowCategoryView] = useState(false); // NEU: Supermarkt-Kategorien
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showStickyNav, setShowStickyNav] = useState(false);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const recipe = useMemo(() => {
    return activeRecipes.find(r => r.id === recipeId);
  }, [activeRecipes, recipeId]);

  // WICHTIG: Enriche Rezept automatisch mit fehlenden Zutatenbezügen
  const enrichedRecipe = useMemo(() => {
    if (!recipe) return null;
    return enrichInstructionsWithIngredients(recipe);
  }, [recipe]); // Depend on 'recipe' here, so enrichment happens when the base recipe is loaded/changes.

  // VERWENDE enrichedRecipe STATT recipe für alle Anzeigen
  const mealCategory = useMemo(() => {
    if (!enrichedRecipe?.meal_type) return null;
    return categoriesByType.meal.find(c => c.name === enrichedRecipe.meal_type);
  }, [enrichedRecipe, categoriesByType.meal]);

  const gangCategory = useMemo(() => {
    if (!enrichedRecipe?.gang) return null;
    return categoriesByType.gang.find(c => c.name === enrichedRecipe.gang);
  }, [enrichedRecipe, categoriesByType.gang]);

  const cuisineCategory = useMemo(() => {
    if (!enrichedRecipe?.cuisine) return null;
    return categoriesByType.cuisine.find(c => c.name === enrichedRecipe.cuisine);
  }, [enrichedRecipe, categoriesByType.cuisine]);

  // Ingredient Image Matching - VERWENDE enrichedRecipe
  const ingredientImageMap = useMemo(() => {
    if (!enrichedRecipe) return {};

    const ingredientNames = new Set();

    if (enrichedRecipe.ingredient_groups && enrichedRecipe.ingredient_groups.length > 0) {
      enrichedRecipe.ingredient_groups.forEach(group => {
        group.ingredients?.forEach(ing => {
          if (ing.ingredient_name) {
            ingredientNames.add(ing.ingredient_name);
          }
        });
      });
    } else if (enrichedRecipe.ingredients && enrichedRecipe.ingredients.length > 0) {
      enrichedRecipe.ingredients.forEach(ing => {
        if (ing.ingredient_name) {
            ingredientNames.add(ing.ingredient_name);
          }
      });
    }

    const { matches } = batchMatchIngredients([...ingredientNames], allIngredientImages, 0.75);

    const imageMap = {};
    Object.entries(matches).forEach(([ingredientName, matchData]) => {
      imageMap[ingredientName.toLowerCase()] = matchData.image_url;
    });

    return imageMap;
  }, [enrichedRecipe, allIngredientImages]);

  const nutritionItems = useMemo(() => [
    { icon: Flame, label: "Kalorien", value: enrichedRecipe?.nutrition_per_serving?.calories_kcal, unit: "kcal", color: "#E07856", dailyValue: 2000 },
    { icon: Beef, label: "Protein", value: enrichedRecipe?.nutrition_per_serving?.protein_g, unit: "g", color: "#8B9D83", dailyValue: 50 },
    { icon: Wheat, label: "Kohlenhydrate", value: enrichedRecipe?.nutrition_per_serving?.carbs_g, unit: "g", color: "#D4A373", dailyValue: 260 },
    { icon: Droplet, label: "Fett", value: enrichedRecipe?.nutrition_per_serving?.fat_g, unit: "g", color: "#FFB84D", dailyValue: 70 },
    { icon: Apple, label: "Ballaststoffe", value: enrichedRecipe?.nutrition_per_serving?.fiber_g, unit: "g", color: "#95E1D3", dailyValue: 30 },
    { icon: Candy, label: "Zucker", value: enrichedRecipe?.nutrition_per_serving?.sugar_g, unit: "g", color: "#FF6B6B", dailyValue: 90 },
    { icon: Droplets, label: "Natrium", value: enrichedRecipe?.nutrition_per_serving?.sodium_mg, unit: "mg", color: "#A8D8EA", dailyValue: 2300 },
  ], [enrichedRecipe]);

  const ingredientsByCategory = useMemo(() => {
    let allIngredients = [];

    if (enrichedRecipe?.ingredient_groups && enrichedRecipe.ingredient_groups.length > 0) {
      enrichedRecipe.ingredient_groups.forEach(group => {
        if (group.ingredients) {
          allIngredients.push(...group.ingredients);
        }
      });
    } else {
      allIngredients = enrichedRecipe?.ingredients || [];
    }

    return groupIngredientsByCategory(allIngredients);
  }, [enrichedRecipe]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (enrichedRecipe && servings === null) {
      setServings(enrichedRecipe.servings || 4);
    }
  }, [enrichedRecipe, servings]);

  useEffect(() => {
    if (enrichedRecipe) {
      setNotesText(enrichedRecipe.notes || "");
      setCheckedIngredients(enrichedRecipe.checked_ingredients || []);
    }
  }, [enrichedRecipe]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sticky Nav on Scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyNav(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            showSuccess("⏰ Timer abgelaufen!"); // Replaced alert with showSuccess
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Navigation guard - improved
  useEffect(() => {
    if (isLoading.recipes) return;

    if (!recipeId) {
      // ✅ FIXED: Use window.location instead of navigate
      window.location.href = createPageUrl("Browse");
      return;
    }

    if (activeRecipes.length > 0 && !recipe) {
      // ✅ FIXED: Use window.location instead of navigate
      window.location.href = createPageUrl("Browse");
    }
  }, [recipeId, isLoading.recipes, activeRecipes, recipe]);


  // ============================================
  // HANDLERS
  // ============================================
  const handleDeleteRecipe = async () => {
    if (confirm("Rezept in den Papierkorb legen?")) {
      try {
        await deleteRecipe(recipeId);
        // ✅ FIXED: Use window.location instead of navigate
        window.location.href = createPageUrl("Browse");
        showSuccess("Rezept in den Papierkorb gelegt."); // Added toast
      } catch (err) {
        showError("Fehler beim Löschen des Rezepts."); // Added toast
      }
    }
  };

  const handleAddToCollection = async (collection) => {
    const recipeIds = collection.recipe_ids || [];
    if (!recipeIds.includes(recipe.id)) { // Use original recipe.id for backend operation
      try {
        await updateCollection(collection.id, {
          ...collection,
          recipe_ids: [...recipeIds, recipe.id] // Use original recipe.id for backend operation
        });
        showSuccess(`"${recipe.title}" wurde zu "${collection.name}" hinzugefügt!`); // Replaced alert with showSuccess
      } catch (err) {
        showError("Fehler beim Hinzufügen zur Sammlung."); // Added toast
      }
    } else {
      showInfo(`"${recipe.title}" ist bereits in "${collection.name}".`); // Replaced alert with showInfo
    }
    setShowCollectionDialog(false);
  };

  const handleShare = () => {
    const shareData = {
      title: enrichedRecipe.title,
      text: `Schau dir dieses Rezept an: ${enrichedRecipe.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        showSuccess("Link in Zwischenablage kopiert!"); // Replaced alert with showSuccess
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showSuccess("Link in Zwischenablage kopiert!"); // Replaced alert with showSuccess
    }
  };

  // Safely handle image generation callback
  const handleImageGenerated = () => {
    // Wrap in try-catch to prevent errors from breaking the page
    try {
      if (refreshIngredientImages) {
        refreshIngredientImages();
      }
    } catch (err) {
      console.error("Error refreshing images:", err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateRecipe(recipe.id, { notes: notesText }); // Use original recipe.id for backend operation
      setIsEditingNotes(false);
      showSuccess("Notizen gespeichert!"); // Added toast
    } catch (err) {
      showError("Fehler beim Speichern der Notizen."); // Added toast
    }
  };

  const handleToggleIngredient = async (ingredientName) => {
    const newChecked = checkedIngredients.includes(ingredientName)
      ? checkedIngredients.filter(i => i !== ingredientName)
      : [...checkedIngredients, ingredientName];

    setCheckedIngredients(newChecked);
    await updateRecipe(recipe.id, { checked_ingredients: newChecked }); // Use original recipe.id for backend operation
  };

  const handleAddAllToShoppingList = () => {
    const allIngredients = getAllIngredientsFlat();
    showInfo(`${allIngredients.length} Zutaten zur Einkaufsliste hinzugefügt!`); // Replaced alert with showInfo
    // TODO: In Zukunft mit echter Einkaufsliste integrieren
  };

  const handleStartTimer = (minutes, stepNumber) => {
    setActiveTimer(stepNumber);
    setTimerSeconds(minutes * 60);
    setIsTimerRunning(true);
    showInfo(`Timer für ${minutes} Minuten gestartet!`); // Added toast
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setActiveTimer(null);
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const totalTime = () => {
    const prep = parseInt(enrichedRecipe.prep_time_minutes) || 0;
    const cook = parseInt(enrichedRecipe.cook_time_minutes) || 0;
    return prep + cook;
  };

  const adjustAmount = (amount) => {
    const originalServings = enrichedRecipe.servings || 4;
    const servingRatio = servings / originalServings;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return amount;
    return Math.round(numericAmount * servingRatio * 10) / 10;
  };

  const getAllIngredientsFlat = () => {
    let allIngredients = [];

    if (hasGroupedIngredients) {
      enrichedRecipe.ingredient_groups.forEach(group => {
        if (group.ingredients) {
          allIngredients.push(...group.ingredients);
        }
      });
    } else {
      allIngredients = enrichedRecipe.ingredients || [];
    }

    const aggregatedMap = {};

    allIngredients.forEach(ingredient => {
      const nameLower = ingredient.ingredient_name.toLowerCase().trim();

      if (!aggregatedMap[nameLower]) {
        aggregatedMap[nameLower] = {
          ingredient_name: ingredient.ingredient_name,
          amounts: []
        };
      }

      aggregatedMap[nameLower].amounts.push({
        amount: ingredient.amount,
        unit: ingredient.unit,
        preparation_notes: ingredient.preparation_notes
      });
    });

    return Object.values(aggregatedMap).map(item => {
      const unitGroups = {};
      let allNotes = new Set();

      item.amounts.forEach(amountObj => {
        const unitKey = amountObj.unit ? amountObj.unit.toLowerCase().trim() : '';

        if (!unitGroups[unitKey]) {
          unitGroups[unitKey] = {
            totalAmount: 0,
            unit: amountObj.unit || ''
          };
        }

        unitGroups[unitKey].totalAmount += amountObj.amount;

        if (amountObj.preparation_notes) {
          allNotes.add(amountObj.preparation_notes);
        }
      });

      const unitGroupsArray = Object.values(unitGroups);
      const primaryUnitGroup = unitGroupsArray.length > 0 ? unitGroupsArray[0] : { totalAmount: 0, unit: '' };

      return {
        ingredient_name: item.ingredient_name,
        amount: primaryUnitGroup.totalAmount,
        unit: primaryUnitGroup.unit,
        additionalAmounts: unitGroupsArray.slice(1),
        preparation_notes: allNotes.size > 0 ? Array.from(allNotes).join(', ') : undefined
      };
    });
  };

  const formatTimerTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const hasGroupedIngredients = enrichedRecipe?.ingredient_groups && enrichedRecipe.ingredient_groups.length > 0;

  if (isLoading.recipes) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="animate-pulse text-gray-600">Rezept wird geladen...</div>
      </div>
    );
  }

  if (!enrichedRecipe) {
    return null;
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      {/* Sticky Navigation */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-lg transition-transform duration-300 ${
          showStickyNav ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = createPageUrl("Browse")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="font-semibold text-lg truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
              {enrichedRecipe.title}
            </h2>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = `${createPageUrl("EditRecipe")}?id=${enrichedRecipe.id}`}
            >
              <Edit className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-[400px] overflow-hidden">
        {enrichedRecipe.image_url ? (
          <img
            src={enrichedRecipe.image_url}
            alt={enrichedRecipe.title}
            className="w-full h-full object-cover"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
            loading="eager"
          />
        ) : (
          <div
            className="w-full h-full relative flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${COLORS.SILVER_LIGHT} 0%, ${COLORS.SILVER} 100%)`
            }}
          >
            <div className="text-center">
              <ChefHat className="w-24 h-24 mx-auto mb-4" style={{ color: COLORS.SILVER }} />
              <h3 className="text-2xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                {enrichedRecipe.title}
              </h3>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.href = createPageUrl("Browse")}
              className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white w-12 h-12 shadow-xl border-0"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </Button>

            <div className="flex gap-2">
              <ExportButton
                recipe={enrichedRecipe}
                variant="outline"
                className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl border-0 text-gray-700"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white w-12 h-12 shadow-xl border-0"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-700" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                  <DropdownMenuItem
                    onClick={() => window.location.href = `${createPageUrl("EditRecipe")}?id=${enrichedRecipe.id}`}
                    className="rounded-xl py-3 cursor-pointer"
                  >
                    <Edit className="w-5 h-5 mr-3 text-gray-600" />
                    <span className="text-gray-600">Rezept bearbeiten</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowCollectionDialog(true)}
                    className="rounded-xl py-3 cursor-pointer"
                  >
                    <BookmarkPlus className="w-5 h-5 mr-3 text-gray-600" />
                    <span className="text-gray-600">Zu Sammlung hinzufügen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleShare}
                    className="rounded-xl py-3 cursor-pointer"
                  >
                    <Share2 className="w-5 h-5 mr-3" />
                    <span className="text-gray-600">Teilen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteRecipe}
                    className="rounded-xl py-3 cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5 mr-3 text-red-500" />
                    <span className="text-red-500">Rezept löschen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Quick Info Badges */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3">
          {totalTime() > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg">
              <Clock className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-700">
                {totalTime()} Min
              </span>
            </div>
          )}
          {enrichedRecipe.nutrition_per_serving?.calories_kcal && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg">
              <Flame className="w-5 h-5" style={{ color: COLORS.ACCENT }} />
              <span className="font-semibold text-gray-700">
                {enrichedRecipe.nutrition_per_serving.calories_kcal} kcal
              </span>
            </div>
          )}
          {enrichedRecipe.servings && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg">
              <ChefHat className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-700">
                {enrichedRecipe.servings} Portionen
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content - OPTIMIERTE ABSTÄNDE & TYPOGRAFIE */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {/* Title & Badges - Verbesserte visuelle Hierarchie */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 text-gray-900 leading-tight tracking-tight">
            {enrichedRecipe.title}
          </h1>

          {/* Badge Groups - Klarere Hierarchie */}
          <div className="space-y-3">
            {/* Primary Categories */}
            <div className="flex flex-wrap items-center gap-2">
              {mealCategory && (
                <Badge
                  className="px-3 py-1.5 rounded-full font-medium capitalize text-sm"
                  style={{
                    backgroundColor: `${mealCategory.color || COLORS.ACCENT}20`,
                    color: mealCategory.color || COLORS.ACCENT,
                    border: `2px solid ${mealCategory.color || COLORS.ACCENT}`
                  }}
                >
                  {mealCategory.name}
                </Badge>
              )}

              {gangCategory && (
                <Badge
                  className="px-3 py-1.5 rounded-full font-medium capitalize text-sm"
                  style={{
                    backgroundColor: `${gangCategory.color || COLORS.ACCENT}20`,
                    color: gangCategory.color || COLORS.ACCENT,
                    border: `2px solid ${gangCategory.color || COLORS.ACCENT}`
                  }}
                >
                  {gangCategory.name}
                </Badge>
              )}

              {cuisineCategory && (
                <Badge
                  className="px-3 py-1.5 rounded-full font-medium capitalize text-sm"
                  style={{
                    backgroundColor: `${cuisineCategory.color || COLORS.ACCENT}15`,
                    color: cuisineCategory.color || COLORS.ACCENT
                  }}
                >
                  🌍 {cuisineCategory.name}
                </Badge>
              )}
            </div>

            {/* Secondary Properties */}
            {(enrichedRecipe.main_ingredient || enrichedRecipe.difficulty) && (
              <div className="flex flex-wrap items-center gap-2">
                {enrichedRecipe.main_ingredient && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1.5 rounded-full font-medium capitalize border-2 border-gray-300 text-gray-700 text-sm"
                  >
                    🥘 {enrichedRecipe.main_ingredient}
                  </Badge>
                )}

                {enrichedRecipe.difficulty && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1.5 rounded-full font-medium border-2 border-gray-300 text-gray-700 text-sm"
                  >
                    {DIFFICULTY_LABELS[enrichedRecipe.difficulty] || enrichedRecipe.difficulty}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Beschreibung - Optimierte Typografie */}
        {enrichedRecipe.description && (
          <div className="mb-10">
            <p className="text-base sm:text-lg leading-relaxed text-gray-700 max-w-3xl" style={{ lineHeight: '1.75' }}>
              {enrichedRecipe.description}
            </p>
          </div>
        )}

        {/* Tabs - Moderne Navigation mit Unterstreichung */}
        <Tabs defaultValue="zubereitung" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            <TabsTrigger
              value="zutaten"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
              style={{
                '--tw-gradient-via': COLORS.ACCENT
              }}
            >
              Zutaten
            </TabsTrigger>
            <TabsTrigger
              value="zubereitung"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
              style={{
                '--tw-gradient-via': COLORS.ACCENT
              }}
            >
              Zubereitung
            </TabsTrigger>
            <TabsTrigger
              value="nahrwerte"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
              style={{
                '--tw-gradient-via': COLORS.ACCENT
              }}
            >
              Nährwerte
            </TabsTrigger>
            <TabsTrigger
              value="notizen"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
              style={{
                '--tw-gradient-via': COLORS.ACCENT
              }}
            >
              <StickyNote className="w-4 h-4 mr-1" />
              Notizen
              {enrichedRecipe.notes && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.ACCENT }} />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ZUTATEN TAB */}
          <TabsContent value="zutaten" className="space-y-6">
            <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
              <CardContent className="p-6 sm:p-8">
                {/* Portionen & Einkaufsliste */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-gray-800">
                      Portionen:
                    </span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setServings(Math.max(1, servings - 1))}
                        className="rounded-full w-10 h-10 border-2 hover:border-gray-400 transition-colors"
                        disabled={servings <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span
                        className="text-2xl font-bold min-w-[60px] text-center px-4 py-2 rounded-xl text-white shadow-md"
                        style={{ backgroundColor: COLORS.ACCENT }}
                      >
                        {servings}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setServings(servings + 1)}
                        className="rounded-full w-10 h-10 border-2 hover:border-gray-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddAllToShoppingList}
                    className="text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: COLORS.ACCENT }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Zur Einkaufsliste
                  </Button>
                </div>

                {/* ANSICHT-TOGGLE */}
                <div className="flex justify-center mb-8 flex-wrap gap-3">
                  {hasGroupedIngredients && (
                    <div className="inline-flex rounded-xl bg-gray-100 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowGroupedView(true);
                          setShowCategoryView(false);
                        }}
                        className={`rounded-lg px-4 transition-all duration-200 ${showGroupedView && !showCategoryView ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                      >
                        Gruppiert
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowGroupedView(false);
                          setShowCategoryView(false);
                        }}
                        className={`rounded-lg px-4 transition-all duration-200 ${!showGroupedView && !showCategoryView ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                      >
                        Gesamtliste
                      </Button>
                    </div>
                  )}

                  <div className="inline-flex rounded-xl bg-gray-100 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCategoryView(prev => {
                          const newShowCategoryView = !prev;
                          if (newShowCategoryView) { // if we are turning category view ON
                            setShowGroupedView(false); // disable grouped view
                          }
                          return newShowCategoryView;
                        });
                      }}
                      className={`rounded-lg px-4 transition-all duration-200 ${showCategoryView ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                    >
                      🛒 Supermarkt-Ansicht
                    </Button>
                  </div>
                </div>

                {/* ZUTATEN - SUPERMARKT-KATEGORISIERUNG */}
                {showCategoryView ? (
                  <div className="space-y-10">
                    {Object.entries(ingredientsByCategory).map(([category, ingredients]) => {
                      const categoryInfo = SUPERMARKET_CATEGORIES[category] || SUPERMARKET_CATEGORIES.sonstiges;
                      
                      return (
                        <div key={category}>
                          <div className="flex items-center gap-3 mb-5 pb-3 border-b-2" style={{ borderColor: categoryInfo.color }}>
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                              style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                            >
                              {categoryInfo.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                              {categoryInfo.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className="ml-auto"
                              style={{ borderColor: categoryInfo.color, color: categoryInfo.color }}
                            >
                              {ingredients.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ingredients.map((ingredient, index) => {
                              const isChecked = checkedIngredients.includes(ingredient.ingredient_name);
                              return (
                                <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleToggleIngredient(ingredient.ingredient_name)}
                                    className="flex-shrink-0"
                                  />
                                  <IngredientImage
                                    ingredient={ingredient.ingredient_name}
                                    className="w-16 h-16 flex-shrink-0"
                                    preloadedUrl={ingredientImageMap[ingredient.ingredient_name.toLowerCase()]}
                                    isLoading={false}
                                    onImageGenerated={handleImageGenerated}
                                  />
                                  <div className={`flex-1 ${isChecked ? 'opacity-50 line-through' : ''}`}>
                                    <h4 className="font-medium text-gray-800 text-base">
                                      {ingredient.ingredient_name}
                                    </h4>
                                    <p className="text-sm font-semibold text-gray-600 mt-0.5">
                                      {adjustAmount(ingredient.amount)} {ingredient.unit}
                                    </p>
                                    {ingredient.preparation_notes && (
                                      <p className="text-xs mt-1.5 text-gray-500 leading-relaxed">
                                        ({ingredient.preparation_notes})
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : hasGroupedIngredients && showGroupedView ? (
                  <div className="space-y-10">
                    {enrichedRecipe.ingredient_groups.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        <h3 className="text-xl font-bold mb-5 pb-3 border-b-2 text-orange-600 tracking-tight" style={{ borderColor: COLORS.ACCENT }}>
                          {group.group_name}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.ingredients?.map((ingredient, index) => {
                            const isChecked = checkedIngredients.includes(ingredient.ingredient_name);
                            return (
                              <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleIngredient(ingredient.ingredient_name)}
                                  className="flex-shrink-0"
                                />
                                <IngredientImage
                                  ingredient={ingredient.ingredient_name}
                                  className="w-16 h-16 flex-shrink-0"
                                  preloadedUrl={ingredientImageMap[ingredient.ingredient_name.toLowerCase()]}
                                  isLoading={false}
                                  onImageGenerated={handleImageGenerated}
                                />
                                <div className={`flex-1 ${isChecked ? 'opacity-50 line-through' : ''}`}>
                                  <h4 className="font-medium text-gray-800 text-base">
                                    {ingredient.ingredient_name}
                                  </h4>
                                  <p className="text-sm font-semibold text-gray-600 mt-0.5">
                                    {adjustAmount(ingredient.amount)} {ingredient.unit}
                                  </p>
                                  {ingredient.preparation_notes && (
                                    <p className="text-xs mt-1.5 text-gray-500 leading-relaxed">
                                      ({ingredient.preparation_notes})
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getAllIngredientsFlat().map((ingredient, index) => {
                      const isChecked = checkedIngredients.includes(ingredient.ingredient_name);
                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleIngredient(ingredient.ingredient_name)}
                            className="flex-shrink-0"
                          />
                          <IngredientImage
                            ingredient={ingredient.ingredient_name}
                            className="w-16 h-16 flex-shrink-0"
                            preloadedUrl={ingredientImageMap[ingredient.ingredient_name.toLowerCase()]}
                            isLoading={false}
                            onImageGenerated={handleImageGenerated}
                          />
                          <div className={`flex-1 ${isChecked ? 'opacity-50 line-through' : ''}`}>
                            <h4 className="font-medium text-gray-800 text-base">
                              {ingredient.ingredient_name}
                            </h4>
                            <div className="text-sm font-semibold text-gray-600 mt-0.5">
                              <p>
                                {ingredient.amount !== 0 ? `${adjustAmount(ingredient.amount)} ${ingredient.unit}` : ingredient.unit}
                              </p>
                              {ingredient.additionalAmounts && ingredient.additionalAmounts.length > 0 && (
                                ingredient.additionalAmounts.map((addAmount, idx) => (
                                  <p key={idx}>+ {adjustAmount(addAmount.totalAmount)} {addAmount.unit}</p>
                                ))
                              )}
                            </div>
                            {ingredient.preparation_notes && (
                              <p className="text-xs mt-1.5 text-gray-500 leading-relaxed">
                                ({ingredient.preparation_notes})
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zubereitung" className="space-y-6">
            <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
              <CardContent className="p-6 sm:p-8">
                {/* Active Timer Display */}
                {activeTimer && timerSeconds > 0 && (
                  <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Timer läuft für Schritt {activeTimer}</p>
                        <p className="text-4xl font-bold tracking-tight" style={{ color: COLORS.ACCENT }}>
                          {formatTimerTime(timerSeconds)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePauseTimer}
                          className="rounded-full w-12 h-12"
                        >
                          {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleResetTimer}
                          className="rounded-full w-12 h-12"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {enrichedRecipe.instruction_groups && enrichedRecipe.instruction_groups.length > 0 ? (
                  <div className="space-y-10">
                    {enrichedRecipe.instruction_groups.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        <h3 className="text-xl font-bold mb-5 pb-3 border-b-2 text-orange-600 tracking-tight" style={{ borderColor: COLORS.ACCENT }}>
                          {group.group_name}
                        </h3>
                        <div className="space-y-6">
                          {group.instructions.map((instruction, index) => (
                            <div key={index} className="flex gap-4">
                              <div
                                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md"
                                style={{ backgroundColor: COLORS.ACCENT }}
                              >
                                {instruction.step_number}
                              </div>
                              <div className="flex-1">
                                <p className="text-base leading-loose pt-1 text-gray-800 mb-3">
                                  {instruction.step_description}
                                </p>

                                {instruction.timer_minutes && (
                                  <Button
                                    onClick={() => handleStartTimer(instruction.timer_minutes, instruction.step_number)}
                                    variant="outline"
                                    size="sm"
                                    className="mb-3 rounded-xl"
                                  >
                                    <Timer className="w-4 h-4 mr-2" />
                                    {instruction.timer_minutes} Min Timer starten
                                  </Button>
                                )}

                                {instruction.ingredients_for_step && instruction.ingredients_for_step.length > 0 && (
                                  <div className="flex flex-wrap gap-4 mt-4">
                                    {instruction.ingredients_for_step.map((ingredientName, imgIdx) => {
                                      const allIngredients = hasGroupedIngredients
                                        ? enrichedRecipe.ingredient_groups.flatMap(g => g.ingredients || [])
                                        : enrichedRecipe.ingredients || [];

                                      const ingredientData = allIngredients.find(
                                        ing => ing.ingredient_name.toLowerCase() === ingredientName.toLowerCase()
                                      );

                                      if (!ingredientData) return null;

                                      return (
                                        <div key={imgIdx} className="flex flex-col items-center">
                                          <IngredientImage
                                            ingredient={ingredientName}
                                            className="w-16 h-16 mb-2"
                                            preloadedUrl={ingredientImageMap[ingredientName.toLowerCase()]}
                                            isLoading={false}
                                            onImageGenerated={handleImageGenerated}
                                          />
                                          <p className="text-xs font-medium text-gray-700 text-center max-w-[80px]">
                                            {ingredientData.ingredient_name}
                                          </p>
                                          <p className="text-xs text-gray-500 text-center">
                                            {ingredientData.amount > 0 && `${adjustAmount(ingredientData.amount)} `}
                                            {ingredientData.unit}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {enrichedRecipe.instructions?.map((instruction, index) => (
                      <div key={index} className="flex gap-4">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md"
                          style={{ backgroundColor: COLORS.ACCENT }}
                        >
                          {instruction.step_number}
                        </div>
                        <div className="flex-1">
                          <p className="text-base leading-loose pt-1 text-gray-800 mb-3">
                            {instruction.step_description}
                          </p>

                          {instruction.timer_minutes && (
                            <Button
                              onClick={() => handleStartTimer(instruction.timer_minutes, instruction.step_number)}
                              variant="outline"
                              size="sm"
                              className="mb-3 rounded-xl"
                            >
                              <Timer className="w-4 h-4 mr-2" />
                              {instruction.timer_minutes} Min Timer starten
                            </Button>
                          )}

                          {instruction.ingredients_for_step && instruction.ingredients_for_step.length > 0 && (
                            <div className="flex flex-wrap gap-4 mt-4">
                              {instruction.ingredients_for_step.map((ingredientName, imgIdx) => {
                                const allIngredients = hasGroupedIngredients
                                  ? enrichedRecipe.ingredient_groups.flatMap(g => g.ingredients || [])
                                  : enrichedRecipe.ingredients || [];

                                const ingredientData = allIngredients.find(
                                  ing => ing.ingredient_name.toLowerCase() === ingredientName.toLowerCase()
                                );

                                if (!ingredientData) return null;

                                return (
                                  <div key={imgIdx} className="flex flex-col items-center">
                                    <IngredientImage
                                      ingredient={ingredientName}
                                      className="w-16 h-16 mb-2"
                                      preloadedUrl={ingredientImageMap[ingredientName.toLowerCase()]}
                                      isLoading={false}
                                      onImageGenerated={handleImageGenerated}
                                    />
                                    <p className="text-xs font-medium text-gray-700 text-center max-w-[80px]">
                                      {ingredientData.ingredient_name}
                                    </p>
                                    <p className="text-xs text-gray-500 text-center">
                                      {ingredientData.amount > 0 && `${adjustAmount(ingredientData.amount)} `}
                                      {ingredientData.unit}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nahrwerte" className="space-y-6">
            <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-bold text-gray-800">
                    Nährwertangaben
                  </h3>
                  {enrichedRecipe.nutrition_source && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      Quelle: {enrichedRecipe.nutrition_source}
                    </Badge>
                  )}
                </div>
                <p className="text-sm mb-8 text-gray-600">
                  Pro Portion
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {nutritionItems.map((item) => {
                    if (item.value === undefined || item.value === null) return null;

                    const percentage = item.dailyValue ? Math.round((item.value / item.dailyValue) * 100) : null;

                    return (
                      <div
                        key={item.label}
                        className="flex flex-col p-6 rounded-2xl transition-transform hover:scale-105 duration-200"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <item.icon className="w-8 h-8 mb-4" style={{ color: item.color }} />
                        <p className="text-xs mb-2 text-gray-600 font-medium">
                          {item.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold text-gray-800">
                            {item.value}
                          </p>
                          <span className="text-sm font-normal text-gray-600">{item.unit}</span>
                        </div>
                        {percentage !== null && (
                          <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  backgroundColor: item.color,
                                  width: `${Math.min(percentage, 100)}%`
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                              {percentage}% des Tagesbedarfs
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notizen" className="space-y-6">
            <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <StickyNote className="w-6 h-6" style={{ color: COLORS.ACCENT }} />
                    Persönliche Notizen
                  </h3>
                  {!isEditingNotes && (
                    <Button
                      onClick={() => setIsEditingNotes(true)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Bearbeiten
                    </Button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-4">
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Füge deine eigenen Notizen hinzu... z.B. Anpassungen, Tipps, besondere Erinnerungen..."
                      className="min-h-[200px] rounded-xl text-base leading-relaxed"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNotesText(enrichedRecipe.notes || "");
                          setIsEditingNotes(false);
                        }}
                        className="rounded-xl"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={handleSaveNotes}
                        className="text-white rounded-xl"
                        style={{ backgroundColor: COLORS.ACCENT }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {notesText ? (
                      <div
                        className="prose max-w-none text-gray-700 whitespace-pre-wrap p-6 rounded-2xl bg-gray-50 leading-relaxed"
                      >
                        {notesText}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <StickyNote className="w-20 h-20 mx-auto mb-5 text-gray-300" />
                        <p className="text-gray-500 mb-5 text-lg">
                          Noch keine Notizen vorhanden
                        </p>
                        <Button
                          onClick={() => setIsEditingNotes(true)}
                          variant="outline"
                          className="rounded-xl"
                        >
                          Erste Notiz hinzufügen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Button */}
        <div className="mt-10 flex justify-center">
          <ExportButton
            recipe={enrichedRecipe}
            className="text-white hover:opacity-90 text-lg px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            style={{ backgroundColor: COLORS.ACCENT }}
            size="lg"
          />
        </div>
      </div>

      {/* Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zu Sammlung hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {collections.map(collection => (
              <Button
                key={collection.id}
                onClick={() => handleAddToCollection(collection)}
                variant="outline"
                className="w-full justify-start rounded-xl"
              >
                <BookmarkPlus className="w-4 h-4 mr-2" />
                {collection.name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectionDialog(false)} className="rounded-xl">
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
