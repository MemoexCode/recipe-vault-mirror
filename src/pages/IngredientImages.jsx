import React, { useEffect } from "react";
import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function IngredientImagesPage() {
  const navigate = useNavigate();
  const { ingredientImages, isLoading, loadIngredientImages } = useApp();

  useEffect(() => {
    loadIngredientImages();
  }, [loadIngredientImages]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(createPageUrl("Browse"))}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Zutatenbilder
        </h1>
      </div>

      {isLoading.ingredientImages ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ingredientImages.map((img) => (
            <figure key={img.id} className="rounded-xl overflow-hidden bg-white border">
              <img
                src={img.image_url}
                alt={img.ingredient_name}
                loading="lazy"
                width="320"
                height="320"
                className="block w-full h-auto object-cover aspect-square"
              />
              <figcaption
                className="px-2 py-1 text-xs text-center"
                style={{ color: COLORS.TEXT_SECONDARY }}
              >
                {img.ingredient_name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}