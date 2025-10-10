import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, RotateCcw, Trash, ChefHat, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";

export default function TrashPage() {
  const navigate = useNavigate();
  
  // Context Data
  const {
    trashedRecipes,
    isLoading,
    error: contextError,
    restoreRecipe,
    permanentlyDeleteRecipe
  } = useApp();

  // ============================================
  // HANDLERS
  // ============================================
  const handleRestore = async (recipe) => {
    await restoreRecipe(recipe.id);
  };

  const handlePermanentDelete = async (recipe) => {
    if (confirm(`"${recipe.title}" endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      await permanentlyDeleteRecipe(recipe.id);
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm(`Papierkorb leeren? Alle ${trashedRecipes.length} Rezepte werden endgültig gelöscht!`)) {
      for (const recipe of trashedRecipes) {
        await permanentlyDeleteRecipe(recipe.id);
      }
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Browse"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                Papierkorb
              </h1>
              <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                {trashedRecipes.length} {trashedRecipes.length === 1 ? 'gelöschtes Rezept' : 'gelöschte Rezepte'}
              </p>
            </div>
          </div>
          
          {trashedRecipes.length > 0 && (
            <Button
              onClick={handleEmptyTrash}
              variant="outline"
              className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash className="w-4 h-4 mr-2" />
              Papierkorb leeren
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {contextError && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{contextError}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {isLoading.recipes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : trashedRecipes.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                Papierkorb ist leer
              </h3>
              <p className="mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
                Gelöschte Rezepte erscheinen hier und können wiederhergestellt werden
              </p>
              <Link to={createPageUrl("Browse")}>
                <Button
                  className="text-white font-medium px-6 py-3 rounded-xl"
                  style={{ backgroundColor: COLORS.ACCENT }}
                >
                  Zurück zur Übersicht
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {trashedRecipes.map((recipe) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48">
                      {recipe.image_url ? (
                        <img 
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover opacity-60"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center opacity-60"
                          style={{ backgroundColor: "#9CA3AF" }}
                        >
                          <ChefHat className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-bold text-lg line-clamp-2 mb-1">
                          {recipe.title}
                        </h3>
                        {recipe.deleted_date && (
                          <p className="text-xs text-white/80">
                            Gelöscht: {format(new Date(recipe.deleted_date), "dd. MMM yyyy, HH:mm", { locale: de })}
                          </p>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleRestore(recipe)}
                          className="flex-1 text-white font-medium rounded-xl"
                          style={{ backgroundColor: "#10B981" }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Wiederherstellen
                        </Button>
                        <Button
                          onClick={() => handlePermanentDelete(recipe)}
                          variant="outline"
                          size="icon"
                          className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}