/**
 * WEB URL SOURCE STRATEGY
 * Handles extraction of raw text from web URLs
 */

import { retryWithBackoff } from "../importHelpers";
import { ExtractDataFromUploadedFile } from "@/api/integrations";

export const webUrlSource = {
  name: "web_url",
  
  /**
   * Extract raw text from web URL
   * @param {string} url - The web URL
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string>} - Extracted raw text
   */
  extractRawText: async (url, onProgress) => {
    if (onProgress) {
      onProgress({ stage: "fetch", message: "Webseite wird geladen...", progress: 10 });
    }
    
    // Extract HTML text from URL
    const rawTextSchema = {
      type: "object",
      properties: {
        full_text_content: {
          type: "string",
          description: "Complete text content extracted from the webpage"
        }
      },
      required: ["full_text_content"]
    };

    const extractionResult = await retryWithBackoff(async () => {
      return await ExtractDataFromUploadedFile({
        file_url: url,
        json_schema: rawTextSchema
      });
    }, 3, 4000);

    if (extractionResult.status === "error") {
      throw new Error(extractionResult.details || "Fehler beim Laden der Webseite.");
    }

    const rawText = extractionResult.output?.full_text_content || "";
    
    if (!rawText || rawText.length < 100) {
      throw new Error("Zu wenig Text von der Webseite extrahiert. Bitte prüfe die URL.");
    }
    
    if (onProgress) {
      onProgress({ stage: "complete", message: "Text erfolgreich extrahiert", progress: 50 });
    }
    
    return rawText;
  }
};