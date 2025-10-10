import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, Sparkles } from "lucide-react";
import { generateAlternativeNames } from "@/components/utils/ingredientMatcher";

export default function TagEditorDialog({ open, onOpenChange, image, onSave }) {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (image) {
      setTags(image.alternative_names || []);
    }
  }, [image]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateTags = async () => {
    if (!image) return;
    
    setIsGenerating(true);
    try {
      const generatedTags = await generateAlternativeNames(image.ingredient_name);
      // Merge mit bestehenden Tags, Duplikate entfernen
      const merged = [...new Set([...tags, ...generatedTags])];
      setTags(merged);
    } catch (err) {
      console.error("Fehler beim Generieren der Tags:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onSave({ ...image, alternative_names: tags });
    onOpenChange(false);
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Tags bearbeiten:</span>
            <span className="font-normal text-gray-600 capitalize">{image.ingredient_name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <img 
              src={image.image_url}
              alt={image.ingredient_name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Tags helfen dabei, verschiedene Schreibweisen und Synonyme zu erkennen
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Vorhandene Tags ({tags.length})</Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-xl bg-gray-50">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-400">Keine Tags vorhanden</p>
              ) : (
                tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-2 px-3 py-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="new-tag" className="mb-2 block">Neuen Tag hinzufügen</Label>
            <div className="flex gap-2">
              <Input
                id="new-tag"
                placeholder="z.B. Tomaten, cherry-tomaten, cocktailtomaten"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="rounded-xl"
              />
              <Button onClick={handleAddTag} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleGenerateTags}
            disabled={isGenerating}
            variant="outline"
            className="w-full rounded-xl"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Generiere intelligente Tags...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                KI: Intelligente Tags generieren
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            className="text-white font-medium rounded-xl"
            style={{ backgroundColor: "#FF5722" }}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}