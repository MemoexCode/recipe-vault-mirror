import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search } from "lucide-react";

const capitalize = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function RecipeCategories({ 
  recipe, 
  onChange, 
  categories, 
  mainIngredients,
  isFieldEnriched,
  showMealTypeWarning,
  showGangWarning
}) {
  const [mainIngredientOpen, setMainIngredientOpen] = useState(false);
  const [mainIngredientSearch, setMainIngredientSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("alle");

  const getMealCategories = () => categories.meal || [];
  const getGangCategories = () => categories.gang || [];
  const getCuisineCategories = () => categories.cuisine || [];

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

  return (
    <div className="space-y-6">
      {/* Meal Type & Gang */}
      <div className="grid md:grid-cols-2 gap-6">
        <div 
          id="field-meal_type" 
          className={`${isFieldEnriched("meal_type") ? "enriched-field" : ""} ${showMealTypeWarning ? 'ring-2 ring-red-500 rounded-xl p-4' : ''}`}
        >
          <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
            <span className="text-red-500">*</span> Mahlzeit
            {isFieldEnriched("meal_type") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <p className="text-sm mb-2" style={{ color: showMealTypeWarning ? "#EF4444" : "#8B9D83" }}>
            {showMealTypeWarning ? "⚠️ Pflichtfeld" : "Zu welcher Tageszeit?"}
          </p>
          <Select value={recipe.meal_type || ""} onValueChange={(value) => onChange("meal_type", value)}>
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

        <div 
          id="field-gang" 
          className={`${isFieldEnriched("gang") ? "enriched-field" : ""} ${showGangWarning ? 'ring-2 ring-red-500 rounded-xl p-4' : ''}`}
        >
          <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
            <span className="text-red-500">*</span> Gang
            {isFieldEnriched("gang") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <p className="text-sm mb-2" style={{ color: showGangWarning ? "#EF4444" : "#8B9D83" }}>
            {showGangWarning ? "⚠️ Pflichtfeld" : "Welche Rolle im Menü?"}
          </p>
          <Select value={recipe.gang || ""} onValueChange={(value) => onChange("gang", value)}>
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

      {/* Cuisine & Main Ingredient */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={isFieldEnriched("cuisine") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Küche (optional) {isFieldEnriched("cuisine") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <Select value={recipe.cuisine || ""} onValueChange={(value) => onChange("cuisine", value === "none" ? "" : value)}>
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

        <div className={isFieldEnriched("main_ingredient") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Hauptzutat {isFieldEnriched("main_ingredient") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <p className="text-sm mb-2 text-gray-600">
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
                {recipe.main_ingredient || "Wähle Hauptzutat..."}
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
                        onChange("main_ingredient", "");
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
                          onChange("main_ingredient", currentValue);
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
    </div>
  );
}