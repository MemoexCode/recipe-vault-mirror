import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ImportContainer from "./ImportContainer";
import { webUrlSource } from "./sources/webUrlSource";

// ============================================
// WEB URL INPUT COMPONENT
// ============================================
function WebUrlInput({ onSubmit, isProcessing, progress, currentStage }) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isProcessing && url.trim()) {
      handleSubmit();
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-800">Von Webseite importieren</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Gib die URL einer Rezept-Webseite ein, um automatisch alle Informationen zu extrahieren.
        </p>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://www.beispiel.de/rezept"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              className="rounded-xl text-base"
            />
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !url.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Importieren
                </>
              )}
            </Button>
          </div>

          {isProcessing && progress.message && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{progress.message}</span>
                <span className="text-sm font-bold text-blue-600">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Tipp:</strong> Funktioniert mit den meisten Rezept-Webseiten wie Chefkoch, Essen & Trinken, etc.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT WITH CONTAINER
// ============================================
export default function ImportWebUrl(props) {
  return (
    <ImportContainer
      {...props}
      sourceStrategy={webUrlSource}
      sourceType="web_url"
      inputComponent={WebUrlInput}
    />
  );
}