import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileUp, Globe, Sparkles } from "lucide-react";
import { COLORS } from "@/components/utils/constants";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

import ImportFileUpload from "../components/import/ImportFileUpload";
import ImportWebUrl from "../components/import/ImportWebUrl";

export default function ImportPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("file");

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="max-w-5xl mx-auto">
          {/* HEADER - ZENTRIERT */}
          <div className="text-center mb-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Browse"))}
              className="rounded-xl mb-6 mx-auto"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="inline-block p-4 bg-gradient-to-br from-orange-100 to-red-100 rounded-full mb-4">
              <Sparkles className="w-12 h-12 text-orange-600" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
              Rezept importieren
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Importiere Rezepte aus Dateien oder von Webseiten - powered by KI
            </p>
          </div>

          {/* IMPORT METHOD TABS - ZENTRIERT & SCHÖNER */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white rounded-2xl p-2 shadow-md border-2 border-gray-100 h-16 max-w-2xl mx-auto">
              <TabsTrigger 
                value="file" 
                className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <FileUp className="w-5 h-5 mr-2" />
                Datei hochladen
              </TabsTrigger>
              <TabsTrigger 
                value="web" 
                className="rounded-xl text-base font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
              >
                <Globe className="w-5 h-5 mr-2" />
                Von Webseite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-0">
              <ImportFileUpload />
            </TabsContent>

            <TabsContent value="web" className="mt-0">
              <ImportWebUrl />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}