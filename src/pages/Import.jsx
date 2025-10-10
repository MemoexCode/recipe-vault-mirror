import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Link as LinkIcon } from "lucide-react";
import ImportFileUpload from "../components/import/ImportFileUpload";
import ImportWebUrl from "../components/import/ImportWebUrl";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useImportPipeline } from "@/components/hooks/useImportPipeline";

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("file");
  
  // Einzige Hook-Instanz für beide Tabs
  const importState = useImportPipeline();

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rezept importieren</h1>
            <p className="text-lg text-gray-600">Wähle eine Importmethode und lass die Magie geschehen</p>
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
        </div>
      </div>
    </ErrorBoundary>
  );
}