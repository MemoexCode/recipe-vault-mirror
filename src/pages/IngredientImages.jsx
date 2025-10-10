
import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Sparkles, Zap, ImageIcon, Search,
  Grid3x3, List, TrendingUp, AlertCircle, Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import { IngredientImage } from "@/api/entities";
import { Badge } from "@/components/ui/badge";

// Import refactored components
import ImageGenerationService from "../components/ingredient-images/ImageGenerationService";
import { BASIC_INGREDIENTS, getAllExtendedIngredients, EXTENDED_INGREDIENTS, CATEGORY_LABELS, findIngredientCategory } from "../components/ingredient-images/constants";
import QuickGenerateCard from "../components/ingredient-images/QuickGenerateCard";
import BulkProgressAlert from "../components/ingredient-images/BulkProgressAlert";
import ImageGrid from "../components/ingredient-images/ImageGrid";
import ImageList from "../components/ingredient-images/ImageList";
import GroupedImageView from "../components/ingredient-images/GroupedImageView";
import MissingImagesPanel from "../components/ingredient-images/MissingImagesPanel";
import AddImageDialog from "../components/ingredient-images/AddImageDialog";
import TagEditorDialog from "../components/ingredient-images/TagEditorDialog";
import RegenerateImageDialog from "../components/ingredient-images/RegenerateImageDialog";
import ImageStatsPanel from "../components/ingredient-images/ImageStatsPanel";
import AdvancedLibraryDialog from "../components/ingredient-images/AdvancedLibraryDialog";

export default function IngredientImagesPage() {
  const navigate = useNavigate();

  // Context Data
  const {
    ingredientImages: images,
    activeRecipes: recipes,
    isLoading,
    createIngredientImage,
    updateIngredientImage,
    deleteIngredientImage,
    refreshIngredientImages
  } = useApp();

  // Local State
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [viewMode, setViewMode] = useState("grouped"); // "grid" | "list" | "grouped"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("usage"); // "usage" | "name" | "date"

  // Neu: Scroll zu neuem Bild
  const [newestImageId, setNewestImageId] = useState(null);

  // Quick Generate State
  const [quickGenerateInput, setQuickGenerateInput] = useState("");
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  // Bulk Generate State
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentName: "" });

  // Dialog State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogIngredient, setDialogIngredient] = useState("");
  const [dialogUploadMethod, setDialogUploadMethod] = useState("generate");
  const [dialogSelectedFile, setDialogSelectedFile] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [isDialogGenerating, setIsDialogGenerating] = useState(false);

  // Tag Editor State
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // Regenerate Image State
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(null);

  // Advanced Library Dialog State
  const [showAdvancedLibrary, setShowAdvancedLibrary] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    // Scroll to newest image if exists
    if (newestImageId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`image-${newestImageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          element.classList.add('ring-4', 'ring-green-500');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-green-500');
          }, 2000);
        }
        setNewestImageId(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [newestImageId]);

  // ============================================
  // COMPUTED VALUES - USAGE STATISTICS
  // ============================================
  const imageUsageMap = useMemo(() => {
    const usageMap = {};

    // Ensure images is an array before proceeding
    if (!Array.isArray(images)) return usageMap;

    images.forEach(img => {
      usageMap[img.id] = {
        count: 0,
        recipes: []
      };
    });

    // Ensure recipes is an array before proceeding
    if (!Array.isArray(recipes)) return usageMap;

    recipes.forEach(recipe => {
      const allIngredients = new Set();

      if (recipe.ingredient_groups && Array.isArray(recipe.ingredient_groups)) {
        recipe.ingredient_groups.forEach(group => {
          if (group.ingredients && Array.isArray(group.ingredients)) {
            group.ingredients.forEach(ing => {
              if (ing.ingredient_name) {
                allIngredients.add(ing.ingredient_name.toLowerCase());
              }
            });
          }
        });
      } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
          if (ing.ingredient_name) {
            allIngredients.add(ing.ingredient_name.toLowerCase());
          }
        });
      }

      images.forEach(img => {
        const mainName = img.ingredient_name.toLowerCase();
        const allNames = [mainName, ...(Array.isArray(img.alternative_names) ? img.alternative_names.map(n => n.toLowerCase()) : [])];

        if (allNames.some(name => allIngredients.has(name))) {
          // Check if usageMap[img.id] exists before accessing its properties
          if (usageMap[img.id]) {
            usageMap[img.id].count++;
            usageMap[img.id].recipes.push({
              id: recipe.id,
              title: recipe.title
            });
          }
        }
      });
    });

    return usageMap;
  }, [images, recipes]);

  // Missing Images Analysis
  const missingImages = useMemo(() => {
    const allUsedIngredients = new Set();

    // Ensure recipes is an array before proceeding
    if (!Array.isArray(recipes)) return [];

    recipes.forEach(recipe => {
      if (recipe.ingredient_groups && Array.isArray(recipe.ingredient_groups)) {
        recipe.ingredient_groups.forEach(group => {
          if (group.ingredients && Array.isArray(group.ingredients)) {
            group.ingredients.forEach(ing => {
              if (ing.ingredient_name) {
                allUsedIngredients.add(ing.ingredient_name.toLowerCase());
              }
            });
          }
        });
      } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
          if (ing.ingredient_name) {
            allUsedIngredients.add(ing.ingredient_name.toLowerCase());
          }
        });
      }
    });

    const existingImageNames = new Set();
    // Ensure images is an array before iterating
    if (Array.isArray(images)) {
      images.forEach(img => {
        existingImageNames.add(img.ingredient_name.toLowerCase());
        if (Array.isArray(img.alternative_names)) {
          img.alternative_names.forEach(alt => {
            existingImageNames.add(alt.toLowerCase());
          });
        }
      });
    }

    const missing = [];
    allUsedIngredients.forEach(ingredient => {
      if (!existingImageNames.has(ingredient)) {
        // Count usage
        let count = 0;
        recipes.forEach(recipe => {
          const recipeIngredients = [];
          if (recipe.ingredient_groups && Array.isArray(recipe.ingredient_groups)) {
            recipe.ingredient_groups.forEach(group => {
              if (group.ingredients && Array.isArray(group.ingredients)) {
                group.ingredients.forEach(ing => {
                  if (ing.ingredient_name) {
                    recipeIngredients.push(ing.ingredient_name.toLowerCase());
                  }
                });
              }
            });
          } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ing => {
              if (ing.ingredient_name) {
                recipeIngredients.push(ing.ingredient_name.toLowerCase());
              }
            });
          }
          if (recipeIngredients.includes(ingredient)) count++;
        });

        missing.push({ name: ingredient, usageCount: count });
      }
    });

    return missing.sort((a, b) => b.usageCount - a.usageCount);
  }, [images, recipes]);

  // Filtered & Sorted Images
  const processedImages = useMemo(() => {
    // Ensure images is an array before proceeding
    if (!Array.isArray(images)) return [];

    let filtered = [...images];

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.ingredient_name.toLowerCase().includes(query) ||
        (Array.isArray(img.alternative_names) && img.alternative_names.some(alt => alt.toLowerCase().includes(query)))
      );
    }

    // Category Filter
    if (selectedCategory !== "all") {
      const categoryIngredients = EXTENDED_INGREDIENTS[selectedCategory] || [];
      filtered = filtered.filter(img =>
        categoryIngredients.some(catIng =>
          catIng.toLowerCase() === img.ingredient_name.toLowerCase() ||
          (Array.isArray(img.alternative_names) && img.alternative_names.some(alt => alt.toLowerCase() === catIng.toLowerCase()))
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "usage") {
        return (imageUsageMap[b.id]?.count || 0) - (imageUsageMap[a.id]?.count || 0);
      } else if (sortBy === "name") {
        return a.ingredient_name.localeCompare(b.ingredient_name);
      } else if (sortBy === "date") {
        return new Date(b.created_date) - new Date(a.created_date);
      }
      return 0;
    });

    return filtered;
  }, [images, searchQuery, selectedCategory, sortBy, imageUsageMap]);

  // Group by category
  const groupedImages = useMemo(() => {
    const groups = {};

    Object.keys(EXTENDED_INGREDIENTS).forEach(category => {
      groups[category] = [];
    });

    // Ensure processedImages is an array before iterating
    if (Array.isArray(processedImages)) {
      processedImages.forEach(img => {
        const category = findIngredientCategory(
          img.ingredient_name,
          Array.isArray(img.alternative_names) ? img.alternative_names : []
        );

        if (groups[category]) {
          groups[category].push(img);
        } else {
          if (!groups['sonstiges']) groups['sonstiges'] = [];
          groups['sonstiges'].push(img);
        }
      });
    }

    return groups;
  }, [processedImages]);

  const imagesWithoutTags = Array.isArray(images)
    ? images.filter(img =>
      !Array.isArray(img.alternative_names) || img.alternative_names.length === 0
    ).length
    : 0;

  const unusedImages = Array.isArray(images)
    ? images.filter(img =>
      (imageUsageMap[img.id]?.count || 0) === 0
    )
    : [];

  // ============================================
  // HANDLERS - QUICK GENERATE
  // ============================================
  const handleQuickGenerate = async () => {
    if (!quickGenerateInput.trim()) return;

    setIsQuickGenerating(true);
    setError(null);
    setRetryAttempt(0);

    // Reset filters für bessere Sichtbarkeit
    setSearchQuery("");
    setSelectedCategory("all");
    setViewMode("grid");

    try {
      const result = await ImageGenerationService.generateIngredientImage(
        quickGenerateInput,
        (attempt) => setRetryAttempt(attempt)
      );

      // AUTO-REFRESH
      await refreshIngredientImages();

      // Find newly created image
      const allImages = await IngredientImage.list("-created_date");
      const newImage = allImages[0];
      if (newImage) {
        setNewestImageId(newImage.id);
      }

      setQuickGenerateInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsQuickGenerating(false);
      setRetryAttempt(0);
    }
  };

  // ============================================
  // HANDLERS - BULK GENERATE
  // ============================================
  const handleBulkGenerate = async (ingredientList, listName) => {
    if (!confirm(`Möchtest du jetzt ${ingredientList.length} ${listName} generieren? Dies kann 10-20 Minuten dauern.`)) {
      return;
    }

    setIsBulkGenerating(true);
    setError(null);

    // Reset filters
    setSearchQuery("");
    setSelectedCategory("all");
    setViewMode("grid");

    try {
      const results = await ImageGenerationService.bulkGenerate(ingredientList, {
        onProgress: (progress) => setBulkProgress(progress),
        onItemComplete: (name) => console.log(`✓ ${name}`),
        onItemSkipped: (name) => console.log(`⊘ ${name}`),
        onItemFailed: (name, err) => console.error(`✗ ${name}:`, err)
      });

      // AUTO-REFRESH
      await refreshIngredientImages();

      const message = [
        'Fertig!',
        `✓ ${results.success.length} erfolgreich`,
        `⊘ ${results.skipped.length} übersprungen`,
        `✗ ${results.failed.length} fehlgeschlagen`,
        results.failed.length > 0 ? `\n\nFehlgeschlagen:\n${results.failed.join(', ')}` : ''
      ].join('\n');

      alert(message);
    } catch (err) {
      setError("Fehler bei der Bulk-Generierung.");
    } finally {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0, currentName: "" });
    }
  };

  // ============================================
  // HANDLERS - BULK GENERATE FROM MISSING
  // ============================================
  const handleBulkGenerateFromMissing = async (ingredientList) => {
    setIsBulkGenerating(true);
    setError(null);

    // Reset filters und wechsle zu "Verwalten" Tab
    setSearchQuery("");
    setSelectedCategory("all");
    setViewMode("grid");

    // Trigger Bulk Generation
    await handleBulkGenerate(ingredientList, "Fehlende Zutaten");
  };

  // ============================================
  // HANDLERS - ADVANCED LIBRARY
  // ============================================
  const handleAdvancedLibraryGenerate = async (ingredientList) => {
    await handleBulkGenerate(ingredientList, "Erweiterte Bibliothek");
    setShowAdvancedLibrary(false);
  };

  // ============================================
  // HANDLERS - BULK TAG GENERATION
  // ============================================
  const handleBulkGenerateTags = async () => {
    const imagesWithoutTagsList = Array.isArray(images)
      ? images.filter(img =>
        !Array.isArray(img.alternative_names) || img.alternative_names.length === 0
      )
      : [];

    if (imagesWithoutTagsList.length === 0) {
      alert("Alle Bilder haben bereits Tags! 🎉");
      return;
    }

    if (!confirm(`${imagesWithoutTagsList.length} Bilder haben noch keine Tags. Jetzt automatisch Tags generieren? (Dauert ca. ${Math.ceil(imagesWithoutTagsList.length / 2)} Minuten)`)) {
      return;
    }

    setIsBulkGenerating(true);
    setError(null);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < imagesWithoutTagsList.length; i++) {
        const image = imagesWithoutTagsList[i];

        setBulkProgress({
          current: i + 1,
          total: imagesWithoutTagsList.length,
          currentName: image.ingredient_name
        });

        try {
          const { generateAlternativeNames } = await import("@/components/utils/ingredientMatcher");
          const tags = await generateAlternativeNames(image.ingredient_name);

          await updateIngredientImage(image.id, {
            alternative_names: tags
          });

          successCount++;
          console.log(`✓ Tags für "${image.ingredient_name}":`, tags);

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
          console.error(`✗ Fehler bei "${image.ingredient_name}":`, err);
          failedCount++;
        }
      }

      await refreshIngredientImages();

      alert(`Fertig!\n✓ ${successCount} Tags generiert\n✗ ${failedCount} fehlgeschlagen`);

    } catch (err) {
      setError("Fehler bei der Tag-Generierung.");
    } finally {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0, currentName: "" });
    }
  };

  // ============================================
  // HANDLERS - DIALOG
  // ============================================
  const handleDialogGenerateImage = async () => {
    if (!dialogIngredient.trim()) return;

    setIsDialogGenerating(true);
    setDialogError(null);
    setRetryAttempt(0);

    try {
      await ImageGenerationService.generateIngredientImage(
        dialogIngredient,
        (attempt) => setRetryAttempt(attempt)
      );

      await refreshIngredientImages();
      closeDialog();
      setError(null);
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setIsDialogGenerating(false);
      setRetryAttempt(0);
    }
  };

  const handleDialogUploadImage = async () => {
    if (!dialogIngredient.trim() || !dialogSelectedFile) return;

    setIsDialogGenerating(true);
    setDialogError(null);

    try {
      const { UploadFile } = await import("@/api/integrations");
      const { file_url } = await UploadFile({ file: dialogSelectedFile });

      await createIngredientImage({
        ingredient_name: dialogIngredient.trim().toLowerCase(),
        image_url: file_url,
        is_generated: false,
        alternative_names: []
      });

      await refreshIngredientImages();
      closeDialog();
    } catch (err) {
      setDialogError("Fehler beim Hochladen des Bildes.");
    } finally {
      setIsDialogGenerating(false);
    }
  };

  const handleDialogSubmit = () => {
    if (dialogUploadMethod === "generate") {
      handleDialogGenerateImage();
    } else {
      handleDialogUploadImage();
    }
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setDialogIngredient("");
    setDialogSelectedFile(null);
    setDialogError(null);
    setDialogUploadMethod("generate");
    setRetryAttempt(0);
  };

  // ============================================
  // HANDLERS - IMAGE MANAGEMENT
  // ============================================
  const handleDeleteImage = async (id) => {
    if (confirm("Zutatenbild wirklich löschen?")) {
      await deleteIngredientImage(id);
    }
  };

  const handleEditTags = (image) => {
    setEditingImage(image);
    setShowTagEditor(true);
  };

  const handleSaveTags = async (updatedImage) => {
    try {
      await updateIngredientImage(updatedImage.id, {
        alternative_names: updatedImage.alternative_names
      });
      setShowTagEditor(false);
      setEditingImage(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Tags:", err);
    }
  };

  const handleRegenerateImage = (image) => {
    setRegeneratingImage(image);
    setShowRegenerateDialog(true);
  };

  const handleSaveRegeneratedImage = async (updatedImage) => {
    try {
      await updateIngredientImage(updatedImage.id, {
        image_url: updatedImage.image_url,
        is_generated: true
      });

      await refreshIngredientImages();
      setNewestImageId(updatedImage.id);

      setShowRegenerateDialog(false);
      setRegeneratingImage(null);
    } catch (err) {
      console.error("Fehler beim Speichern des neuen Bildes:", err);
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Browse"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                Zutatenbilder
              </h1>
              <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                {Array.isArray(images) ? images.length : 0} {Array.isArray(images) && images.length === 1 ? 'Bild' : 'Bilder'}
                {missingImages.length > 0 && (
                  <span className="text-orange-600 font-semibold ml-2">
                    • {missingImages.length} fehlen in Rezepten
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            {imagesWithoutTags > 0 && (
              <Button
                onClick={handleBulkGenerateTags}
                disabled={isBulkGenerating}
                className="text-white font-medium px-6 py-3 rounded-xl"
                style={{ backgroundColor: "#10B981" }}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Tags generieren ({imagesWithoutTags})
              </Button>
            )}
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={isBulkGenerating}
              className="text-white font-medium px-6 py-3 rounded-xl"
              style={{ backgroundColor: COLORS.ACCENT }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Bild hinzufügen
            </Button>
          </div>
        </div>

        {/* STATISTICS PANEL */}
        <ImageStatsPanel
          totalImages={Array.isArray(images) ? images.length : 0}
          unusedImages={unusedImages.length}
          missingImages={missingImages.length}
          imagesWithoutTags={imagesWithoutTags}
        />

        {/* SCHNELLGENERIERUNG */}
        <QuickGenerateCard
          value={quickGenerateInput}
          onChange={setQuickGenerateInput}
          onGenerate={handleQuickGenerate}
          isGenerating={isQuickGenerating}
          error={error}
          retryAttempt={retryAttempt}
        />

        {/* BULK PROGRESS */}
        <BulkProgressAlert progress={bulkProgress} />

        {/* TABS - MIT EINHEITLICHEM STYLING */}
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            <TabsTrigger
              value="manage"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Verwalten ({processedImages.length})
            </TabsTrigger>
            <TabsTrigger
              value="missing"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Fehlende ({missingImages.length})
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-50 data-[state=active]:to-white data-[state=active]:shadow-sm text-gray-600 data-[state=active]:text-gray-900 font-medium transition-all duration-200 relative overflow-hidden data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-transparent data-[state=active]:after:via-orange-500 data-[state=active]:after:to-transparent"
            >
              <Package className="w-4 h-4 mr-2" />
              Bibliothek
            </TabsTrigger>
          </TabsList>

          {/* MANAGE TAB */}
          <TabsContent value="manage" className="space-y-6">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Zutaten suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Alle Kategorien</option>
                    {Object.keys(CATEGORY_LABELS).map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="usage">Nach Nutzung</option>
                    <option value="name">Alphabetisch</option>
                    <option value="date">Nach Datum</option>
                  </select>

                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                      className="rounded-xl"
                    >
                      <Grid3x3 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("list")}
                      className="rounded-xl"
                    >
                      <List className="w-5 h-5" />
                    </Button>
                    <Button
                      variant={viewMode === "grouped" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grouped")}
                      className="rounded-xl"
                      title="Gruppierte Ansicht"
                    >
                      <TrendingUp className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {(searchQuery || selectedCategory !== "all") && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                      className="rounded-xl"
                    >
                      Filter zurücksetzen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {isLoading.ingredientImages ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="aspect-square bg-white rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : processedImages.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                    Keine Bilder gefunden
                  </h3>
                  <p className="mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {searchQuery || selectedCategory !== "all"
                      ? "Passe deine Filter an oder füge neue Bilder hinzu"
                      : "Starte mit den Grundzutaten oder füge eigene Bilder hinzu"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === "grid" && (
                  <ImageGrid
                    images={processedImages}
                    imageUsageMap={imageUsageMap}
                    onDelete={handleDeleteImage}
                    onEditTags={handleEditTags}
                    onRegenerateImage={handleRegenerateImage}
                    newestImageId={newestImageId}
                  />
                )}

                {viewMode === "list" && (
                  <ImageList
                    images={processedImages}
                    imageUsageMap={imageUsageMap}
                    onDelete={handleDeleteImage}
                    onEditTags={handleEditTags}
                    onRegenerateImage={handleRegenerateImage}
                    newestImageId={newestImageId}
                  />
                )}

                {viewMode === "grouped" && (
                  <GroupedImageView
                    groupedImages={groupedImages}
                    imageUsageMap={imageUsageMap}
                    onDelete={handleDeleteImage}
                    onEditTags={handleEditTags}
                    onRegenerateImage={handleRegenerateImage}
                    newestImageId={newestImageId}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* MISSING TAB */}
          <TabsContent value="missing">
            <MissingImagesPanel
              missingImages={missingImages}
              existingImages={Array.isArray(images) ? images : []}
              onGenerateImage={(name) => {
                setDialogIngredient(name);
                setShowAddDialog(true);
              }}
              onLinkImage={async (missingName, existingImage) => {
                const currentTags = Array.isArray(existingImage.alternative_names) ? existingImage.alternative_names : [];
                if (!currentTags.some(tag => tag.toLowerCase() === missingName.toLowerCase())) {
                  await updateIngredientImage(existingImage.id, {
                    alternative_names: [...currentTags, missingName.toLowerCase()]
                  });
                  await refreshIngredientImages();
                }
              }}
              onBulkGenerate={handleBulkGenerateFromMissing}
            />
          </TabsContent>

          {/* LIBRARY TAB */}
          <TabsContent value="library" className="space-y-4">
            <Alert className="rounded-xl" style={{ backgroundColor: "rgba(139, 157, 131, 0.05)" }}>
              <Package className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-700">
                <strong>Erweiterte Bibliothek:</strong> Wähle Kategorien und generiere gezielt Zutatenbilder.
              </AlertDescription>
            </Alert>

            <Card
              className="rounded-2xl hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setShowAdvancedLibrary(true)}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
                    >
                      <Zap className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-1">
                        Erweiterte Bibliothek
                      </h3>
                      <p className="text-gray-600">
                        {getAllExtendedIngredients().length}+ Zutaten aus allen Kategorien
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                  {Object.entries(CATEGORY_LABELS).slice(0, 10).map(([key, label]) => (
                    <Badge key={key} variant="outline" className="text-xs justify-center py-2">
                      {label}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Wähle Kategorien und generiere gezielt
                  </span>
                  <Button
                    className="text-white rounded-xl"
                    style={{ backgroundColor: "#8B5CF6" }}
                    disabled={isBulkGenerating}
                    onClick={() => setShowAdvancedLibrary(true)}
                  >
                    Konfigurieren & Generieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOGS */}
        <AddImageDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            if (!open) closeDialog();
            else setShowAddDialog(true);
          }}
          ingredientName={dialogIngredient}
          onIngredientNameChange={setDialogIngredient}
          uploadMethod={dialogUploadMethod}
          onUploadMethodChange={setDialogUploadMethod}
          selectedFile={dialogSelectedFile}
          onFileSelect={setDialogSelectedFile}
          isGenerating={isDialogGenerating}
          error={dialogError}
          retryAttempt={retryAttempt}
          onSubmit={handleDialogSubmit}
        />

        <TagEditorDialog
          open={showTagEditor}
          onOpenChange={setShowTagEditor}
          image={editingImage}
          onSave={handleSaveTags}
        />

        <RegenerateImageDialog
          open={showRegenerateDialog}
          onOpenChange={setShowRegenerateDialog}
          image={regeneratingImage}
          onSave={handleSaveRegeneratedImage}
        />

        {/* ADVANCED LIBRARY DIALOG */}
        <AdvancedLibraryDialog
          open={showAdvancedLibrary}
          onOpenChange={setShowAdvancedLibrary}
          existingImages={Array.isArray(images) ? images : []}
          onGenerate={handleAdvancedLibraryGenerate}
          isBulkGenerating={isBulkGenerating}
        />
      </div>
    </div>
  );
}
