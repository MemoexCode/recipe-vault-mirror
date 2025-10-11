/**
 * ENTWICKLER RESET BUTTON
 * 
 * Zweck:
 * - Bietet schnellen Zugriff auf System-Reset für Entwickler
 * - Löscht alle Daten (Rezepte, Kategorien, Sammlungen)
 * - Nur sichtbar im Entwicklermodus
 * 
 * Position: Bottom-right (Teil des Dev-Button-Stacks)
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { showSuccess, showError } from "@/components/ui/toastUtils";
import { isDevelopment } from "@/components/utils/env";
import { COLORS } from "@/components/utils/constants";

export default function DevResetButton() {
  const [isResetting, setIsResetting] = useState(false);

  if (!isDevelopment()) {
    return null;
  }

  const handleReset = async () => {
    if (!confirm("⚠️ WARNUNG: Alle Daten (Rezepte, Kategorien, Sammlungen) werden gelöscht!\n\nFortfahren?")) {
      return;
    }

    setIsResetting(true);

    try {
      // Lösche alle Rezepte
      const recipes = await base44.entities.Recipe.list();
      await Promise.all(recipes.map(r => base44.entities.Recipe.delete(r.id)));

      // Lösche alle nicht-System-Kategorien
      const categories = await base44.entities.RecipeCategory.list();
      await Promise.all(
        categories
          .filter(c => !c.is_system)
          .map(c => base44.entities.RecipeCategory.delete(c.id))
      );

      // Lösche alle Sammlungen
      const collections = await base44.entities.RecipeCollection.list();
      await Promise.all(collections.map(c => base44.entities.RecipeCollection.delete(c.id)));

      // Lösche alle Zutatenbilder
      const ingredientImages = await base44.entities.IngredientImage.list();
      await Promise.all(ingredientImages.map(img => base44.entities.IngredientImage.delete(img.id)));

      showSuccess("System erfolgreich zurückgesetzt!");
      
      // Reload nach kurzer Verzögerung
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Reset failed:', err);
      showError("Fehler beim Zurücksetzen: " + (err.message || 'Unbekannter Fehler'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Button
      onClick={handleReset}
      disabled={isResetting}
      className="rounded-xl shadow-lg hover:opacity-90 transition-all duration-200 text-sm font-medium flex items-center gap-2 text-white"
      style={{ backgroundColor: '#EF4444' }}
      title="System zurücksetzen (alle Daten löschen)"
      aria-label="System zurücksetzen"
      tabIndex={0}
    >
      <Trash2 className="w-4 h-4" />
      <span className="hidden lg:inline">
        {isResetting ? 'Lösche...' : 'Reset'}
      </span>
    </Button>
  );
}