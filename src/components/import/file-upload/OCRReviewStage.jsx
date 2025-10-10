/**
 * OCR REVIEW STAGE
 * Zweck: Erlaubt dem Benutzer, den extrahierten OCR-Text zu überprüfen und zu bearbeiten
 * Props: structuredText (string), metadata (object), onApprove (function), onCancel (function)
 * Interaktion: Zeigt strukturierten Text in einer bearbeitbaren Textarea an
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import { COLORS } from "@/components/utils/constants";

export default function OCRReviewStage({ structuredText, metadata, onApprove, onCancel }) {
  // DEFENSIVE: Ensure editedText is always a string, even if structuredText is undefined/null
  const [editedText, setEditedText] = useState(structuredText || "");

  const handleApprove = () => {
    if (editedText.trim() === "") {
      alert("Der Text darf nicht leer sein. Bitte überprüfe den extrahierten Text.");
      return;
    }
    onApprove(editedText);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" style={{ color: COLORS.ACCENT }} />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Extrahierter Text überprüfen
            </CardTitle>
          </div>
          <p className="text-gray-600 mt-2">
            Der Text wurde erfolgreich extrahiert. Bitte überprüfe ihn auf Vollständigkeit und Korrektheit.
          </p>
        </CardHeader>

        {/* Metadata */}
        {metadata && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <span className="font-semibold">Zeichen:</span>
                {metadata.characterCount || 0}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <span className="font-semibold">Wörter:</span>
                {metadata.wordCount || 0}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <span className="font-semibold">Zeilen:</span>
                {metadata.lineCount || 0}
              </Badge>
            </div>

            {/* Quality Indicator */}
            {metadata.quality && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                {metadata.quality === "excellent" && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Ausgezeichnete Textqualität
                    </span>
                  </>
                )}
                {metadata.quality === "good" && (
                  <>
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Gute Textqualität
                    </span>
                  </>
                )}
                {metadata.quality === "fair" && (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">
                      Moderate Textqualität - Bitte überprüfen
                    </span>
                  </>
                )}
                {metadata.quality === "poor" && (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      Niedrige Textqualität - Manuelle Überprüfung empfohlen
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Text Editor */}
      <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <CardContent className="p-6">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[400px] font-mono text-sm leading-relaxed rounded-xl"
            placeholder="Extrahierter Text wird hier angezeigt..."
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-xl px-6"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleApprove}
              className="text-white font-medium rounded-xl px-8"
              style={{ backgroundColor: COLORS.ACCENT }}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Text bestätigen & fortfahren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}