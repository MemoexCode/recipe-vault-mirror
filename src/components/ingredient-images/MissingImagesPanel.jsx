import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles, TrendingUp, Link2, Search, CheckCircle, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { findBestImageMatch } from "@/components/utils/ingredientMatcher";

export default function MissingImagesPanel({ 
  missingImages, 
  existingImages, 
  onGenerateImage, 
  onLinkImage,
  onBulkGenerate 
}) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedMissing, setSelectedMissing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const handleOpenLinkDialog = (missing) => {
    setSelectedMissing(missing);
    setSearchQuery("");
    
    // Finde automatisch ähnliche Bilder
    const match = findBestImageMatch(missing.name, existingImages, 0.60);
    if (match) {
      setSuggestedMatches([match]);
    } else {
      setSuggestedMatches([]);
    }
    
    setShowLinkDialog(true);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      const match = findBestImageMatch(selectedMissing.name, existingImages, 0.60);
      setSuggestedMatches(match ? [match] : []);
      return;
    }
    
    // Filtere existierende Bilder nach Suchbegriff
    const filtered = existingImages.filter(img => 
      img.ingredient_name.toLowerCase().includes(query.toLowerCase()) ||
      (img.alternative_names || []).some(alt => alt.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 10);
    
    setSuggestedMatches(filtered.map(img => ({ image: img, score: 1.0, matchType: 'manual_search' })));
  };

  const handleConfirmLink = async (matchedImage) => {
    await onLinkImage(selectedMissing.name, matchedImage);
    setShowLinkDialog(false);
    setSelectedMissing(null);
    setSearchQuery("");
    setSuggestedMatches([]);
  };

  const handleBulkGenerateAll = async () => {
    if (!confirm(`Möchtest du jetzt alle ${missingImages.length} fehlenden Zutatenbilder generieren?\n\nDies kann ${Math.ceil(missingImages.length * 0.5)} - ${Math.ceil(missingImages.length)} Minuten dauern.`)) {
      return;
    }

    setIsBulkGenerating(true);
    const ingredientNames = missingImages.map(m => m.name);
    await onBulkGenerate(ingredientNames);
    setIsBulkGenerating(false);
  };

  if (missingImages.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gray-800">
            Perfekt! 🎉
          </h3>
          <p className="text-gray-600">
            Alle Zutaten aus deinen Rezepten haben bereits Bilder.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Alert className="rounded-xl" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "#F59E0B" }}>
          <AlertCircle className="h-4 w-4" style={{ color: "#F59E0B" }} />
          <AlertDescription style={{ color: "#92400E" }}>
            <strong>{missingImages.length} Zutaten</strong> aus deinen Rezepten haben noch keine Bilder. 
            Du kannst sie alle auf einmal generieren oder einzeln bearbeiten.
          </AlertDescription>
        </Alert>

        {/* BULK ACTION BUTTONS */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleBulkGenerateAll}
            disabled={isBulkGenerating}
            className="text-white font-medium px-6 py-3 rounded-xl"
            style={{ backgroundColor: "#8B5CF6" }}
          >
            <Zap className="w-5 h-5 mr-2" />
            Alle {missingImages.length} Bilder generieren
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600">
              Dauert ca. {Math.ceil(missingImages.length * 0.5)} - {Math.ceil(missingImages.length)} Minuten
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missingImages.map((missing, idx) => (
            <Card key={idx} className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg capitalize text-gray-800 mb-2">
                      {missing.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-gray-600">
                        In {missing.usageCount} {missing.usageCount === 1 ? 'Rezept' : 'Rezepten'}
                      </span>
                    </div>
                  </div>
                  <Badge 
                    className="text-xs px-2 py-1"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" }}
                  >
                    Fehlt
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => onGenerateImage(missing.name)}
                    className="flex-1 text-white rounded-xl"
                    style={{ backgroundColor: "#FF5722" }}
                    disabled={isBulkGenerating}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generieren
                  </Button>
                  <Button
                    onClick={() => handleOpenLinkDialog(missing)}
                    variant="outline"
                    className="flex-1 rounded-xl"
                    disabled={isBulkGenerating}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Verknüpfen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bild verknüpfen mit: {selectedMissing?.name}</DialogTitle>
            <DialogDescription>
              Wähle ein bestehendes Bild aus oder suche nach einem passenden Bild.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Suche nach Zutat..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            {/* Suggested Matches */}
            {suggestedMatches.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {suggestedMatches.map((match, idx) => (
                  <Card 
                    key={idx}
                    className="rounded-xl hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleConfirmLink(match.image)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square relative mb-2">
                        <img 
                          src={match.image.image_url}
                          alt={match.image.ingredient_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {match.score && match.score < 1.0 && (
                          <Badge 
                            className="absolute top-1 right-1 text-xs"
                            style={{ backgroundColor: "rgba(59, 130, 246, 0.9)", color: "white" }}
                          >
                            {Math.round(match.score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm capitalize text-center text-gray-800">
                        {match.image.ingredient_name}
                      </p>
                      {match.image.alternative_names && match.image.alternative_names.length > 0 && (
                        <p className="text-xs text-gray-500 text-center mt-1">
                          +{match.image.alternative_names.length} Tags
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">
                  {searchQuery ? "Keine passenden Bilder gefunden" : "Suche nach einem Bild oder generiere ein neues"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLinkDialog(false)}
              className="rounded-xl"
            >
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}