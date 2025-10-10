
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Tag, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ImageList({ 
  images, 
  imageUsageMap,
  onDelete, 
  onEditTags, 
  onRegenerateImage,
  newestImageId
}) {
  return (
    <div className="space-y-3">
      {images.map((image) => {
        const usage = imageUsageMap[image.id] || { count: 0, recipes: [] };
        const isNewest = image.id === newestImageId;
        
        return (
          <Card 
            key={image.id} 
            id={`image-${image.id}`}
            className={`rounded-2xl hover:shadow-lg transition-shadow ${isNewest ? 'ring-4 ring-green-500' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* IMAGE */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img 
                    src={image.image_url}
                    alt={image.ingredient_name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {image.is_generated && (
                    <div 
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
                    >
                      <Sparkles className="w-3 h-3" style={{ color: "#FF5722" }} />
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg capitalize text-gray-800 truncate">
                    {image.ingredient_name}
                  </h3>
                  
                  {/* TAGS */}
                  {image.alternative_names && image.alternative_names.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {image.alternative_names.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {image.alternative_names.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{image.alternative_names.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* USAGE */}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {usage.count === 0 
                        ? "Nicht verwendet" 
                        : `In ${usage.count} ${usage.count === 1 ? 'Rezept' : 'Rezepten'}`
                      }
                    </span>
                    {usage.count > 0 && (
                      <div className="group relative">
                        <span className="text-xs text-blue-600 cursor-help underline">Details</span>
                        <div className="hidden group-hover:block absolute z-10 bg-white p-3 rounded-xl shadow-xl border border-gray-200 min-w-[200px] mt-1">
                          <p className="text-xs font-semibold mb-2">Verwendet in:</p>
                          {usage.recipes.slice(0, 5).map((recipe) => (
                            <Link 
                              key={recipe.id}
                              to={`${createPageUrl("RecipeDetail")}?id=${recipe.id}`}
                              className="block text-xs text-blue-600 hover:underline mb-1"
                            >
                              • {recipe.title}
                            </Link>
                          ))}
                          {usage.recipes.length > 5 && (
                            <p className="text-xs text-gray-500">
                              +{usage.recipes.length - 5} weitere
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onRegenerateImage(image)}
                    className="rounded-full"
                    title="Bild neu generieren"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEditTags(image)}
                    className="rounded-full"
                    title="Tags bearbeiten"
                  >
                    <Tag className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(image.id)}
                    className="rounded-full"
                    title="Bild löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
