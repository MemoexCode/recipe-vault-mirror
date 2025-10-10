import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FolderHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import CreateCollectionDialog from "../components/collections/CreateCollectionDialog";

export default function CollectionsPage() {
  // Context Data
  const {
    collections,
    activeRecipes: recipes,
    isLoading,
    createCollection,
    deleteCollection
  } = useApp();

  // Local State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "confirm",
    title: "",
    message: "",
    onConfirm: null
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const getCollectionRecipes = (collection) => {
    const recipeIds = collection.recipe_ids || [];
    return recipes.filter(r => recipeIds.includes(r.id));
  };

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handleCreateCollection = async (data) => {
    await createCollection(data);
    setShowCreateDialog(false);
  };

  const handleDeleteCollection = (collection) => {
    setConfirmDialog({
      open: true,
      type: "delete",
      title: "Sammlung löschen?",
      message: `Möchtest du "${collection.name}" wirklich löschen? Die Rezepte bleiben erhalten.`,
      confirmText: "Löschen",
      cancelText: "Abbrechen",
      onConfirm: async () => {
        await deleteCollection(collection.id);
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div className="md:hidden flex-shrink-0">
            <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Sammlungen
            </h1>
            <p className="text-sm sm:text-base md:text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              {collections.length} {collections.length === 1 ? 'Sammlung' : 'Sammlungen'}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="text-white font-medium px-4 sm:px-6 py-2 sm:py-3 rounded-xl w-full sm:w-auto text-sm sm:text-base"
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Sammlung erstellen</span>
            <span className="sm:hidden">Erstellen</span>
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Sammlungen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {/* Collections Grid */}
        {isLoading.collections ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredCollections.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <FolderHeart className="w-16 h-16 mx-auto mb-4" style={{ color: COLORS.TEXT_SECONDARY }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                {searchQuery ? "Keine Sammlungen gefunden" : "Noch keine Sammlungen"}
              </h3>
              <p className="mb-6" style={{ color: COLORS.TEXT_SECONDARY }}>
                {searchQuery 
                  ? "Versuche einen anderen Suchbegriff"
                  : "Erstelle deine erste Sammlung, um Rezepte zu organisieren"
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="text-white font-medium px-6 py-3 rounded-xl"
                  style={{ backgroundColor: COLORS.ACCENT }}
                >
                  Sammlung erstellen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCollections.map((collection) => {
                const collectionRecipes = getCollectionRecipes(collection);
                
                return (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        {/* Header */}
                        <div
                          className="h-3"
                          style={{ backgroundColor: collection.color || COLORS.ACCENT }}
                        />
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${collection.color || COLORS.ACCENT}20` }}
                              >
                                <FolderHeart className="w-6 h-6" style={{ color: collection.color || COLORS.ACCENT }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                                  {collection.name}
                                </h3>
                                <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                                  {collectionRecipes.length} {collectionRecipes.length === 1 ? 'Rezept' : 'Rezepte'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCollection(collection)}
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>

                          {/* Recipe Preview Grid */}
                          {collectionRecipes.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-4">
                              {collectionRecipes.slice(0, 3).map(recipe => (
                                <Link
                                  key={recipe.id}
                                  to={`${createPageUrl("RecipeDetail")}?id=${recipe.id}`}
                                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                                >
                                  {recipe.image_url ? (
                                    <img
                                      src={recipe.image_url}
                                      alt={recipe.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full flex items-center justify-center"
                                      style={{ backgroundColor: `${collection.color || COLORS.ACCENT}20` }}
                                    >
                                      <FolderHeart className="w-6 h-6" style={{ color: collection.color || COLORS.ACCENT }} />
                                    </div>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}

                          {/* Empty State */}
                          {collectionRecipes.length === 0 && (
                            <div className="text-center py-8 text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                              Keine Rezepte in dieser Sammlung.
                              <br />
                              Ziehe Rezepte hierher um sie hinzuzufügen.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateCollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateCollection}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}