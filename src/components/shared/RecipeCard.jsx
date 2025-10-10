import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Draggable } from "@hello-pangea/dnd";

export default function RecipeCard({ recipe, index, compact = false, accentColor = "#FF5722" }) {
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  const CardContent = () => (
    <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col">
      {/* IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <ChefHat className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        
        {/* HOVER OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <div className="flex items-center gap-3 text-xs">
              {totalTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{totalTime} Min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{recipe.servings} Port.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TEXT SECTION */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2" style={{ color: "#1A1A1A" }}>
          {recipe.title}
        </h3>
        
        {!compact && recipe.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {recipe.description}
          </p>
        )}
        
        {/* TAGS */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {recipe.meal_type && (
            <Badge
              className="text-xs px-2 py-0.5 capitalize"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              {recipe.meal_type}
            </Badge>
          )}
          {recipe.gang && (
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5 capitalize"
            >
              {recipe.gang}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Draggable draggableId={recipe.id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.7 : 1,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <Link
            to={`${createPageUrl("RecipeDetail")}?id=${recipe.id}`}
            className="block h-full"
            onClick={(e) => {
              if (snapshot.isDragging) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <CardContent />
          </Link>
        </motion.div>
      )}
    </Draggable>
  );
}