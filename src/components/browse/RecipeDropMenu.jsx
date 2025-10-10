import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Trash2, FolderHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COLORS } from "@/components/utils/constants";

export default function RecipeDropMenu({ collections, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="space-y-3 p-4 bg-white rounded-2xl shadow-2xl border-2" style={{ borderColor: COLORS.ACCENT, minWidth: "280px" }}>
      <div className="text-sm font-semibold text-gray-600 mb-3 text-center">
        📂 Ziehe das Rezept hier hin
      </div>

      {/* PAPIERKORB */}
      <Droppable droppableId="trash">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <Card 
              className={`rounded-xl transition-all duration-200 cursor-pointer ${
                snapshot.isDraggingOver 
                  ? 'border-2 border-red-500 bg-red-50 scale-105' 
                  : 'border-2 border-gray-200 hover:border-red-300'
              }`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">Papierkorb</p>
                  <p className="text-xs text-gray-500">Rezept löschen</p>
                </div>
              </CardContent>
            </Card>
            <div style={{ display: 'none' }}>{provided.placeholder}</div>
          </div>
        )}
      </Droppable>

      {/* SAMMLUNGEN */}
      {collections && collections.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 text-center uppercase tracking-wider">
            Sammlungen
          </div>
          {collections.map((collection) => (
            <Droppable key={collection.id} droppableId={`collection-${collection.id}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <Card 
                    className={`rounded-xl transition-all duration-200 cursor-pointer ${
                      snapshot.isDraggingOver 
                        ? 'border-2 scale-105' 
                        : 'border-2 border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: snapshot.isDraggingOver ? collection.color || COLORS.ACCENT : undefined,
                      backgroundColor: snapshot.isDraggingOver ? `${collection.color || COLORS.ACCENT}10` : undefined
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${collection.color || COLORS.ACCENT}20` }}
                      >
                        <FolderHeart 
                          className="w-5 h-5" 
                          style={{ color: collection.color || COLORS.ACCENT }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{collection.name}</p>
                        <p className="text-xs text-gray-500">Sammlung</p>
                      </div>
                    </CardContent>
                  </Card>
                  <div style={{ display: 'none' }}>{provided.placeholder}</div>
                </div>
              )}
            </Droppable>
          ))}
        </>
      )}
    </div>
  );
}