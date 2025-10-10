import { InvokeLLM } from "@/api/integrations";

/**
 * WEB URL SOURCE STRATEGY
 * Handles extraction of recipe text from web URLs
 */
export const webUrlSource = {
  /**
   * Extract raw text from a web URL
   * @param {string} url - The web URL to extract from
   * @param {Function} setProgress - Progress callback
   * @returns {Promise<string>} - Raw extracted text
   */
  extractRawText: async (url, setProgress) => {
    // CRITICAL VALIDATION: Ensure URL is valid
    if (!url || typeof url !== 'string') {
      throw new Error("Ungültige URL. Bitte gib eine gültige Webadresse ein.");
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
      throw new Error("URL darf nicht leer sein.");
    }

    // VALIDATE URL FORMAT
    try {
      new URL(trimmedUrl);
    } catch (err) {
      throw new Error("Ungültiges URL-Format. Bitte gib eine vollständige URL ein (z.B. https://example.com/rezept).");
    }

    // STEP 1: FETCH WEB CONTENT
    setProgress({ stage: "fetch", message: "Lade Webseite...", progress: 10 });
    
    const fetchPrompt = `
Besuche die folgende URL und extrahiere den gesamten sichtbaren Text der Webseite.
Gib NUR den Text zurück, ohne HTML-Tags oder Formatierung.

URL: ${trimmedUrl}

Wichtig:
- Extrahiere den gesamten sichtbaren Textinhalt
- Entferne alle HTML-Tags, Scripts, Styles
- Behalte die logische Struktur bei (Absätze, Listen)
- Gib den Text in lesbarem Format zurück
    `.trim();

    setProgress({ stage: "extract", message: "Extrahiere Text von Webseite...", progress: 30 });

    try {
      const rawText = await InvokeLLM({
        prompt: fetchPrompt,
        add_context_from_internet: true
      });

      // VALIDATE EXTRACTED TEXT
      if (!rawText || typeof rawText !== 'string') {
        throw new Error("Keine Textdaten von der Webseite erhalten.");
      }

      const cleanedText = rawText.trim();
      if (cleanedText === '') {
        throw new Error("Die Webseite enthält keinen lesbaren Text.");
      }

      if (cleanedText.length < 50) {
        throw new Error("Zu wenig Text extrahiert. Bitte überprüfe die URL.");
      }

      setProgress({ stage: "complete", message: "Text erfolgreich extrahiert", progress: 50 });
      return cleanedText;

    } catch (err) {
      console.error("Web URL Extraction Error:", err);
      throw new Error(`Fehler beim Laden der Webseite: ${err.message}`);
    }
  }
};