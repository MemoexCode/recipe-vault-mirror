import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLORS } from "@/components/utils/constants";

// ============================================
// CUSTOM DEBOUNCE HOOK
// ============================================
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

export default function SmartFilterDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  categories
}) {
  // Local state for immediate UI updates
  const [localFilters, setLocalFilters] = useState(filters);
  
  // Debounce the local filters
  const debouncedFilters = useDebounce(localFilters, 300);
  
  // Sync debounced filters with parent
  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);
  
  // Sync external filter changes back to local state
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: COLORS.TEXT_PRIMARY }}>
            Smart Filter
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Mahlzeit */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Mahlzeit
            </label>
            <Select value={localFilters.mahlzeit} onValueChange={(value) => updateFilter('mahlzeit', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                {categories.meal.map(cat => (
                  <SelectItem key={cat.id} value={cat.name} className="capitalize">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gang */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Gang
            </label>
            <Select value={localFilters.gang} onValueChange={(value) => updateFilter('gang', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                {categories.gang.map(cat => (
                  <SelectItem key={cat.id} value={cat.name} className="capitalize">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Küche */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Küche
            </label>
            <Select value={localFilters.küche} onValueChange={(value) => updateFilter('küche', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                {categories.cuisine.map(cat => (
                  <SelectItem key={cat.id} value={cat.name} className="capitalize">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ernährungsform */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Ernährungsform
            </label>
            <Select value={localFilters.ernährungsform} onValueChange={(value) => updateFilter('ernährungsform', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="vegetarisch">Vegetarisch</SelectItem>
                <SelectItem value="pescetarisch">Pescetarisch</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="omnivor">Omnivor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ernährungsziel */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Ernährungsziel
            </label>
            <Select value={localFilters.ernährungsziel} onValueChange={(value) => updateFilter('ernährungsziel', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="abnehmen">Abnehmen</SelectItem>
                <SelectItem value="muskeln-aufbauen">Muskeln aufbauen</SelectItem>
                <SelectItem value="fett-reduzieren">Fett reduzieren</SelectItem>
                <SelectItem value="gewicht-halten">Gewicht halten</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zuckergehalt */}
          <div>
            <label className="text-lg font-semibold mb-2 block" style={{ color: COLORS.TEXT_PRIMARY }}>
              Zuckergehalt
            </label>
            <Select value={localFilters.zuckergehalt} onValueChange={(value) => updateFilter('zuckergehalt', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="ohne-zucker">Ohne Zucker (≤ 1g pro Portion)</SelectItem>
                <SelectItem value="wenig-zucker">Wenig Zucker (≤ 5g pro Portion)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onReset} className="rounded-xl">
            Zurücksetzen
          </Button>
          <Button 
            onClick={onApply} 
            className="text-white font-medium rounded-xl" 
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            Filter anwenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}