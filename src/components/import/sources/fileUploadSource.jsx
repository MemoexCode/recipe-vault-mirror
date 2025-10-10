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

    // STEP 1: UPLOAD FILE
    setProgress({ stage: "upload", message: "Lade Datei hoch...", progress: 10 });
    
    let fileUrl;
    try {
      const uploadResult = await UploadFile({ file });
      fileUrl = uploadResult.file_url;

      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error("Fehler beim Hochladen der Datei.");
      }

    } catch (err) {
      console.error("File Upload Error:", err);
      throw new Error(`Fehler beim Hochladen: ${err.message}`);
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