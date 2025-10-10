import React, { useState, useEffect } from "react";
import { ChefHat, Loader2, Check, Link2, Sparkles } from "lucide-react";
import { IngredientImage as IngredientImageEntity } from "@/api/entities";
import { findBestImageMatch } from "@/components/utils/ingredientMatcher";
import ImageGenerationService from "@/components/ingredient-images/ImageGenerationService";
import { useApp } from "@/components/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function IngredientImage({ 
  ingredient, 
  className = "w-20 h-20", 
  preloadedUrl, 
  isLoading, 
  onImageGenerated 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [matchedImage, setMatchedImage] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isMounted, setIsMounted] = useState(true);
  
  // TASK 1: Use context instead of internal state
  const { ingredientImages: allImages, refreshIngredientImages } = useApp();
  
  const ingredientName = typeof ingredient === 'string' 
    ? ingredient 
    : (ingredient?.ingredient_name || ingredient?.name || '');

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!showDialog) {
      setActionType(null);
      setSelectedImage(null);
      setSearchQuery("");
      setMatchedImage(null);
    }
  }, [showDialog]);
  
  if (isLoading) {
    return (
      <div 
        className={`${className} rounded-full flex items-center justify-center animate-pulse`}
        style={{ backgroundColor: "rgba(139, 157, 131, 0.2)" }}
      />
    );
  }
  
  if (preloadedUrl) {
    return (
      <img 
        src={preloadedUrl}
        alt={ingredientName}
        className={`${className} object-cover rounded-full`}
      />
    );
  }
  
  const handlePlaceholderClick = async () => {
    if (!isMounted) return;
    
    setIsGenerating(true);
    
    try {
      // TASK 1: No longer fetch - use context data directly
      if (!isMounted) return;
      
      const match = findBestImageMatch(ingredientName, allImages || [], 0.80);
      
      if (match && match.score >= 0.80) {
        setMatchedImage(match);
        setActionType('add_tag');
      } else {
        setActionType('select_option');
      }
      
      setShowDialog(true);
    } catch (err) {
      console.error("Fehler bei der Bildsuche:", err);
      if (isMounted) {
        alert("Fehler beim Laden der Bilddatenbank.");
      }
    } finally {
      if (isMounted) {
        setIsGenerating(false);
      }
    }
  };
  
  const handleConfirmAction = async () => {
    if (!isMounted) return;
    
    setIsGenerating(true);
    
    try {
      if (actionType === 'add_tag' && matchedImage) {
        const existingImage = matchedImage.image;
        const currentTags = existingImage.alternative_names || [];
        const normalizedNew = ingredientName.toLowerCase().trim();
        const tagExists = currentTags.some(tag => tag.toLowerCase().trim() === normalizedNew);
        
        if (!tagExists) {
          await IngredientImageEntity.update(existingImage.id, {
            alternative_names: [...currentTags, ingredientName]
          });
        }
        
        if (isMounted && onImageGenerated) {
          onImageGenerated();
        }
        
        // Refresh context data
        if (refreshIngredientImages) {
          await refreshIngredientImages();
        }
        
      } else if (actionType === 'generate_new') {
        await ImageGenerationService.generateIngredientImage(ingredientName);
        
        if (isMounted && onImageGenerated) {
          onImageGenerated();
        }
        
        // Refresh context data
        if (refreshIngredientImages) {
          await refreshIngredientImages();
        }
        
      } else if (actionType === 'link_existing' && selectedImage) {
        const currentTags = selectedImage.alternative_names || [];
        const normalizedNew = ingredientName.toLowerCase().trim();
        const tagExists = currentTags.some(tag => tag.toLowerCase().trim() === normalizedNew);
        
        if (!tagExists) {
          await IngredientImageEntity.update(selectedImage.id, {
            alternative_names: [...currentTags, ingredientName]
          });
        }
        
        if (isMounted && onImageGenerated) {
          onImageGenerated();
        }
        
        // Refresh context data
        if (refreshIngredientImages) {
          await refreshIngredientImages();
        }
      }
      
      if (isMounted) {
        setShowDialog(false);
      }
    } catch (err) {
      console.error("Fehler beim Generieren/Aktualisieren:", err);
      if (isMounted) {
        alert("Fehler: " + err.message);
      }
    } finally {
      if (isMounted) {
        setIsGenerating(false);
      }
    }
  };
  
  const handleDialogClose = (open) => {
    if (!open && !isGenerating) {
      setShowDialog(false);
    }
  };
  
  const filteredImages = searchQuery.trim() 
    ? allImages.filter(img => 
        img.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (img.alternative_names || []).some(alt => alt.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allImages;
  
  // SORTIERE BILDER ALPHABETISCH
  const sortedImages = [...filteredImages].sort((a, b) => 
    a.ingredient_name.localeCompare(b.ingredient_name, 'de')
  );
  
  return (
    <>
      <button
        onClick={handlePlaceholderClick}
        disabled={isGenerating}
        className={`${className} rounded-full flex items-center justify-center transition-all duration-200 hover:bg-opacity-30 cursor-pointer group relative`}
        style={{ backgroundColor: "rgba(139, 157, 131, 0.15)" }}
      >
        {isGenerating ? (
          <Loader2 className="w-1/2 h-1/2 animate-spin" style={{ color: "#8B9D83" }} />
        ) : (
          <>
            <ChefHat className="w-1/2 h-1/2 group-hover:scale-110 transition-transform" style={{ color: "#8B9D83", opacity: 0.5 }} />
            <div className="absolute inset-0 rounded-full border-2 border-dashed opacity-0 group-hover:opacity-50 transition-opacity" style={{ borderColor: "#8B9D83" }} />
          </>
        )}
      </button>
      
      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {actionType === 'add_tag' ? 'Ähnliches Bild gefunden!' : `Bild für "${ingredientName}"`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {actionType === 'add_tag' && matchedImage ? (
              <div className="space-y-4">
                <DialogDescription className="text-base">
                  Es wurde ein ähnliches Bild gefunden:
                </DialogDescription>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                  <img 
                    src={matchedImage.image.image_url} 
                    alt={matchedImage.image.ingredient_name}
                    className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-lg mb-1">
                      {matchedImage.image.ingredient_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Ähnlichkeit: {Math.round((matchedImage.score || 0) * 100)}%
                    </p>
                    {matchedImage.image.alternative_names && matchedImage.image.alternative_names.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {matchedImage.image.alternative_names.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded-lg">
                  💡 <strong>"{ingredientName}"</strong> wird als Tag hinzugefügt, um zukünftig automatisch gefunden zu werden.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="generate" className="w-full" onValueChange={(val) => setActionType(val === 'generate' ? 'generate_new' : 'link_existing')}>
                <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                  <TabsTrigger value="generate" className="text-base font-medium">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Neu generieren
                  </TabsTrigger>
                  <TabsTrigger value="library" className="text-base font-medium">
                    <Link2 className="w-4 h-4 mr-2" />
                    Aus Bibliothek
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="generate" className="space-y-4">
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">KI-Bild generieren</h3>
                    <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                      Ein neues Bild für <strong>"{ingredientName}"</strong> wird intelligent mit KI generiert und an den Zutatentyp angepasst.
                    </p>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 max-w-md mx-auto">
                      <p className="text-sm text-blue-800">
                        ✨ Automatische Anpassung an Getränke, rohe Zutaten, etc.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="library" className="space-y-4">
                  <div>
                    <Input
                      placeholder="Bild suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-xl mb-4 h-12 text-base"
                    />
                    
                    <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                      {sortedImages.length === 0 ? (
                        <div className="col-span-4 text-center py-12 text-gray-500">
                          {searchQuery ? "Keine passenden Bilder gefunden" : "Keine Bilder in der Bibliothek"}
                        </div>
                      ) : (
                        sortedImages.map(img => (
                          <button
                            key={img.id}
                            onClick={() => setSelectedImage(img)}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                              selectedImage?.id === img.id
                                ? 'border-green-500 bg-green-50 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={img.image_url}
                              alt={img.ingredient_name}
                              className="w-16 h-16 object-cover rounded-full mb-2"
                            />
                            <p className="text-xs font-medium text-center text-gray-800 line-clamp-2">
                              {img.ingredient_name}
                            </p>
                            {selectedImage?.id === img.id && (
                              <Check className="w-4 h-4 text-green-600 mt-1" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
          
          <DialogFooter className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => handleDialogClose(false)}
              disabled={isGenerating}
              className="rounded-xl flex-1 h-12 text-base"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={isGenerating || (actionType === 'link_existing' && !selectedImage)}
              className="rounded-xl flex-1 h-12 text-base font-semibold"
              style={{ 
                backgroundColor: actionType === 'add_tag' ? "#10B981" : "#FF5722",
                color: "white"
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {actionType === 'generate_new' ? 'Generiere...' : 'Speichere...'}
                </>
              ) : (
                <>
                  {actionType === 'add_tag' && (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Bild verwenden
                    </>
                  )}
                  {actionType === 'generate_new' && (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Jetzt generieren
                    </>
                  )}
                  {actionType === 'link_existing' && (
                    <>
                      <Link2 className="w-5 h-5 mr-2" />
                      Bild verknüpfen
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}