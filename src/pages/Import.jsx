import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUp, Link as LinkIcon, RotateCcw } from "lucide-react";
import ImportFileUpload from "../components/import/ImportFileUpload";
import ImportWebUrl from "../components/import/ImportWebUrl";
import RecipeReviewDialog from "../components/import/RecipeReviewDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useApp } from "@/components/contexts/AppContext";

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("file");
  
  // Get import state from global context
  const importState = useApp();

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Rezept importieren</h1>
              <p className="text-lg text-gray-600">Wähle eine Importmethode und lass die Magie geschehen</p>
            </div>
            <Button 
              onClick={importState.resetImportProcess} 
              variant="destructive" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Import
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-white rounded-2xl shadow-sm">
              <TabsTrigger value="file" className="text-base font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <FileUp className="w-5 h-5 mr-2" />
                Datei-Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="text-base font-medium rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <LinkIcon className="w-5 h-5 mr-2" />
                Web-URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <ImportFileUpload {...importState} />
            </TabsContent>

            <TabsContent value="url">
              <ImportWebUrl {...importState} />
            </TabsContent>
          </Tabs>

          {/* Recipe Review Dialog - Rendered at Page Level for Stability */}
          {importState.extractedRecipe && (
            <RecipeReviewDialog
              open={importState.currentStage === importState.STAGES.RECIPE_REVIEW}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  importState.handleCancelRecipeReview();
                }
              }}
              recipe={importState.extractedRecipe}
              duplicates={importState.duplicates}
              onSave={importState.handleSaveRecipe}
              onCancel={importState.handleCancelRecipeReview}
              categories={importState.categoriesByType}
              mainIngredients={[]} // Will be loaded inside the dialog if needed
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}