import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Info, Package } from "lucide-react";
import { EXTENDED_INGREDIENTS, CATEGORY_LABELS, CATEGORY_ICONS, getAllExtendedIngredients } from "./constants";

export default function AdvancedLibraryDialog({ open, onOpenChange, existingImages, onGenerate }) {
  const [selectedCategories, setSelectedCategories] = useState(Object.keys(EXTENDED_INGREDIENTS));
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const selectAll = () => {
    setSelectedCategories(Object.keys(EXTENDED_INGREDIENTS));
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

  // Berechne Statistiken
  const stats = Object.entries(EXTENDED_INGREDIENTS).map(([category, ingredients]) => {
    const existing = existingImages.filter(img => {
      const normalizedName = img.ingredient_name.toLowerCase();
      return ingredients.some(ing => ing.toLowerCase() === normalizedName);
    }).length;

    return {
      category,
      total: ingredients.length,
      existing,
      missing: ingredients.length - existing,
      selected: selectedCategories.includes(category)
    };
  });

  const totalStats = stats.reduce((acc, cat) => ({
    total: acc.total + cat.total,
    existing: acc.existing + cat.existing,
    missing: acc.missing + cat.missing,
    selected: acc.selected + (cat.selected ? cat.total : 0)
  }), { total: 0, existing: 0, missing: 0, selected: 0 });

  const selectedMissingCount = stats
    .filter(cat => cat.selected)
    .reduce((acc, cat) => acc + cat.missing, 0);

  const estimatedTime = Math.ceil(selectedMissingCount * 0.5);

  const handleGenerate = async () => {
    const ingredientsToGenerate = [];
    
    selectedCategories.forEach(category => {
      const categoryIngredients = EXTENDED_INGREDIENTS[category] || [];
      categoryIngredients.forEach(ing => {
        const normalizedIng = ing.toLowerCase();
        const exists = existingImages.some(img => 
          img.ingredient_name.toLowerCase() === normalizedIng
        );
        if (!exists) {
          ingredientsToGenerate.push(ing);
        }
      });
    });

    if (ingredientsToGenerate.length === 0) {
      alert("Alle ausgewählten Zutaten haben bereits Bilder! 🎉");
      return;
    }

    if (!confirm(`${ingredientsToGenerate.length} Zutatenbilder generieren?\n\nGeschätzte Dauer: ${estimatedTime} - ${estimatedTime * 2} Minuten`)) {
      return;
    }

    setIsGenerating(true);
    await onGenerate(ingredientsToGenerate);
    setIsGenerating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Erweiterte Bibliothek generieren
          </DialogTitle>
          <DialogDescription>
            Wähle die Kategorien aus, für die du Zutatenbilder generieren möchtest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* STATISTIK-OVERVIEW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{totalStats.total}</p>
                <p className="text-xs text-gray-600">Gesamt</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{totalStats.existing}</p>
                <p className="text-xs text-gray-600">Vorhanden</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{totalStats.missing}</p>
                <p className="text-xs text-gray-600">Fehlen</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{totalStats.selected}</p>
                <p className="text-xs text-gray-600">Ausgewählt</p>
              </CardContent>
            </Card>
          </div>

          {/* INFO ALERT */}
          {selectedMissingCount > 0 && (
            <Alert className="rounded-xl" style={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}>
              <Info className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-gray-700">
                <strong>{selectedMissingCount} neue Bilder</strong> werden generiert.
                Geschätzte Dauer: <strong>{estimatedTime} - {estimatedTime * 2} Minuten</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* QUICK ACTIONS */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="rounded-xl"
              disabled={isGenerating}
            >
              Alle auswählen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="rounded-xl"
              disabled={isGenerating}
            >
              Alle abwählen
            </Button>
          </div>

          {/* CATEGORY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.map((stat) => (
              <Card 
                key={stat.category}
                className={`rounded-xl cursor-pointer transition-all ${
                  stat.selected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => !isGenerating && toggleCategory(stat.category)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={stat.selected}
                      onCheckedChange={() => toggleCategory(stat.category)}
                      disabled={isGenerating}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{CATEGORY_ICONS[stat.category]}</span>
                        <h3 className="font-semibold text-gray-800">
                          {CATEGORY_LABELS[stat.category]}
                        </h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {stat.total} Gesamt
                        </Badge>
                        <Badge className="text-xs bg-green-100 text-green-800">
                          {stat.existing} ✓
                        </Badge>
                        {stat.missing > 0 && (
                          <Badge className="text-xs bg-orange-100 text-orange-800">
                            {stat.missing} fehlen
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={isGenerating}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedCategories.length === 0 || selectedMissingCount === 0 || isGenerating}
            className="text-white font-medium rounded-xl"
            style={{ backgroundColor: "#8B5CF6" }}
          >
            {isGenerating ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Generiere...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {selectedMissingCount} Bilder generieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}