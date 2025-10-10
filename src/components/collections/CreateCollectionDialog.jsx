import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLORS } from "@/components/utils/constants";

const PRESET_COLORS = [
  "#FF5722", "#E91E63", "#9C27B0", "#673AB7",
  "#3F51B5", "#2196F3", "#00BCD4", "#009688",
  "#4CAF50", "#8BC34A", "#CDDC39", "#FFC107",
  "#FF9800", "#FF5722", "#795548", "#607D8B"
];

export default function CreateCollectionDialog({ open, onOpenChange, onSubmit }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS.ACCENT);

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      color,
      recipe_ids: []
    });
    
    setName("");
    setColor(COLORS.ACCENT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Sammlung erstellen</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="collection-name" className="mb-2 block">
              Name der Sammlung
            </Label>
            <Input
              id="collection-name"
              placeholder="z.B. Favoriten, Ausprobieren, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          
          <div>
            <Label className="mb-2 block">Farbe</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor ? 'ring-4 ring-gray-300 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setName("");
              setColor(COLORS.ACCENT);
            }}
            className="rounded-xl"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="text-white font-medium rounded-xl"
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}