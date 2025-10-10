import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const COLORS = {
  ACCENT: "#FF5722",
  TERRACOTTA: "#E07856"
};

export default function RecipeInstructions({ recipe, onChange, isFieldEnriched }) {
  const addInstruction = () => {
    const newStepNumber = recipe.instructions.length + 1;
    const updated = {
      ...recipe,
      instructions: [...recipe.instructions, { step_number: newStepNumber, step_description: "", ingredients_for_step: [] }]
    };
    onChange("instructions", updated.instructions);
  };

  const updateInstruction = (index, field, value) => {
    const newInstructions = [...recipe.instructions];
    newInstructions[index][field] = value;
    onChange("instructions", newInstructions);
  };

  const removeInstruction = (index) => {
    const updated = recipe.instructions.filter((_, i) => i !== index).map((inst, i) => ({
      ...inst,
      step_number: i + 1
    }));
    onChange("instructions", updated);
  };

  const hasInstructionGroups = recipe.instruction_groups && recipe.instruction_groups.length > 0;

  return (
    <div className={isFieldEnriched("instructions") ? "enriched-field" : ""}>
      <div className="flex items-center justify-between mb-4">
        <Label className="text-lg font-semibold">
          Zubereitungsschritte {isFieldEnriched("instructions") && <span className="text-xs text-terracotta">● Auto-ergänzt</span>}
        </Label>
        {!hasInstructionGroups && (
          <Button type="button" variant="outline" size="sm" onClick={addInstruction} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Hinzufügen
          </Button>
        )}
      </div>

      {hasInstructionGroups ? (
        <div className="space-y-6">
          {recipe.instruction_groups.map((group, groupIndex) => (
            <div key={groupIndex} className="p-6 rounded-2xl bg-green-50 border-2 border-green-200">
              <h3 className="text-xl font-bold mb-4 text-green-800">
                {group.group_name}
              </h3>
              <div className="space-y-4">
                {group.instructions.map((instruction, instIndex) => (
                  <div key={instIndex} className="flex gap-4 items-start">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                      style={{ backgroundColor: COLORS.ACCENT, color: "white" }}
                    >
                      {instruction.step_number}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-800">
                        {instruction.step_description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {recipe.instructions.map((instruction, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                style={{ backgroundColor: COLORS.ACCENT, color: "white" }}
              >
                {instruction.step_number}
              </div>
              <Textarea
                value={instruction.step_description}
                onChange={(e) => updateInstruction(index, "step_description", e.target.value)}
                className="flex-1 rounded-xl min-h-[100px] text-sm"
                rows={3}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeInstruction(index)} className="mt-2">
                <Trash2 className="w-4 h-4" style={{ color: COLORS.TERRACOTTA }} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}