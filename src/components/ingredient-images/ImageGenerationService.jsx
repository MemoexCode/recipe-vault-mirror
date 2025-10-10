import { GenerateImage } from "@/api/integrations";
import { IngredientImage } from "@/api/entities";
import { generateIngredientPrompt } from "./constants";
import { generateAlternativeNames } from "@/components/utils/ingredientMatcher";

/**
 * Service für Bildgenerierung mit Retry-Logik
 */
export class ImageGenerationService {
  constructor() {
    this.maxRetries = 4; // Erhöht von 3 auf 4
    this.baseDelay = 2000; // Erhöht von 1000 auf 2000ms
  }

  /**
   * Generiert ein Bild mit automatischen Wiederholungsversuchen
   */
  async generateWithRetry(prompt, onRetryUpdate = null) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (onRetryUpdate) {
          onRetryUpdate(attempt);
        }

        // Exponentielles Backoff bei Wiederholungen
        if (attempt > 1) {
          const waitTime = this.baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Warte ${(waitTime/1000).toFixed(1)}s vor Versuch ${attempt}...`);
          await this.sleep(waitTime);
        }

        const { url } = await GenerateImage({ prompt });
        return url;
      } catch (err) {
        console.error(`❌ Versuch ${attempt}/${this.maxRetries} fehlgeschlagen:`, err);

        // Letzter Versuch - Fehler werfen
        if (attempt === this.maxRetries) {
          throw this.createDetailedError(err, attempt);
        }

        // Prüfen ob Retry sinnvoll ist
        if (!this.shouldRetry(err)) {
          throw this.createDetailedError(err, attempt);
        }
      }
    }
  }

  /**
   * Prüft ob ein Retry sinnvoll ist
   */
  shouldRetry(error) {
    const errorString = String(error?.message || error);
    return (
      errorString.includes("timeout") ||
      errorString.includes("Timeout") ||
      errorString.includes("544") ||
      errorString.includes("DatabaseTimeout") ||
      errorString.includes("500") ||
      errorString.includes("502") ||
      errorString.includes("503")
    );
  }

  /**
   * Erstellt eine benutzerfreundliche Fehlermeldung
   */
  createDetailedError(error, attempts) {
    const errorString = String(error?.message || error);
    
    let message = `Fehler nach ${attempts} Versuchen.`;
    
    if (errorString.includes("timeout") || errorString.includes("Timeout") || errorString.includes("544") || errorString.includes("DatabaseTimeout")) {
      message = `Der Bildgenerungs-Service ist überlastet (nach ${attempts} Versuchen). Bitte versuche es in einigen Minuten erneut.`;
    } else if (errorString.includes("500") || errorString.includes("502") || errorString.includes("503")) {
      message = `Server-Fehler bei der Bildgenerierung (nach ${attempts} Versuchen). Bitte später erneut versuchen.`;
    } else if (errorString.includes("400")) {
      message = "Fehlerhafte Anfrage. Bitte überprüfe die Eingabe.";
    }
    
    return new Error(message);
  }

  /**
   * Generiert ein einzelnes Zutatenbild MIT intelligenten Tags
   */
  async generateIngredientImage(ingredientName, onRetryUpdate = null) {
    const normalizedName = ingredientName.trim().toLowerCase();

    const existing = await IngredientImage.filter({ ingredient_name: normalizedName });
    if (existing.length > 0) {
      throw new Error(`Bild für "${normalizedName}" existiert bereits!`);
    }

    const prompt = await generateIngredientPrompt(ingredientName.trim());
    const imageUrl = await this.generateWithRetry(prompt, onRetryUpdate);

    const alternativeNames = await generateAlternativeNames(ingredientName.trim());

    await IngredientImage.create({
      ingredient_name: normalizedName,
      alternative_names: alternativeNames,
      image_url: imageUrl,
      is_generated: true
    });

    return { ingredientName: normalizedName, imageUrl, alternativeNames };
  }

  /**
   * Bulk-Generierung mit Fortschritts-Tracking und Tags
   */
  async bulkGenerate(ingredientList, callbacks = {}) {
    const {
      onProgress = () => {},
      onItemComplete = () => {},
      onItemSkipped = () => {},
      onItemFailed = () => {}
    } = callbacks;

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (let i = 0; i < ingredientList.length; i++) {
      const ingredientName = ingredientList[i];
      
      onProgress({
        current: i + 1,
        total: ingredientList.length,
        currentName: ingredientName
      });

      try {
        const existing = await IngredientImage.filter({ 
          ingredient_name: ingredientName.toLowerCase() 
        });
        
        if (existing.length > 0) {
          results.skipped.push(ingredientName);
          onItemSkipped(ingredientName);
          continue;
        }

        const prompt = await generateIngredientPrompt(ingredientName);
        const imageUrl = await this.generateWithRetry(prompt);

        const alternativeNames = await generateAlternativeNames(ingredientName);

        await IngredientImage.create({
          ingredient_name: ingredientName.toLowerCase(),
          alternative_names: alternativeNames,
          image_url: imageUrl,
          is_generated: true
        });

        results.success.push(ingredientName);
        onItemComplete(ingredientName);

        await this.sleep(1500); // Kleine Pause zwischen Generierungen

      } catch (err) {
        console.error(`❌ Fehler bei ${ingredientName}:`, err);
        results.failed.push(ingredientName);
        onItemFailed(ingredientName, err);
      }
    }

    return results;
  }

  /**
   * Hilfsfunktion für Verzögerungen
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ImageGenerationService();