/**
 * DEBUG PAGE - NUR FÜR ENTWICKLUNG
 * 
 * Zweck:
 * - Zeigt interne Logs für Entwickler an
 * - Erlaubt Logs zu löschen und zu exportieren
 * - Nur zugänglich in Development Mode
 * 
 * Route: /debug
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertCircle, Trash2, Download, RefreshCw, Info, AlertTriangle, Bug
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { 
  getLogs, 
  clearLogs, 
  getLogStats, 
  exportLogsAsJSON,
  LOG_LEVELS 
} from "@/components/utils/logging";
import { COLORS } from "@/components/utils/constants";

// Prüft ob wir im Development Mode sind
const isDevelopment = () => {
  try {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('dev') ||
           window.location.hostname.includes('staging');
  } catch {
    return false;
  }
};

export default function DebugPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');

  // Redirect in Production
  useEffect(() => {
    if (!isDevelopment()) {
      navigate(createPageUrl("Browse"));
    }
  }, [navigate]);

  // Load logs
  const refreshLogs = () => {
    const allLogs = getLogs();
    setLogs(allLogs.reverse()); // Neueste zuerst
    setStats(getLogStats());
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  // Handle clear logs
  const handleClearLogs = () => {
    if (confirm("Alle Logs löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      clearLogs();
      refreshLogs();
    }
  };

  // Handle export
  const handleExport = () => {
    const json = exportLogsAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipe-vault-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  // Level badge colors
  const getLevelBadge = (level) => {
    const config = {
      [LOG_LEVELS.ERROR]: { color: "bg-red-100 text-red-800", icon: AlertCircle },
      [LOG_LEVELS.WARN]: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
      [LOG_LEVELS.INFO]: { color: "bg-blue-100 text-blue-800", icon: Info },
      [LOG_LEVELS.DEBUG]: { color: "bg-gray-100 text-gray-800", icon: Bug }
    };
    
    const { color, icon: Icon } = config[level] || config[LOG_LEVELS.INFO];
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {level.toUpperCase()}
      </Badge>
    );
  };

  // Only render in development
  if (!isDevelopment()) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bug className="w-8 h-8" style={{ color: COLORS.ACCENT }} />
            <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Debug Console
            </h1>
          </div>
          <p className="text-lg" style={{ color: COLORS.TEXT_SECONDARY }}>
            Interne Logs & Fehler-Tracking (nur Development)
          </p>
        </div>

        {/* Warning Alert */}
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Diese Seite ist nur in der Entwicklungsumgebung zugänglich und wird in Production automatisch deaktiviert.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="text-3xl font-bold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                  {stats.total}
                </div>
                <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Gesamt-Logs
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="text-3xl font-bold mb-1 text-red-600">
                  {stats.byLevel.error}
                </div>
                <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Fehler
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="text-3xl font-bold mb-1 text-yellow-600">
                  {stats.byLevel.warn}
                </div>
                <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Warnungen
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="text-3xl font-bold mb-1 text-blue-600">
                  {stats.byLevel.info}
                </div>
                <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Infos
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={refreshLogs}
            variant="outline"
            className="rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-xl"
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Als JSON exportieren
          </Button>

          <Button
            onClick={handleClearLogs}
            variant="outline"
            className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
            disabled={logs.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Logs löschen
          </Button>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Seite neu laden
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG].map(level => (
            <Button
              key={level}
              onClick={() => setFilter(level)}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
            >
              {level === 'all' ? 'Alle' : level.toUpperCase()}
              {level !== 'all' && stats && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                  {stats.byLevel[level]}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Logs List */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Log-Einträge ({filteredLogs.length})</span>
              {stats?.newest && (
                <span className="text-sm font-normal" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Neuester Eintrag: {format(new Date(stats.newest), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center" style={{ color: COLORS.TEXT_SECONDARY }}>
                <Bug className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Keine Logs vorhanden</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getLevelBadge(log.level)}
                        {log.context && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.context}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {log.message}
                    </div>

                    {log.details && Object.keys(log.details).some(k => log.details[k]) && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                          Details anzeigen
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}