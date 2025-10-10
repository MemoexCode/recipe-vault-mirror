/**
 * FILE UPLOAD SOURCE STRATEGY
 * Handles extraction of raw text from uploaded files (PDF, images)
 */

import { uploadFileWithRetry, retryWithBackoff } from "../importHelpers";
import { ExtractDataFromUploadedFile } from "@/api/integrations";

export const fileUploadSource = {
  name: "file_upload",
  
  /**
   * Extract raw text from uploaded file
   * @param {File} file - The uploaded file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string>} - Extracted raw text
   */
  extractRawText: async (file, onProgress) => {
    if (onProgress) {
      onProgress({ stage: "upload", message: "Datei wird hochgeladen...", progress: 10 });
    }
    
    // Upload file
    const result = await uploadFileWithRetry(file);
    const file_url = result.file_url;
    
    if (onProgress) {
      onProgress({ stage: "ocr", message: "Text wird extrahiert...", progress: 30 });
    }
    
    // Extract raw text using OCR
    const rawTextSchema = {
      type: "object",
      properties: {
        full_text_content: { 
          type: "string", 
          description: "Complete text content extracted from the file, exactly as it appears" 
        }
      },
      required: ["full_text_content"]
    };
    
    const extractionResult = await retryWithBackoff(async () => {
      return await ExtractDataFromUploadedFile({ file_url, json_schema: rawTextSchema });
    }, 4, 5000);
    
    if (extractionResult.status === "error") {
      throw new Error(extractionResult.details || "Text-Extraktion fehlgeschlagen.");
    }
    
    const rawText = extractionResult.output?.full_text_content || "";
    
    if (!rawText || rawText.length < 50) {
      throw new Error("Extrahierter Text ist zu kurz oder leer.");
    }
    
    if (onProgress) {
      onProgress({ stage: "complete", message: "Text erfolgreich extrahiert", progress: 50 });
    }
    
    return rawText;
  }
};