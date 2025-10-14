import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, Link as LinkIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

import { useApp } from "@/components/contexts/AppContext";
import { COLORS } from "@/components/utils/constants";
import ImportContainer from "../components/import/ImportContainer";

export default function ImportPage() {
  const { STAGES, currentStage, resetImportProcess } = useApp();

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.location.href = createPageUrl("Browse")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Rezept importieren
            </h1>
            <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Aus URL, PDF oder Bild
            </p>
          </div>
        </div>

        <ImportContainer />
      </div>
    </div>
  );
}