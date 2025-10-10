import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2 } from "lucide-react";

export default function QuickGenerateCard({ 
  value, 
  onChange, 
  onGenerate, 
  isGenerating, 
  error,
  retryAttempt 
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isGenerating && value.trim()) {
      onGenerate();
    }
  };

  return (
    <Card className="rounded-2xl mb-6" style={{ borderColor: "#8B5CF6", borderWidth: "2px" }}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" style={{ color: "#8B5CF6" }} />
          <h3 className="text-lg font-semibold text-gray-800">
            Schnellgenerierung
          </h3>
        </div>
        <p className="text-sm mb-4 text-gray-600">
          Gib den Namen einer Zutat ein, um sofort ein Bild im gleichen Stil zu generieren
        </p>
        <div className="flex gap-3">
          <Input
            placeholder="z.B. Brokkoli, Basilikum, Lachs..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            className="rounded-xl"
          />
          <Button
            onClick={onGenerate}
            disabled={!value.trim() || isGenerating}
            className="text-white font-medium px-6 rounded-xl"
            style={{ backgroundColor: "#8B5CF6" }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {retryAttempt > 0 && retryAttempt <= 3 ? `(${retryAttempt}/3)` : "Generiere..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generieren
              </>
            )}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-4 rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}