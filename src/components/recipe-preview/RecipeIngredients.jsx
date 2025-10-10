import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const COLORS = {
  TERRACOTTA: "#E07856"
};

export default function RecipeIngredients({ recipe, onChange, isFieldEnriched }) {
  const addIngredient = () => {
    const updated = {
      ...recipe,
      ingredients: [...recipe.ingredients, { ingredient_name: "", amount: 0, unit: "", preparation_notes: "" }]
    };
    onChange("ingredients", updated.ingredients);
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index][field] = field === "amount" ? (parseFloat(value) || 0) : value;
    onChange("ingredients", newIngredients);
  };

  const removeIngredient = (index) => {
    const updated = recipe.ingredients.filter((_, i) => i !== index);
    onChange("ingredients", updated);
  };

  const hasIngredientGroups = recipe.ingredient_groups && recipe.ingredient_groups.length > 0;

  return (
    <div className={isFieldEnriched("ingredients") ? "enriched-field" : ""}>
      <div className="flex items-center justify-between mb-4">
        <Label className="text-lg font-semibold">
          Zutaten {isFieldEnriched("ingredients") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
        </Label>
        {!hasIngredientGroups && (
          <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Hinzufügen
          </Button>
        )}
      </div>

      {hasIngredientGroups ? (
        <div className="space-y-6">
          {recipe.ingredient_groups.map((group, groupIndex) => (
            <div key={groupIndex} className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                {group.group_name}
              </h3>
              <div className="space-y-3">
                {group.ingredients.map((ingredient, ingIndex) => (
                  <div key={ingIndex} className="grid grid-cols-12 gap-3">
                    <div className="col-span-2 text-sm font-medium text-gray-700 flex items-center">
                      {ingredient.amount} {ingredient.unit}
                    </div>
                    <div className="col-span-7 text-sm text-gray-800">
                      {ingredient.ingredient_name}
                    </div>
                    {ingredient.preparation_notes && (
                      <div className="col-span-3 text-xs text-gray-500 italic">
                        {ingredient.preparation_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {recipe.ingredients.map((ingredient, index) => (
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
      )}
    </div>
  );
}