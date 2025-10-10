
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "./constants"; // Added CATEGORY_ICONS
import ImageGrid from "./ImageGrid";

export default function GroupedImageView({ 
  groupedImages, 
  imageUsageMap,
  onDelete, 
  onEditTags, 
  onRegenerateImage,
  newestImageId // Added newestImageId prop
}) {
  const [expandedGroups, setExpandedGroups] = useState(
    Object.keys(groupedImages).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {})
  );

  const toggleGroup = (category) => {
    setExpandedGroups(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedImages).map(([category, categoryImages]) => {
        if (categoryImages.length === 0) return null;
        
        const isExpanded = expandedGroups[category];
        
        return (
          <Card key={category} className="rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* GROUP HEADER */}
              <button
                onClick={() => toggleGroup(category)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{CATEGORY_ICONS[category] || '📦'}</span> {/* Changed icon logic */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 text-left">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {categoryImages.length} {categoryImages.length === 1 ? 'Bild' : 'Bilder'}
                    </p>
                  </div>
                </div>
                
                {isExpanded ? (
                  <ChevronUp className="w-6 h-6 text-gray-400" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-400" />
                )}
              </button>

              {/* GROUP CONTENT */}
              {isExpanded && (
                <div className="p-6 pt-0">
                  <ImageGrid 
                    images={categoryImages}
                    imageUsageMap={imageUsageMap}
                    onDelete={onDelete}
                    onEditTags={onEditTags}
                    onRegenerateImage={onRegenerateImage}
                    newestImageId={newestImageId} // Passed newestImageId to ImageGrid
                    compact
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
