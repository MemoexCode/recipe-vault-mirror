
/**
 * DEBUG PAGE - ENTWICKLER-KONSOLE
 * 
 * Zweck:
 * - Zeigt interne Logs für Entwickler an!!
 * - Erlaubt Logs zu löschen und zu exportieren
 * - Nur zugänglich in Development Mode
 * - Visuell integriert in Recipe Vault Design System
 * 
 * SICHERHEIT:
 * - Destructive Aktionen nur mit expliziter Bestätigung
 * - Typed-Confirmation für "Clear App State"
 * - Nur localStorage/sessionStorage wird gelöscht, keine DB-Daten
 * 
 * Route: /debug
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, Trash2, Download, RefreshCw, Info, AlertTriangle, Bug, 
  ArrowLeft, Filter, ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { createPageUrl } from "@/utils";

import { 
  getLogs, 
  clearLogs, 
  getLogStats, 
  exportLogsAsJSON,
  LOG_LEVELS,
  logInfo,
  logError
} from "@/components/utils/logging";
import { isDevelopment, isDevAllowed } from "@/components/utils/env";
import { showSuccess, showInfo, showError } from "@/components/ui/toastUtils";
import { COLORS } from "@/components/utils/constants";

import { offlineQueue } from "@/components/lib/http";
import { getSessionStats, clearAllSessions } from "@/components/utils/sessionStore";
import CheckpointManager from "@/components/import/file-upload/CheckpointManager";

export default function DebugPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // State für "Clear App State" Modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // NEU: Recovery Stats
  const [recoveryStats, setRecoveryStats] = useState({
    sessionCache: { count: 0, sizeKB: 0 },
    offlineQueue: 0,
    checkpoint: null
  });

  // Redirect wenn nicht im Development Mode
  useEffect(() => {
    if (!isDevelopment()) {
      window.location.href = createPageUrl("Browse");
    }
  }, []);

  // Load logs
  const refreshLogs = () => {
    const allLogs = getLogs();
    setLogs(allLogs.reverse()); // Neueste zuerst
    setStats(getLogStats());
  };

  // NEU: Load Recovery Stats
  const refreshRecoveryStats = () => {
    const sessionStats = getSessionStats();
    const queueSize = offlineQueue.getQueueSize();
    const checkpointAge = CheckpointManager.getCheckpointAge();

    setRecoveryStats({
      sessionCache: {
        count: sessionStats.count,
        sizeKB: sessionStats.totalSizeKB
      },
      offlineQueue: queueSize,
      checkpoint: checkpointAge ? {
        ageMinutes: Math.round(checkpointAge / 1000 / 60),
        exists: true
      } : null
    });
  };

  useEffect(() => {
    refreshLogs();
    refreshRecoveryStats();
  }, []);

  // Auto-refresh every 5s
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshLogs();
        refreshRecoveryStats();
      }, 5000);
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

  // Handle Clear App State (SICHERHEITSKRITISCH)
  const handleClearAppState = () => {
    // SICHERHEIT: Nur in Dev Mode erlaubt
    if (!isDevAllowed()) {
      alert("Diese Aktion ist nur im Entwicklermodus verfügbar.");
      return;
    }

    // SICHERHEIT: Typed-Confirmation erforderlich
    if (confirmText !== "DELETE") {
      alert('Bitte tippe "DELETE" um fortzufahren.');
      return;
    }

    try {
      // SICHERHEIT: Nur localStorage/sessionStorage löschen
      // KEINE Datenbank-Daten werden gelöscht!
      const keysToPreserve = ['developer_mode_enabled']; // Developer Mode beibehalten
      
      // LocalStorage bereinigen (außer protected keys)
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // SessionStorage komplett leeren
      sessionStorage.clear();

      // Log the action
      logInfo("Developer cleared app state (localStorage + sessionStorage)", 'DEBUG_UI');
      
      setShowClearModal(false);
      setConfirmText("");
      showSuccess("App-Status gelöscht. Seite wird neu geladen...");
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Failed to clear app state:', err);
      alert("Fehler beim Löschen des App-Status.");
    }
  };

  // NEU: Recovery Actions
  const handleFlushQueue = async () => {
    if (offlineQueue.getQueueSize() === 0) {
      showInfo("Keine ausstehenden Änderungen in der Warteschlange.");
      return;
    }

    try {
      const results = await offlineQueue.flushQueue();
      refreshRecoveryStats();
      logInfo(`Queue flushed manually: ${results.success} success, ${results.failed} failed`, 'DebugUI');
      showSuccess("Warteschlange synchronisiert.");
    } catch (err) {
      showError("Fehler beim Synchronisieren der Warteschlange.");
      logError(err, 'DebugUI');
    }
  };

  const handleClearSessionCache = () => {
    if (confirm("Session-Cache löschen? Deine Rezepte bleiben erhalten, aber Zwischenspeicher werden gelöscht.")) {
      const clearedCount = clearAllSessions();
      refreshRecoveryStats();
      showSuccess(`${clearedCount} Cache-Einträge gelöscht.`);
      logInfo(`Session cache cleared: ${clearedCount} entries`, 'DebugUI');
    }
  };

  // Filter logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  // Get errors only
  const errorLogs = logs.filter(log => log.level === LOG_LEVELS.ERROR);

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
                onClick={() => window.location.href = createPageUrl("Browse")}
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

          {/* ERRORS PANEL */}
          {errorLogs.length > 0 && (
            <Card className="rounded-2xl bg-red-50 border-red-200 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {errorLogs.length} {errorLogs.length === 1 ? 'Fehler gefunden' : 'Fehler gefunden'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {errorLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-900">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                            {log.context && ` • ${log.context}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {errorLogs.length > 5 && (
                  <p className="text-sm text-gray-600 mt-3">
                    ... und {errorLogs.length - 5} weitere Fehler
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* NEU: RECOVERY CENTER */}
          <Card className="rounded-2xl bg-white shadow-sm border border-gray-100 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" style={{ color: COLORS.ACCENT }} />
                Session & Recovery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Session Cache */}
                <div className="p-4 rounded-xl border" style={{ borderColor: COLORS.SILVER_LIGHT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${COLORS.ACCENT}20` }}
                    >
                      📦
                    </div>
                    <span className="font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                      Session Cache
                    </span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                    {recoveryStats.sessionCache.count}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                    Einträge ({recoveryStats.sessionCache.sizeKB} KB)
                  </div>
                </div>

                {/* Offline Queue */}
                <div className="p-4 rounded-xl border" style={{ borderColor: COLORS.SILVER_LIGHT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        recoveryStats.offlineQueue > 0 ? 'bg-amber-100' : 'bg-green-100'
                      }`}
                    >
                      {recoveryStats.offlineQueue > 0 ? '⚡' : '✅'}
                    </div>
                    <span className="font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                      Offline Queue
                    </span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: recoveryStats.offlineQueue > 0 ? '#F59E0B' : '#10B981' }}>
                    {recoveryStats.offlineQueue}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {recoveryStats.offlineQueue === 0 ? 'Keine ausstehenden Änderungen' : 'Ausstehende Änderungen'}
                  </div>
                </div>

                {/* Checkpoint Status */}
                <div className="p-4 rounded-xl border" style={{ borderColor: COLORS.SILVER_LIGHT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        recoveryStats.checkpoint ? 'bg-blue-100' : 'bg-gray-100'
                      }`}
                    >
                      💾
                    </div>
                    <span className="font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                      Import Checkpoint
                    </span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: recoveryStats.checkpoint ? '#3B82F6' : '#9CA3AF' }}>
                    {recoveryStats.checkpoint ? `${recoveryStats.checkpoint.ageMinutes}min` : 'Kein'}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {recoveryStats.checkpoint ? 'Checkpoint aktiv' : 'Kein gespeicherter Import'}
                  </div>
                </div>
              </div>

              {/* Recovery Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleFlushQueue}
                  variant="outline"
                  className="rounded-xl"
                  disabled={recoveryStats.offlineQueue === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Queue synchronisieren
                </Button>

                <Button
                  onClick={handleClearSessionCache}
                  variant="outline"
                  className="rounded-xl text-amber-600 border-amber-300 hover:bg-amber-50"
                  disabled={recoveryStats.sessionCache.count === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Session-Cache löschen
                </Button>

                <Button
                  onClick={refreshRecoveryStats}
                  variant="outline"
                  className="rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Status aktualisieren
                </Button>
              </div>
            </CardContent>
          </Card>

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

                  {/* SICHERHEITSKRITISCH: Clear App State */}
                  {isDevAllowed() && (
                    <Button
                      onClick={() => setShowClearModal(true)}
                      variant="outline"
                      className="rounded-xl text-red-700 border-red-400 hover:bg-red-50 font-semibold"
                      aria-label="App-Status löschen (nur localStorage)"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Clear App State
                    </Button>
                  )}
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

          {/* Clear App State Modal */}
          {showClearModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="max-w-md w-full rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <ShieldAlert className="w-6 h-6" />
                    App-Status löschen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">
                      ⚠️ WARNUNG
                    </p>
                    <p className="text-sm text-yellow-800">
                      Diese Aktion löscht:
                    </p>
                    <ul className="text-sm text-yellow-800 mt-2 space-y-1 ml-4">
                      <li>• Alle localStorage-Daten (außer Developer Mode)</li>
                      <li>• Alle sessionStorage-Daten</li>
                      <li>• Import-Checkpoints</li>
                      <li>• Cached Daten</li>
                    </ul>
                    <p className="text-xs text-yellow-700 mt-3 font-semibold">
                      ✅ Datenbank-Rezepte bleiben erhalten
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                      Tippe "DELETE" um fortzufahren:
                    </label>
                    <Input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="rounded-xl font-mono"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowClearModal(false);
                        setConfirmText("");
                      }}
                      className="flex-1 rounded-xl"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleClearAppState}
                      disabled={confirmText !== "DELETE"}
                      className="flex-1 text-white rounded-xl"
                      style={{ backgroundColor: confirmText === "DELETE" ? COLORS.ACCENT : '#ccc' }}
                    >
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
