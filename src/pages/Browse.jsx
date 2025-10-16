import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import RecipeCard from '@/components/shared/RecipeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Loader } from 'lucide-react'; // Using a simple loader icon as placeholder for <Loader />

export default function Browse() {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setIsLoading(true);
        const recipeData = await base44.entities.Recipe.list('-created_date');
        setRecipes(recipeData || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
        setError("Fehler beim Laden der Rezepte. Bitte versuchen Sie es später erneut.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    if (!searchTerm) return recipes;

    return recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [recipes, searchTerm]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader className="w-12 h-12 animate-spin text-orange-500" />
        </div>
      );
    }

    if (error) {
      return <p className="text-red-500 text-center">{error}</p>;
    }

    if (filteredRecipes.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes.map((recipe, index) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={index} />
          ))}
        </div>
      );
    }
    
    if (searchTerm) {
        return <p className="text-gray-500 col-span-full text-center">Keine Rezepte gefunden, die Ihrer Suche entsprechen.</p>;
    }

    return <p className="text-gray-500 text-center">Noch keine Rezepte vorhanden. Fügen Sie Ihr erstes hinzu!</p>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Alle Rezepte</h1>
        <p className="mt-2 text-lg text-gray-600">
          Durchsuchen Sie Ihre Sammlung oder fügen Sie neue Rezepte hinzu.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Suchen nach Name oder Tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}