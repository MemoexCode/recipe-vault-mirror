
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Plus, Trash2, Pencil, Check, X
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApp } from "@/components/contexts/AppContext";
import { getIconComponent, AVAILABLE_ICONS } from "@/components/utils/iconMapper";
import { COLORS, CATEGORY_TYPES } from "@/components/utils/constants";

export default function CategoriesPage() {
  
  // Context Data
  const {
    categories,
    categoriesByType,
    recipeCounts,
    activeRecipes,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory
  } = useApp();

  // Local State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [newCategory, setNewCategory] = useState({ 
    name: "", 
    category_type: CATEGORY_TYPES.CUISINE,
    icon: "ChefHat",
    color: COLORS.ACCENT 
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const getCategoryStats = (category) => {
    let categoryRecipes = [];
    
    if (category.category_type === CATEGORY_TYPES.MEAL) {
      categoryRecipes = activeRecipes.filter(r => r.meal_type === category.name);
    } else if (category.category_type === CATEGORY_TYPES.GANG) {
      categoryRecipes = activeRecipes.filter(r => r.gang === category.name);
    } else if (category.category_type === CATEGORY_TYPES.CUISINE) {
      categoryRecipes = activeRecipes.filter(r => r.cuisine === category.name);
    }
    
    const count = categoryRecipes.length;
    
    if (count === 0) return { count, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
    
    const totals = categoryRecipes.reduce((acc, recipe) => {
      if (recipe.nutrition_per_serving) {
        acc.calories += recipe.nutrition_per_serving.calories_kcal || 0;
        acc.protein += recipe.nutrition_per_serving.protein_g || 0;
        acc.carbs += recipe.nutrition_per_serving.carbs_g || 0;
        acc.fat += recipe.nutrition_per_serving.fat_g || 0;
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      count,
      avgCalories: Math.round(totals.calories / count),
      avgProtein: Math.round(totals.protein / count),
      avgCarbs: Math.round(totals.carbs / count),
      avgFat: Math.round(totals.fat / count)
    };
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    
    await createCategory({
      name: newCategory.name.trim().toLowerCase(),
      category_type: newCategory.category_type,
      icon: newCategory.icon,
      color: COLORS.ACCENT,
      order: categories.filter(c => c.category_type === newCategory.category_type).length,
      is_system: false
    });
    
    setNewCategory({ 
      name: "", 
      category_type: CATEGORY_TYPES.CUISINE, 
      icon: "ChefHat", 
      color: COLORS.ACCENT 
    });
    setShowAddDialog(false);
  };

  const handleDeleteCategory = async (category) => {
    if (category.is_system) {
      alert("System-Kategorien können nicht gelöscht werden!");
      return;
    }
    
    const stats = getCategoryStats(category);
    if (stats.count > 0) {
      if (!confirm(`Diese Kategorie enthält ${stats.count} Rezepte. Möchtest du sie wirklich löschen? Die Rezepte bleiben erhalten, verlieren aber diese Kategoriezuordnung.`)) {
        return;
      }
    } else {
      if (!confirm(`Möchtest du die Kategorie "${category.name}" wirklich löschen?`)) {
        return;
      }
    }
    
    await deleteCategory(category.id);
  };

  const handleUpdateIcon = async (category, newIcon) => {
    if (category.is_system) {
      alert("System-Kategorien können nicht bearbeitet werden!");
      return;
    }
    await updateCategory(category.id, { icon: newIcon });
  };

  const handleStartEditName = (category) => {
    if (category.is_system) {
      alert("System-Kategorien können nicht bearbeitet werden!");
      return;
    }
    setEditingCategory(category.id);
    setEditingName(category.name);
  };

  const handleSaveName = async (category) => {
    if (editingName.trim() && editingName.trim() !== category.name) {
      await updateCategory(category.id, { name: editingName.trim().toLowerCase() });
    }
    setEditingCategory(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingName("");
  };

  // ============================================
  // RENDER COMPONENT
  // ============================================
  const CategoryCard = ({ category }) => {
    const stats = getCategoryStats(category);
    const IconComponent = getIconComponent(category.icon);
    const isEditing = editingCategory === category.id;
    const isSystem = category.is_system;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div 
              className="h-3"
              style={{ backgroundColor: category.color || COLORS.ACCENT }}
            />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon selector - disabled for system categories */}
                  {isSystem ? (
                    <div className="w-12 h-12 rounded-full p-0 border-2 flex items-center justify-center" style={{ backgroundColor: `${category.color || COLORS.ACCENT}20`, borderColor: `${category.color || COLORS.ACCENT}40` }}>
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: category.color || COLORS.ACCENT }}
                      />
                    </div>
                  ) : (
                    <Select
                      value={category.icon || "ChefHat"}
                      onValueChange={(value) => handleUpdateIcon(category, value)}
                    >
                      <SelectTrigger className="w-12 h-12 rounded-full p-0 border-2" style={{ backgroundColor: `${category.color || COLORS.ACCENT}20`, borderColor: `${category.color || COLORS.ACCENT}40` }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <IconComponent 
                            className="w-5 h-5" 
                            style={{ color: category.color || COLORS.ACCENT }}
                          />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AVAILABLE_ICONS).map(([iconName, iconData]) => {
                          const IconComp = iconData.component;
                          return (
                            <SelectItem key={iconName} value={iconName}>
                              <div className="flex items-center gap-3">
                                <IconComp className="w-4 h-4" />
                                <span>{iconData.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Name editor */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="text-lg font-medium h-9"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(category);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => handleSaveName(category)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg capitalize truncate block" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {category.name}
                        </span>
                        {!isSystem && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleStartEditName(category)}
                          >
                            <Pencil className="w-3 h-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                        {stats.count} {stats.count === 1 ? 'Rezept' : 'Rezepte'}
                      </span>
                      {isSystem && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          System
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: `${category.color || COLORS.ACCENT}20`, color: category.color || COLORS.ACCENT }}>
                        {category.category_type === CATEGORY_TYPES.MEAL ? "Mahlzeit" : 
                         category.category_type === CATEGORY_TYPES.GANG ? "Gang" : "Küche"}
                      </span>
                    </div>
                  </div>
                </div>
                {!isSystem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category)}
                    className="hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              {stats.count > 0 && (stats.avgCalories > 0 || stats.avgProtein > 0) && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs mb-3" style={{ color: COLORS.TEXT_SECONDARY }}>
                    Ø Nährwerte pro Portion
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.avgCalories > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {stats.avgCalories} kcal
                        </span>
                      </div>
                    )}
                    {stats.avgProtein > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {stats.avgProtein}g Protein
                        </span>
                      </div>
                    )}
                    {stats.avgCarbs > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {stats.avgCarbs}g Kohlenhydrate
                        </span>
                      </div>
                    )}
                    {stats.avgFat > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {stats.avgFat}g Fett
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-6xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.location.href = createPageUrl("Browse")}
            className="rounded-xl flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Kategorien verwalten
            </h1>
            <p className="text-sm sm:text-base md:text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Verwalte Mahlzeiten, Gänge und Küchen
            </p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="text-white font-medium px-4 sm:px-6 py-2 sm:py-3 rounded-xl w-full sm:w-auto text-sm sm:text-base"
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Kategorie hinzufügen</span>
            <span className="sm:hidden">Hinzufügen</span>
          </Button>
        </div>

        {/* Content */}
        {isLoading.categories ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Plus className="w-16 h-16 mx-auto mb-4" style={{ color: COLORS.TEXT_SECONDARY }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                Noch keine Kategorien
              </h3>
              <p className="mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
                Erstelle deine erste Kategorie, um deine Rezepte zu organisieren
              </p>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="text-white font-medium px-6 py-3 rounded-xl"
                style={{ backgroundColor: COLORS.ACCENT }}
              >
                Kategorie hinzufügen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Mahlzeiten */}
            {categoriesByType.meal.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 uppercase text-xs tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Mahlzeiten (System)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {categoriesByType.meal.map((category) => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Gänge */}
            {categoriesByType.gang.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 uppercase text-xs tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Gänge (System)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {categoriesByType.gang.map((category) => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Küchen */}
            {categoriesByType.cuisine.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 uppercase text-xs tracking-wider" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Küchen (Anpassbar)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {categoriesByType.cuisine.map((category) => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Kategorie hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="category-name" className="mb-2 block">
                  Kategoriename
                </Label>
                <Input
                  id="category-name"
                  placeholder="z.B. Griechisch, Thai, Spanisch"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              
              <div>
                <Label className="mb-2 block">
                  Typ
                </Label>
                <Select
                  value={newCategory.category_type}
                  onValueChange={(value) => setNewCategory({ ...newCategory, category_type: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_TYPES.CUISINE}>Küche (z.B. Italienisch, Asiatisch)</SelectItem>
                    <SelectItem value={CATEGORY_TYPES.MEAL} disabled>Mahlzeit (System - nicht editierbar)</SelectItem>
                    <SelectItem value={CATEGORY_TYPES.GANG} disabled>Gang (System - nicht editierbar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">
                  Symbol
                </Label>
                <Select
                  value={newCategory.icon}
                  onValueChange={(value) => setNewCategory({ ...newCategory, icon: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AVAILABLE_ICONS).map(([iconName, iconData]) => {
                      const IconComp = iconData.component;
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-3">
                            <IconComp className="w-4 h-4" />
                            <span>{iconData.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewCategory({ name: "", category_type: CATEGORY_TYPES.CUISINE, icon: "ChefHat", color: COLORS.ACCENT });
                }}
                className="rounded-xl"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddCategory}
                disabled={!newCategory.name.trim()}
                className="text-white font-medium rounded-xl"
                style={{ backgroundColor: COLORS.ACCENT }}
              >
                Kategorie hinzufügen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
