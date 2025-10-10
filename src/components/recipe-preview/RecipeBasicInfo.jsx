import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIFFICULTY_LABELS = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Schwer",
  expert: "Experte"
};

const DIFFICULTIES = ["easy", "medium", "hard", "expert"];

export default function RecipeBasicInfo({ recipe, onChange, isFieldEnriched }) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className={isFieldEnriched("title") ? "enriched-field" : ""}>
        <Label className="text-base font-semibold mb-3 block">
          Rezepttitel {isFieldEnriched("title") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
        </Label>
        <Input
          value={recipe.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          className="rounded-xl text-base py-5"
        />
      </div>

      {/* Description */}
      <div className={isFieldEnriched("description") ? "enriched-field" : ""}>
        <Label className="text-base font-semibold mb-3 block">
          Beschreibung {isFieldEnriched("description") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
        </Label>
        <Textarea
          value={recipe.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="rounded-xl h-32 text-sm"
        />
      </div>

      {/* Times & Difficulty */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className={isFieldEnriched("prep_time_minutes") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Vorbereitung (Min) {isFieldEnriched("prep_time_minutes") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <Input
            type="number"
            min="0"
            value={recipe.prep_time_minutes || ""}
            onChange={(e) => onChange("prep_time_minutes", parseInt(e.target.value) || 0)}
            className="rounded-xl py-5 text-base"
          />
        </div>

        <div className={isFieldEnriched("cook_time_minutes") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Kochzeit (Min) {isFieldEnriched("cook_time_minutes") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <Input
            type="number"
            min="0"
            value={recipe.cook_time_minutes || ""}
            onChange={(e) => onChange("cook_time_minutes", parseInt(e.target.value) || 0)}
            className="rounded-xl py-5 text-base"
          />
        </div>

        <div className={isFieldEnriched("servings") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Portionen {isFieldEnriched("servings") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <Input
            type="number"
            min="1"
            value={recipe.servings || ""}
            onChange={(e) => onChange("servings", parseInt(e.target.value) || 1)}
            className="rounded-xl py-5 text-base"
          />
        </div>

        <div className={isFieldEnriched("difficulty") ? "enriched-field" : ""}>
          <Label className="text-base font-semibold mb-3 block">
            Schwierigkeit {isFieldEnriched("difficulty") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
          </Label>
          <Select value={recipe.difficulty || ""} onValueChange={(value) => onChange("difficulty", value)}>
            <SelectTrigger className="rounded-xl py-5 text-base">
              <SelectValue placeholder="Wählen" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map(diff => (
                <SelectItem key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}