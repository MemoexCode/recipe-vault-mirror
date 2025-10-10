import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportRecipeToPrint } from "@/components/utils/recipeExport";
import { RecipeCategory } from "@/api/entities";

export default function ExportButton({ recipe, variant = "default", size = "default", className = "" }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await RecipeCategory.list();
    setCategories(cats);
  };

  const handleExport = (e) => {
    e.preventDefault();
    e.stopPropagation();
    exportRecipeToPrint(recipe, categories);
  };

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
      className={`rounded-xl ${className}`}
    >
      <Download className="w-4 h-4 mr-2" />
      Rezept drucken
    </Button>
  );
}