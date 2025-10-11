
import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Plus, ChefHat, Filter, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { showSuccess, showError, showInfo } from "@/components/ui/toastUtils";
import GlobalLoader from "../components/ui/GlobalLoader";

import RecipeCard from "../components/shared/RecipeCard";
import RecipeDropMenu from "../components/browse/RecipeDropMenu";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import SmartFilterDialog from "../components/browse/SmartFilterDialog";
import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import { createDefaultFilters, DOMAIN_KEYS } from "@/components/utils/domainKeys";

export default function BrowsePage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const categoryFilter = urlParams.get("category");
  
  // Context Data
  const {
    activeRecipes: recipes,
    categoriesByType: categories,
    collections,
    isLoading,
    error: contextError,
    deleteRecipe,
    updateCollection
  } = useApp();

  // Local UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSmartFilter, setShowSmartFilter] = useState(false);
  const [smartFilters, setSmartFilters] = useState(createDefaultFilters());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "confirm",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Abbrechen"
  });

  // ============================================
  // COMPUTED VALUES (MEMOIZED)
  // ============================================
  const currentCategoryName = useMemo(() => {
    if (!categoryFilter) return null;
    
    const allCategories = [
      ...categories.meal,
      ...categories.gang,
      ...categories.cuisine
    ];
    
    return allCategories.find(c => 
      c.name.toLowerCase() === categoryFilter.toLowerCase()
    )?.name;
  }, [categoryFilter, categories]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Search
      const matchesSearch = !searchQuery || 
        recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category Filter
      let matchesCategory = true;
      if (categoryFilter) {
        const mealCat = categories.meal.find(c => c.name.toLowerCase() === categoryFilter.toLowerCase());
        const gangCat = categories.gang.find(c => c.name.toLowerCase() === categoryFilter.toLowerCase());
        const cuisineCat = categories.cuisine.find(c => c.name.toLowerCase() === categoryFilter.toLowerCase());
        
        if (mealCat) {
          matchesCategory = recipe.meal_type === mealCat.name;
        } else if (gangCat) {
          matchesCategory = recipe.gang === gangCat.name;
        } else if (cuisineCat) {
          matchesCategory = recipe.cuisine === cuisineCat.name;
        } else {
          matchesCategory = false;
        }
      }

      // Smart Filters (mit normalisierten Keys)
      const matchesDietaryForm = smartFilters[DOMAIN_KEYS.ERNAEHRUNGSFORM] === "alle" ||
        (recipe.tags || []).includes(smartFilters[DOMAIN_KEYS.ERNAEHRUNGSFORM]);
      
      const matchesDietaryGoal = smartFilters[DOMAIN_KEYS.ERNAEHRUNGSZIEL] === "alle" || (() => {
        const goalTagMap = {
          "abnehmen": ["kalorienarm", "low-carb", "fettarm"],
          "muskeln-aufbauen": ["proteinreich", "high-protein"],
          "fett-reduzieren": ["kalorienarm", "low-carb", "fettarm"],
          "gewicht-halten": ["ausgewogen"]
        };
        const requiredTags = goalTagMap[smartFilters[DOMAIN_KEYS.ERNAEHRUNGSZIEL]] || [];
        return requiredTags.some(tag => (recipe.tags || []).includes(tag));
      })();

      const matchesMealTime = smartFilters[DOMAIN_KEYS.MAHLZEIT] === "alle" || 
        recipe.meal_type === smartFilters[DOMAIN_KEYS.MAHLZEIT];
      
      const matchesGang = smartFilters[DOMAIN_KEYS.GANG] === "alle" || 
        recipe.gang === smartFilters[DOMAIN_KEYS.GANG];
      
      const matchesCuisine = smartFilters[DOMAIN_KEYS.KUECHE] === "alle" || 
        recipe.cuisine === smartFilters[DOMAIN_KEYS.KUECHE];
      
      const matchesSugar = smartFilters[DOMAIN_KEYS.ZUCKERGEHALT] === "alle" || (() => {
        const sugarPerServing = recipe.nutrition_per_serving?.sugar_g;
        if (sugarPerServing === undefined || sugarPerServing === null) return true;
        
        if (smartFilters[DOMAIN_KEYS.ZUCKERGEHALT] === "ohne-zucker") {
          return sugarPerServing <= 1;
        } else if (smartFilters[DOMAIN_KEYS.ZUCKERGEHALT] === "wenig-zucker") {
          return sugarPerServing <= 5;
        }
        return true;
      })();
      
      return matchesSearch && matchesCategory && matchesDietaryForm && 
             matchesDietaryGoal && matchesMealTime && matchesGang && 
             matchesCuisine && matchesSugar;
    });
  }, [recipes, searchQuery, categoryFilter, smartFilters, categories]);

  const areSmartFiltersActive = useMemo(() => 
    Object.values(smartFilters).some(v => v !== "alle"),
    [smartFilters]
  );

  // ============================================
  // HANDLERS (MEMOIZED)
  // ============================================
  const resetSmartFilters = useCallback(() => {
    setSmartFilters(createDefaultFilters());
  }, []);

  const handleDragStart = useCallback((start) => {
    const recipe = recipes.find(r => r.id === start.draggableId);
    setDraggedRecipe(recipe);
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, [recipes]);

  const handleDragEnd = useCallback(async (result) => {
    const { destination, draggableId } = result;
    
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.cursor = '';
    setIsDragging(false);
    setDraggedRecipe(null);

    // WICHTIG: Wenn außerhalb einer Drop-Zone losgelassen, nichts tun
    if (!destination) {
      console.log('Dropped outside droppable area - ignoring');
      return;
    }

    // WICHTIG: Wenn auf sich selbst gedroppt, nichts tun
    if (destination.droppableId === 'all-recipes') {
      console.log('Dropped back to recipes grid - ignoring');
      return;
    }

    const recipe = recipes.find(r => r.id === draggableId);
    if (!recipe) {
      console.error('Recipe not found:', draggableId);
      return;
    }

    try {
      if (destination.droppableId === 'trash') {
        setConfirmDialog({
          open: true,
          type: "delete",
          title: "Rezept löschen?",
          message: `Möchtest du "${recipe.title}" wirklich in den Papierkorb legen?`,
          confirmText: "In Papierkorb legen",
          cancelText: "Abbrechen",
          onConfirm: async () => {
            try {
              await deleteRecipe(recipe.id);
              showSuccess(`"${recipe.title}" wurde in den Papierkorb gelegt.`);
            } catch (err) {
              console.error('Error deleting recipe:', err);
              showError(`Fehler beim Löschen von "${recipe.title}".`);
            } finally {
              // Always close the confirm dialog after the action
              setConfirmDialog(prev => ({ ...prev, open: false }));
            }
          }
        });
        return;
      }
      
      if (destination.droppableId.startsWith('collection-')) {
        const collectionId = destination.droppableId.replace('collection-', '');
        const collection = collections.find(c => c.id === collectionId);
        if (collection) {
          const recipeIds = collection.recipe_ids || [];
          if (!recipeIds.includes(recipe.id)) {
            await updateCollection(collectionId, {
              ...collection,
              recipe_ids: [...recipeIds, recipe.id]
            });
            showSuccess(`"${recipe.title}" wurde zu "${collection.name}" hinzugefügt!`);
          } else {
            showInfo(`"${recipe.title}" ist bereits in "${collection.name}".`);
          }
        }
      }
    } catch (err) {
      console.error('Fehler beim Drag & Drop:', err);
      showError('Fehler beim Aktualisieren. Bitte versuche es erneut.');
    }
  }, [recipes, collections, deleteRecipe, updateCollection]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen p-2 sm:p-4 md:p-6 pb-20" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Error Alert */}
          {(error || contextError) && (
            <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                {error || contextError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    window.location.reload();
                  }}
                  className="ml-0 sm:ml-4 flex-shrink-0"
                >
                  Seite neu laden
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto">
              <div className="md:hidden flex-shrink-0">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                  {currentCategoryName ? (
                    <span className="capitalize">{currentCategoryName}</span>
                  ) : (
                    "Deine Rezeptsammlung"
                  )}
                </h1>
                <p className="text-sm sm:text-base md:text-lg" style={{ color: COLORS.TEXT_SECONDARY }}>
                  {categoryFilter ? (
                    <>{filteredRecipes.length} {filteredRecipes.length === 1 ? 'Rezept' : 'Rezepte'}</>
                  ) : (
                    <>
                      {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
                      {(areSmartFiltersActive || searchQuery !== "") &&
                        ` • ${filteredRecipes.length} gefiltert`
                      }
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
              <Button
                onClick={() => setShowSmartFilter(true)}
                className="text-white font-medium px-3 sm:px-6 py-2 sm:py-3 rounded-xl hover:opacity-90 transition-opacity text-sm sm:text-base flex-1 md:flex-initial"
                style={{ backgroundColor: COLORS.PRIMARY }}
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Smart Filter</span>
                <span className="sm:hidden">Filter</span>
                {areSmartFiltersActive && (
                  <span className="ml-2 bg-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold" style={{ color: COLORS.ACCENT }}>
                    !
                  </span>
                )}
              </Button>
              <Link to={createPageUrl("Import")} className="flex-1 md:flex-initial">
                <Button
                  className="text-white font-medium px-3 sm:px-6 py-2 sm:py-3 rounded-xl hover:opacity-90 transition-opacity w-full text-sm sm:text-base"
                  style={{ backgroundColor: COLORS.ACCENT }}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Rezept hinzufügen</span>
                  <span className="sm:hidden">Hinzufügen</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: COLORS.TEXT_SECONDARY }} />
              <Input
                placeholder="Rezepte suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 py-4 sm:py-6 text-base sm:text-lg rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-offset-0 transition-all duration-150"
                style={{ 
                  '--tw-ring-color': COLORS.ACCENT 
                }}
              />
            </div>
          </div>

          {/* Recipe Grid - ENHANCED WITH SKELETON */}
          {isLoading.recipes ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-12">
              {Array(10).fill(0).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl aspect-square animate-pulse"
                >
                  <div className="h-full flex flex-col">
                    {/* Image skeleton */}
                    <div className="flex-1 bg-gray-200 rounded-t-xl" />
                    {/* Text skeleton */}
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center py-20"
            >
              {/* ENHANCED EMPTY STATE */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <ChefHat 
                  className="w-24 h-24 mx-auto mb-6 opacity-20" 
                  style={{ color: COLORS.TEXT_SECONDARY }} 
                />
              </motion.div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: COLORS.TEXT_PRIMARY }}>
                Keine Rezepte gefunden
              </h3>
              <p className="text-base sm:text-lg mb-8 max-w-md mx-auto" style={{ color: COLORS.TEXT_SECONDARY }}>
                {!areSmartFiltersActive && !searchQuery && !categoryFilter 
                  ? "Beginne deine Sammlung, indem du dein erstes Rezept importierst"
                  : "Versuche, deine Filter anzupassen oder zurückzusetzen"
                }
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {areSmartFiltersActive && (
                  <Button variant="outline" onClick={resetSmartFilters} className="rounded-xl">
                    Smart Filter zurücksetzen
                  </Button>
                )}
                {searchQuery && (
                  <Button variant="outline" onClick={() => setSearchQuery("")} className="rounded-xl">
                    Suchtext löschen
                  </Button>
                )}
                {categoryFilter && (
                  <Link to={createPageUrl("Browse")}>
                    <Button variant="outline" className="rounded-xl">
                      Kategorie-Filter löschen
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl("Import")}>
                  <Button className="text-white font-medium px-6 py-3 rounded-xl" style={{ backgroundColor: COLORS.ACCENT }}>
                    <Plus className="w-5 h-5 mr-2" />
                    Rezept hinzufügen
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <Droppable droppableId="all-recipes" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-12"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredRecipes.map((recipe, index) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        index={index}
                        compact
                        accentColor={COLORS.ACCENT}
                      />
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>

        {/* Drop Menu */}
        <div 
          className={`fixed right-6 top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300 ${
            isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <RecipeDropMenu collections={collections} isVisible={isDragging} />
        </div>
      </div>

      {/* Dialogs */}
      <SmartFilterDialog
        open={showSmartFilter}
        onOpenChange={setShowSmartFilter}
        filters={smartFilters}
        onFiltersChange={setSmartFilters}
        onApply={() => setShowSmartFilter(false)}
        onReset={resetSmartFilters}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
      />
    </DragDropContext>
  );
}
