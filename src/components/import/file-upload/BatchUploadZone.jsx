import React, { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Image as ImageIcon } from "lucide-react";
import { COLORS } from "@/components/utils/constants";

// Allowed MIME types for security validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

// Validate files based on MIME type
const validateFiles = (files) => {
  const validFiles = [];
  const invalidFiles = [];
  
  files.forEach(file => {
    if (ALLOWED_MIME_TYPES.includes(file.type)) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file.name);
    }
  });
  
  return { validFiles, invalidFiles };
};

export default function BatchUploadZone({ onUpload }) {
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const { validFiles, invalidFiles } = validateFiles(files);
      
      if (invalidFiles.length > 0) {
        alert(`❌ Folgende Dateien wurden abgelehnt (ungültiger Dateityp):\n\n${invalidFiles.join('\n')}\n\nErlaubte Formate: JPG, PNG, WEBP, PDF`);
      }
      
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    }
  }, [onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      const { validFiles, invalidFiles } = validateFiles(files);
      
      if (invalidFiles.length > 0) {
        alert(`❌ Folgende Dateien wurden abgelehnt (ungültiger Dateityp):\n\n${invalidFiles.join('\n')}\n\nErlaubte Formate: JPG, PNG, WEBP, PDF`);
      }
      
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <Card className="rounded-2xl shadow-sm border-2 border-dashed" style={{ borderColor: COLORS.SILVER }}>
      <CardContent className="p-12">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${COLORS.ACCENT}20` }}>
            <Upload className="w-10 h-10" style={{ color: COLORS.ACCENT }} />
          </div>
          
          <h3 className="text-2xl font-bold mb-3 text-gray-800">
            Rezepte hochladen
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Ziehe Dateien hierher oder klicke zum Auswählen. Unterstützt werden PDF, Bilder (JPG, PNG, WEBP) und mehrere Dateien gleichzeitig.
          </p>

          <label className="inline-block">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="px-8 py-4 rounded-xl text-white font-medium cursor-pointer inline-flex items-center hover:opacity-90 transition-opacity" style={{ backgroundColor: COLORS.ACCENT }}>
              <Upload className="w-5 h-5 mr-2" />
              Dateien auswählen
            </span>
          </label>

          <div className="mt-8 flex justify-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-5 h-5" />
              <span>PDF</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ImageIcon className="w-5 h-5" />
              <span>JPG, PNG, WEBP</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}