import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Sparkles, Wrench, CheckCircle2, Palette, 
  Zap, Trash2, Search, Calendar, Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChangelogEntry } from "@/api/entities";
import { motion } from "framer-motion";
import { COLORS } from "@/components/utils/constants";
import { User } from "@/api/entities";

// ============================================
// CHANGE TYPE CONFIGURATION
// NUR UM BUILD ZU TRIGGERN KOMMENTIERT!
// ============================================
const CHANGE_TYPES = {
  new: {
    label: "Neu",
    icon: Sparkles,
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.1)"
  },
  improved: {
    label: "Verbessert",
    icon: CheckCircle2,
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)"
  },
  fixed: {
    label: "Behoben",
    icon: Wrench,
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)"
  },
  design: {
    label: "Design",
    icon: Palette,
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.1)"
  },
  performance: {
    label: "Performance",
    icon: Zap,
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)"
  },
  removed: {
    label: "Entfernt",
    icon: Trash2,
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.1)"
  }
};

export default function Changelog() {
  const navigate = useNavigate();
  
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadChangelog();
    checkAdminStatus();
  }, []);

  const loadChangelog = async () => {
    try {
      const data = await ChangelogEntry.list("-date");
      setEntries(data);
    } catch (err) {
      console.error("Error loading changelog:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const user = await User.me();
      setIsAdmin(user.role === "admin");
    } catch (err) {
      setIsAdmin(false);
    }
  };

  // ============================================
  // FILTER LOGIC
  // ============================================
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      searchQuery === "" ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.changes.some(c => c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = 
      selectedType === "all" ||
      entry.changes.some(c => c.type === selectedType);
    
    return matchesSearch && matchesType;
  });

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    totalVersions: entries.length,
    totalChanges: entries.reduce((sum, e) => sum + e.changes.length, 0),
    majorReleases: entries.filter(e => e.is_major).length
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderChangeItem = (change, index) => {
    const config = CHANGE_TYPES[change.type];
    const Icon = config.icon;
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-start gap-3 py-2"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="text-xs font-semibold"
              style={{ 
                borderColor: config.color,
                color: config.color
              }}
            >
              {config.label}
            </Badge>
            {change.category && (
              <Badge variant="secondary" className="text-xs">
                {change.category}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {change.description}
          </p>
        </div>
      </motion.div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
              Änderungsprotokoll
            </h1>
            <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
              Alle Verbesserungen und Änderungen im Überblick
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => navigate(createPageUrl("ChangelogAdmin"))}
              variant="outline"
              size="icon"
              className="rounded-xl"
              title="Changelog-Administration"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: COLORS.ACCENT }}>
                {stats.totalVersions}
              </div>
              <p className="text-sm text-gray-600">Versionen</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: "#3B82F6" }}>
                {stats.totalChanges}
              </div>
              <p className="text-sm text-gray-600">Änderungen</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: "#10B981" }}>
                {stats.majorReleases}
              </div>
              <p className="text-sm text-gray-600">Major Releases</p>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <Card className="rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Änderungen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700"
              >
                <option value="all">Alle Typen</option>
                {Object.entries(CHANGE_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* CHANGELOG ENTRIES */}
        {isLoading ? (
          <div className="space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                Keine Einträge gefunden
              </h3>
              <p style={{ color: COLORS.TEXT_SECONDARY }}>
                {entries.length === 0 ? "Noch keine Changelog-Einträge vorhanden" : "Passe deine Filter an"}
              </p>
              {isAdmin && entries.length === 0 && (
                <Button
                  onClick={() => navigate(createPageUrl("ChangelogAdmin"))}
                  className="mt-6 rounded-xl text-white"
                  style={{ backgroundColor: COLORS.ACCENT }}
                >
                  Changelog initialisieren
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredEntries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="rounded-2xl overflow-hidden">
                  {/* VERSION HEADER */}
                  <div 
                    className="p-6 border-b"
                    style={{ 
                      backgroundColor: entry.is_major ? "rgba(255, 87, 34, 0.05)" : "white",
                      borderColor: COLORS.SILVER_LIGHT
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                          v{entry.version}
                        </h2>
                        {entry.is_major && (
                          <Badge 
                            className="text-xs font-semibold"
                            style={{ backgroundColor: COLORS.ACCENT, color: "white" }}
                          >
                            Major Release
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.date).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p className="text-gray-600">{entry.description}</p>
                    )}
                  </div>

                  {/* CHANGES LIST */}
                  <CardContent className="p-6">
                    <div className="space-y-1">
                      {entry.changes.map((change, changeIdx) => 
                        renderChangeItem(change, changeIdx)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}