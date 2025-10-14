
import React, { useEffect } from "react";
import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function IngredientImagesPage() {
  const { ingredientImages, isLoading, loadIngredientImages } = useApp();

  useEffect(() => {
    // Lazy load nur wenn noch nicht geladen
    if (ingredientImages.length === 0 && !isLoading.ingredientImages) {
      loadIngredientImages();
    }
  }, [ingredientImages.length, isLoading.ingredientImages, loadIngredientImages]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => (window.location.href = createPageUrl("Browse"))}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Zutatenbilder
        </h1>
      </div>

      {isLoading.ingredientImages ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-[220px] h-[220px] rounded-xl bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {ingredientImages.map((img) => (
            <figure key={img.id} className="w-[220px] h-[220px] rounded-xl overflow-hidden bg-white border shadow-sm hover:shadow-md transition-shadow">
              <img
                src={img.image_url}
                alt={img.ingredient_name}
                loading="lazy"
                decoding="async"
                width="220"
                height="220"
                className="w-full h-full object-cover"
              />
              <figcaption
                className="sr-only"
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
