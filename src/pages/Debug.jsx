/**
 * DEBUG PAGE - ENTWICKLER-KONSOLE
 * 
 * Zweck:
 * - Zeigt interne Logs für Entwickler an
 * - Erlaubt Logs zu löschen und zu exportieren
 * - Nur zugänglich in Development Mode
 * - Visuell integriert in Recipe Vault Design System
 * 
 * Route: /debug
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, Trash2, Download, RefreshCw, Info, AlertTriangle, Bug, 
  ArrowLeft, Filter
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
import { showSuccess, showInfo } from "@/components/ui/toastUtils";
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
  const [autoRefresh, setAutoRefresh] = useState(false);

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

  // Auto-refresh every 5s
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Handle clear logs
  const handleClearLogs = () => {
    if (confirm("Alle Logs löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      clearLogs();
      refreshLogs();
      showSuccess("Logs erfolgreich gelöscht.");
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
    showSuccess("Logs als JSON exportiert.");
  };

  // Filter logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  // Level badge configuration
  const getLevelConfig = (level) => {
    const configs = {
      [LOG_LEVELS.ERROR]: { 
        color: "bg-red-500 text-white", 
        icon: AlertCircle,
        label: "Fehler"
      },
      [LOG_LEVELS.WARN]: { 
        color: "bg-amber-500 text-white", 
        icon: AlertTriangle,
        label: "Warnung"
      },
      [LOG_LEVELS.INFO]: { 
        color: "bg-blue-500 text-white", 
        icon: Info,
        label: "Info"
      },
      [LOG_LEVELS.DEBUG]: { 
        color: "bg-gray-400 text-gray-900", 
        icon: Bug,
        label: "Debug"
      }
    };
    
    return configs[level] || configs[LOG_LEVELS.INFO];
  };

  // Only render in development
  if (!isDevelopment()) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      {/* Developer Mode Banner */}
      <div 
        className="sticky top-0 z-50 py-3 px-6 text-center text-white text-sm font-medium shadow-md"
        style={{ backgroundColor: COLORS.ACCENT }}
      >
        ⚙️ Entwicklermodus – Diese Seite ist nur in der Entwicklungsumgebung sichtbar.
      </div>

      <div className="p-4 md:p-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(createPageUrl("Browse"))}
                className="rounded-xl flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                  Debug Console
                </h1>
                <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Interne Logs & Fehler-Tracking
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="rounded-2xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${COLORS.ACCENT}20` }}
                    >
                      <Bug className="w-6 h-6" style={{ color: COLORS.ACCENT }} />
                    </div>
                    <div>
                      <div className="text-3xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                        {stats.total}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                        Gesamt
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-white shadow-sm border border-red-100 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-600">
                        {stats.byLevel.error}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                        Fehler
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-white shadow-sm border border-amber-100 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600">
                        {stats.byLevel.warn}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                        Warnungen
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-white shadow-sm border border-blue-100 transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Info className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {stats.byLevel.info}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                        Infos
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Bar */}
          <Card className="rounded-2xl bg-white shadow-sm border border-gray-100 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={refreshLogs}
                    variant="outline"
                    className="rounded-xl"
                    aria-label="Logs aktualisieren"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Aktualisieren
                  </Button>

                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="rounded-xl"
                    disabled={logs.length === 0}
                    aria-label="Logs als JSON exportieren"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportieren
                  </Button>

                  <Button
                    onClick={handleClearLogs}
                    variant="outline"
                    className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                    disabled={logs.length === 0}
                    aria-label="Alle Logs löschen"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                      Auto-Refresh (5s)
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter Tabs */}
          <Card className="rounded-2xl bg-white shadow-sm border border-gray-100 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4" style={{ color: COLORS.TEXT_SECONDARY }} />
                <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_SECONDARY }}>
                  Filter:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setFilter('all')}
                  variant={filter === 'all' ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  style={filter === 'all' ? { 
                    backgroundColor: COLORS.ACCENT,
                    color: "white"
                  } : {}}
                  aria-label="Alle Logs anzeigen"
                >
                  Alle
                  <Badge variant="secondary" className="ml-2 bg-white/20">
                    {stats?.total || 0}
                  </Badge>
                </Button>

                {[LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG].map(level => {
                  const config = getLevelConfig(level);
                  const count = stats?.byLevel[level] || 0;
                  
                  return (
                    <Button
                      key={level}
                      onClick={() => setFilter(level)}
                      variant={filter === level ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl"
                      style={filter === level ? { 
                        backgroundColor: COLORS.ACCENT,
                        color: "white"
                      } : {}}
                      aria-label={`${config.label} anzeigen`}
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                      <Badge variant="secondary" className="ml-2 bg-white/20">
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <Card className="rounded-2xl bg-white shadow-sm border border-gray-100">
                <CardContent className="p-12 text-center">
                  <Bug className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: COLORS.TEXT_SECONDARY }} />
                  <p className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                    Keine Logs vorhanden
                  </p>
                  <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {filter === 'all' 
                      ? 'Es wurden noch keine Logs aufgezeichnet.'
                      : `Keine Logs mit Level "${filter}" gefunden.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredLogs.map((log, index) => {
                const config = getLevelConfig(log.level);
                const LogIcon = config.icon;
                
                return (
                  <Card 
                    key={index}
                    className="rounded-2xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md hover:scale-[1.01] duration-200"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Icon */}
                        <div 
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}
                        >
                          <LogIcon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge className={`${config.color} font-semibold`}>
                              {config.label.toUpperCase()}
                            </Badge>
                            
                            {log.context && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.context}
                              </Badge>
                            )}
                            
                            <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
                              {format(new Date(log.timestamp), "dd.MM.yyyy • HH:mm:ss", { locale: de })}
                            </span>
                          </div>

                          <p className="text-base font-medium mb-2 leading-relaxed" style={{ color: COLORS.TEXT_PRIMARY }}>
                            {log.message}
                          </p>

                          {log.details && Object.keys(log.details).some(k => log.details[k]) && (
                            <details className="mt-3">
                              <summary className="text-sm cursor-pointer hover:text-gray-900 transition-colors font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                                📋 Details anzeigen
                              </summary>
                              <pre className="mt-3 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Context Stats (Bottom Section) */}
          {stats && Object.keys(stats.byContext).length > 0 && (
            <Card className="rounded-2xl bg-white shadow-sm border border-gray-100 mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5" style={{ color: COLORS.ACCENT }} />
                  Logs nach Kontext
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.byContext)
                    .sort((a, b) => b[1] - a[1])
                    .map(([context, count]) => (
                      <div 
                        key={context}
                        className="p-4 rounded-xl border transition-all hover:shadow-md"
                        style={{ borderColor: COLORS.SILVER_LIGHT }}
                      >
                        <div className="text-2xl font-bold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                          {count}
                        </div>
                        <div className="text-sm font-mono" style={{ color: COLORS.TEXT_SECONDARY }}>
                          {context}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}