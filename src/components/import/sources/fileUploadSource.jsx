import { UploadFile, InvokeLLM } from "@/api/integrations";

/**
 * FILE UPLOAD SOURCE STRATEGY
 * Handles extraction of recipe text from uploaded files (PDF, images)
 */
export const fileUploadSource = {
  /**
   * Extract raw text from an uploaded file
   * @param {File} file - The uploaded file object
   * @param {Function} setProgress - Progress callback
   * @returns {Promise<string>} - Raw extracted text
   */
  extractRawText: async (file, setProgress) => {
    // CRITICAL VALIDATION: Ensure file is valid
    if (!file) {
      throw new Error("Keine Datei ausgewählt. Bitte wähle eine Datei aus.");
    }

    if (!(file instanceof File)) {
      throw new Error("Ungültiges Dateiformat. Bitte lade eine gültige Datei hoch.");
    }

    // VALIDATE FILE TYPE
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Dateityp nicht unterstützt: ${file.type}. Bitte lade ein PDF oder Bild (JPG, PNG, WebP) hoch.`);
    }

    // VALIDATE FILE SIZE (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Datei zu groß (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximale Größe: 10MB.`);
    }

    // STEP 1: UPLOAD FILE WITH RETRY LOGIC
    setProgress({ stage: "upload", message: "Lade Datei hoch...", progress: 10 });
    
    let fileUrl;
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const waitTime = 2000 * Math.pow(2, attempt - 1); // Exponential backoff
          setProgress({ 
            stage: "upload", 
            message: `Upload-Versuch ${attempt}/${maxRetries}... (Warte ${waitTime/1000}s)`, 
            progress: 10 
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const uploadResult = await UploadFile({ file });
        fileUrl = uploadResult.file_url;

        if (!fileUrl || typeof fileUrl !== 'string') {
          throw new Error("Fehler beim Hochladen der Datei.");
        }

        // SUCCESS - break retry loop
        break;

      } catch (err) {
        lastError = err;
        console.error(`Upload attempt ${attempt}/${maxRetries} failed:`, err);

        const errorString = String(err?.message || err);
        
        // Check if this is a retryable error
        const isRetryable = 
          errorString.includes("544") || 
          errorString.includes("DatabaseTimeout") ||
          errorString.includes("500") ||
          errorString.includes("502") ||
          errorString.includes("503") ||
          errorString.includes("timeout");

        // If not retryable or last attempt, throw
        if (!isRetryable || attempt === maxRetries) {
          if (errorString.includes("544") || errorString.includes("DatabaseTimeout")) {
            throw new Error(
              `Der Upload-Service ist derzeit überlastet (Datenbank-Timeout nach ${attempt} Versuchen). ` +
              `Bitte versuche es in einigen Minuten erneut oder lade eine kleinere Datei hoch.`
            );
          } else if (errorString.includes("500") || errorString.includes("502") || errorString.includes("503")) {
            throw new Error(
              `Server-Fehler beim Hochladen (nach ${attempt} Versuchen). ` +
              `Der Service könnte derzeit überlastet sein. Bitte versuche es später erneut.`
            );
          }
          throw new Error(`Fehler beim Hochladen nach ${attempt} Versuchen: ${errorString}`);
        }
      }
    }

    if (!fileUrl) {
      throw new Error(`Upload fehlgeschlagen nach ${maxRetries} Versuchen: ${lastError?.message || 'Unbekannter Fehler'}`);
    }

    // STEP 2: EXTRACT TEXT WITH OCR
    setProgress({ stage: "ocr", message: "Extrahiere Text aus Datei...", progress: 30 });

    const ocrPrompt = `
Analysiere die hochgeladene Datei und extrahiere den gesamten Text.
Die Datei enthält ein Rezept.

Wichtig:
- Extrahiere ALLEN sichtbaren Text
- Behalte die Struktur bei (Überschriften, Listen, Absätze)
- Ignoriere Grafiken und Dekorationselemente
- Gib den Text in lesbarem, strukturiertem Format zurück
- Falls Tabellen vorhanden sind, formatiere sie als Listen

Gib NUR den extrahierten Text zurück, keine Erklärungen.
    `.trim();

    try {
      const rawText = await InvokeLLM({
        prompt: ocrPrompt,
        add_context_from_internet: false,
        file_urls: [fileUrl]
      });

      // VALIDATE EXTRACTED TEXT
      if (!rawText || typeof rawText !== 'string') {
        throw new Error("Kein Text aus der Datei extrahiert.");
      }

      const cleanedText = rawText.trim();
      if (cleanedText === '') {
        throw new Error("Die Datei enthält keinen lesbaren Text.");
      }

      if (cleanedText.length < 30) {
        throw new Error("Zu wenig Text extrahiert. Möglicherweise ist die Datei unleserlich oder leer.");
      }

      setProgress({ stage: "complete", message: "Text erfolgreich extrahiert", progress: 50 });
      return cleanedText;

    } catch (err) {
      console.error("File OCR Error:", err);
      throw new Error(`Fehler beim Extrahieren des Texts: ${err.message}`);
    }
  }
};