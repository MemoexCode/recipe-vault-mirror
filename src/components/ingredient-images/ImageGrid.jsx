
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Sparkles, Tag, RefreshCw, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ImageGrid({ 
  images, 
  imageUsageMap,
  onDelete, 
  onEditTags, 
  onRegenerateImage,
  compact = false,
  newestImageId = null
}) {
  return (
    <div className={`grid ${compact ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'} gap-4`}>
      <AnimatePresence>
        {images.map((image) => {
          const usage = imageUsageMap[image.id] || { count: 0, recipes: [] };
          const isNewest = image.id === newestImageId;
          
          return (
            <motion.div
              key={image.id}
              id={`image-${image.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="transition-all duration-200"
            >
              <Card className={`rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group ${isNewest ? 'ring-4 ring-green-500' : ''}`}>
                <div className="relative aspect-square">
                  <img 
                    src={image.image_url}
                    alt={image.ingredient_name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRegenerateImage(image)}
                      className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                      title="Bild neu generieren"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditTags(image)}
                      className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                      title="Tags bearbeiten"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(image.id)}
                      className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Bild löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* BADGES */}
                  {image.is_generated && (
                    <div 
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
                      title="KI-generiert"
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: "#FF5722" }} />
                    </div>
                  )}
                  
                  {image.alternative_names && image.alternative_names.length > 0 && (
                    <div 
                      className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(59, 130, 246, 0.9)" }}
                      title={`${image.alternative_names.length} Tags`}
                    >
                      <Tag className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  
                  {/* USAGE BADGE */}
                  {usage.count > 0 && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="group/usage relative">
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center justify-center gap-1 cursor-help">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-semibold text-gray-800">
                            {usage.count}x
                          </span>
                        </div>
                        
                        {/* TOOLTIP */}
                        <div className="hidden group-hover/usage:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-200 min-w-[180px]">
                            <p className="text-xs font-semibold mb-2">Verwendet in:</p>
                            {usage.recipes.slice(0, 3).map((recipe) => (
                              <Link 
                                key={recipe.id}
                                to={`${createPageUrl("RecipeDetail")}?id=${recipe.id}`}
                                className="block text-xs text-blue-600 hover:underline mb-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                • {recipe.title}
                              </Link>
                            ))}
                            {usage.recipes.length > 3 && (
                              <p className="text-xs text-gray-500">
                                +{usage.recipes.length - 3} weitere
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-center capitalize text-gray-800 mb-2 truncate">
                    {image.ingredient_name}
                  </p>
                  {!compact && image.alternative_names && image.alternative_names.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {image.alternative_names.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {image.alternative_names.length > 2 && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          +{image.alternative_names.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
