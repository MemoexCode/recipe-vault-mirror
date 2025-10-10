import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, TrendingDown, AlertCircle, Tag } from "lucide-react";

export default function ImageStatsPanel({ 
  totalImages, 
  unusedImages, 
  missingImages, 
  imagesWithoutTags 
}) {
  const stats = [
    {
      label: "Gesamt",
      value: totalImages,
      icon: ImageIcon,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)"
    },
    {
      label: "Ungenutzt",
      value: unusedImages,
      icon: TrendingDown,
      color: "#6B7280",
      bgColor: "rgba(107, 114, 128, 0.1)"
    },
    {
      label: "Fehlen in Rezepten",
      value: missingImages,
      icon: AlertCircle,
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)"
    },
    {
      label: "Ohne Tags",
      value: imagesWithoutTags,
      icon: Tag,
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.1)"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <span 
                className="text-3xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
            </div>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}