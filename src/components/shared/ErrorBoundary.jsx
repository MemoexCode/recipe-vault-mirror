
/**
 * ERROR BOUNDARY COMPONENT
 * 
 * Zweck:
 * - Fängt React Rendering-Errors ab
 * - Verhindert kompletten App-Crash
 * - Loggt Errors für Debugging
 * - Zeigt benutzerfreundliche Fallback-UI
 * 
 * Sicherheit:
 * - Alle Errors werden geloggt (logging.js)
 * - User sieht nur nicht-technische deutsche Nachricht
 * - Developer bekommt Link zur Debug-Seite
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Bug } from "lucide-react";
import { createPageUrl } from "@/utils";

import { logError } from "@/components/utils/logging";
import { showError } from "@/components/ui/toastUtils";
import { isDevelopment } from "@/components/utils/env";
import { COLORS } from "@/components/utils/constants";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log Error für Entwickler - NEU: Explizite Übergabe von error.message
    logError(error.message, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorStack: error.stack
    });

    // Zeige User-Friendly Toast
    showError(
      "Ein Fehler ist aufgetreten. Bitte lade die Seite neu oder öffne Debug für Details."
    );

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: COLORS.SILVER_LIGHTER }}
        >
          <Card className="max-w-2xl w-full rounded-2xl shadow-lg">
            <CardContent className="p-8">
              {/* Error Icon */}
              <div 
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.ACCENT}20` }}
              >
                <AlertCircle 
                  className="w-12 h-12"
                  style={{ color: COLORS.ACCENT }}
                />
              </div>

              {/* Title */}
              <h1 
                className="text-3xl font-bold text-center mb-4"
                style={{ color: COLORS.TEXT_PRIMARY }}
              >
                Etwas ist schiefgelaufen
              </h1>

              {/* Message */}
              <p 
                className="text-center text-lg mb-8"
                style={{ color: COLORS.TEXT_SECONDARY }}
              >
                Die Anwendung konnte nicht korrekt geladen werden. 
                Bitte lade die Seite neu oder kontaktiere den Support, 
                falls das Problem weiterhin besteht.
              </p>

              {/* Error Details (nur für Entwickler) */}
              {isDevelopment() && this.state.error && (
                <details className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <summary className="cursor-pointer font-semibold text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
                    🔍 Fehlerdetails (nur für Entwickler)
                  </summary>
                  <div className="mt-4 space-y-2">
                    <div>
                      <strong className="text-xs text-gray-600">Error Message:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong className="text-xs text-gray-600">Stack Trace:</strong>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReload}
                  className="text-white font-medium px-8 py-3 rounded-xl flex items-center gap-2"
                  style={{ backgroundColor: COLORS.ACCENT }}
                >
                  <RefreshCw className="w-5 h-5" />
                  Seite neu laden
                </Button>

                {isDevelopment() && (
                  <a href={createPageUrl("Debug")}>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto px-8 py-3 rounded-xl flex items-center gap-2"
                    >
                      <Bug className="w-5 h-5" />
                      Debug öffnen
                    </Button>
                  </a>
                )}
              </div>

              {/* Support Hint */}
              <p className="text-center text-xs mt-6" style={{ color: COLORS.TEXT_SECONDARY }}>
                Problem wird nicht gelöst? Schicke uns einen Screenshot über das Feedback-Formular.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ DEFAULT EXPORT (primary)
export default ErrorBoundary;

// ✅ NAMED EXPORT (for robustness - allows both import styles)
export { ErrorBoundary };
