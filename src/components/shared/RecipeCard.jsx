
import React, { memo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, Users, Check } from "lucide-react"; // Added Check import
import { motion } from "framer-motion";
import { Draggable } from "@hello-pangea/dnd";

// ============================================
// CUSTOM COMPARISON FUNCTION FOR MEMOIZATION
// ============================================
const arePropsEqual = (prevProps, nextProps) => {
  // Compare recipe identity and update timestamp
  const recipeEqual = 
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.updated_date === nextProps.recipe.updated_date;
  
  // Compare other props that affect rendering
  const indexEqual = prevProps.index === nextProps.index;
  const compactEqual = prevProps.compact === nextProps.compact;
  const accentColorEqual = prevProps.accentColor === nextProps.accentColor;
  
  // Return true if all props are equal (skip re-render)
  return recipeEqual && indexEqual && compactEqual && accentColorEqual;
};

// ============================================
// RECIPE CARD COMPONENT
// ============================================

/**
 * RecipeCard Component
 * Displays a recipe card with image, title, description, and metadata
 * 
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe object (REQUIRED)
 * @param {string} props.recipe.id - Recipe ID (REQUIRED)
 * @param {string} props.recipe.title - Recipe title (REQUIRED)
 * @param {string} [props.recipe.description] - Recipe description
 * @param {string} [props.recipe.image_url] - Recipe image URL
 * @param {number} [props.recipe.prep_time_minutes] - Preparation time in minutes
 * @param {number} [props.recipe.cook_time_minutes] - Cooking time in minutes
 * @param {number} [props.recipe.servings] - Number of servings
 * @param {string} [props.recipe.meal_type] - Meal type (breakfast, lunch, dinner, snacks)
 * @param {string} [props.recipe.gang] - Course type (appetizer, main, dessert, etc.)
 * @param {string} [props.recipe.updated_date] - Last update timestamp
 * @param {number} props.index - Index in the list for drag-and-drop (REQUIRED)
 * @param {boolean} [props.compact=false] - Whether to use compact view
 * @param {string} [props.accentColor="#FF5722"] - Accent color for badges
 */
function RecipeCard({ recipe, index, compact = false, accentColor = "#FF5722" }) {
  const [justSaved, setJustSaved] = React.useState(false);
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  // Trigger success animation when recipe is updated
  React.useEffect(() => {
    if (recipe.updated_date) {
      const updatedTime = new Date(recipe.updated_date).getTime();
      const now = Date.now();
      
      // Wenn Update innerhalb der letzten 2 Sekunden → Animation
      if (now - updatedTime < 2000) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 600);
      }
    }
  }, [recipe.updated_date]);

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
        
        {/* SUCCESS INDICATOR */}
        {justSaved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
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
          animate={{ 
            opacity: 1, 
            scale: justSaved ? [1, 1.05, 1] : 1 
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: justSaved ? 0.15 : 0.2 }}
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

// ============================================
// EXPORT WITH MEMOIZATION
// ============================================
export default memo(RecipeCard, arePropsEqual);
