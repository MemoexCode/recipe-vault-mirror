import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, X, Loader2, AlertTriangle } from "lucide-react";

export default function OCRReviewStage({ ocrText, metadata, onApprove, onReject, isProcessing }) {
  const [editedText, setEditedText] = useState(ocrText);

  useEffect(() => {
    setEditedText(ocrText);
  }, [ocrText]);

  return (
    <Card className="rounded-2xl bg-white shadow-sm">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Text-Prüfung
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Überprüfe den erkannten Text und korrigiere bei Bedarf OCR-Fehler. Dieser Text wird dann für die Datenextraktion verwendet.
          </p>

          {/* TASK 3: Low Confidence Warning */}
          {metadata && !metadata.isReliable && (
            <Alert variant="warning" className="mb-4 rounded-xl border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Niedrige Erkennungsqualität:</strong> Der extrahierte Text scheint unvollständig zu sein (Confidence: {metadata.confidence}%). 
                Bitte überprüfe den Text sorgfältig und ergänze fehlende Informationen manuell, bevor du fortfährst.
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant={metadata?.hasPortions ? "default" : "secondary"} className="rounded-full">
              {metadata?.hasPortions ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Portionen
            </Badge>
            <Badge variant={metadata?.hasTime ? "default" : "secondary"} className="rounded-full">
              {metadata?.hasTime ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Zeitangaben
            </Badge>
            <Badge variant={metadata?.hasIngredients ? "default" : "secondary"} className="rounded-full">
              {metadata?.hasIngredients ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Zutaten
            </Badge>
            <Badge variant={metadata?.hasInstructions ? "default" : "secondary"} className="rounded-full">
              {metadata?.hasInstructions ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Zubereitung
            </Badge>

            {metadata?.confidence !== undefined && (
              <Badge
                variant={metadata.confidence >= 70 ? "default" : "destructive"}
                className="rounded-full ml-auto"
              >
                {metadata.confidence >= 70 ? "Hohe Qualität" : metadata.confidence >= 40 ? "Mittlere Qualität" : "Niedrige Qualität"} ({metadata.confidence}%)
              </Badge>
            )}
          </div>
        </div>

        {/* Editable Text Area */}
        <div className="mb-6">
          <Label className="text-base font-semibold mb-3 block">
            Erkannter Text (editierbar)
          </Label>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-[500px] font-mono text-sm leading-relaxed rounded-xl"
            placeholder="Extrahierter Text wird hier angezeigt..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onReject}
            variant="outline"
            disabled={isProcessing}
            className="rounded-xl"
          >
            Abbrechen
          </Button>
          <Button
            onClick={() => onApprove(editedText)}
            disabled={isProcessing || !editedText.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verarbeite...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Text bestätigen & weiter
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}