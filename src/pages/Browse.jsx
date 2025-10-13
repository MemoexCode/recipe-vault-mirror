import React, { useState, useMemo } from 'react';
import { useApp } from '@/components/contexts/AppContext';
import { RecipeCard } from '@/components/shared/RecipeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function Browse() {
  const { activeRecipes: recipes, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    if (!searchTerm) return recipes;

    return recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [recipes, searchTerm]);

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

      {isLoading.recipes ? (
        <p className="text-gray-500">Rezepte werden geladen...</p>
      ) : recipes && recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          ) : (
            <p className="text-gray-500 col-span-full">Keine Rezepte gefunden, die Ihrer Suche entsprechen.</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Noch keine Rezepte vorhanden.</p>
      )}
    </div>
  );
}