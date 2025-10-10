import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ImportContainer from "./ImportContainer";
import { fileUploadSource } from "./sources/fileUploadSource";

// ============================================
// FILE UPLOAD INPUT COMPONENT
// ============================================
function FileUploadInput({ onSubmit, isProcessing, progress, currentStage }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onSubmit(selectedFile);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-800">Datei hochladen</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Lade ein Rezept als PDF oder Bild (JPG, PNG, WebP) hoch. Der Text wird automatisch extrahiert.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !selectedFile}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Hochladen
                </>
              )}
            </Button>
          </div>

          {selectedFile && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800">
                📄 <strong>Ausgewählte Datei:</strong> {selectedFile.name}
              </p>
            </div>
          )}

          {isProcessing && progress.message && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{progress.message}</span>
                <span className="text-sm font-bold text-blue-600">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT WITH CONTAINER
// ============================================
export default function ImportFileUpload() {
  return (
    <ImportContainer
      sourceStrategy={fileUploadSource}
      inputComponent={FileUploadInput}
      sourceType="file_upload"
    />
  );
}