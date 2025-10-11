import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, Archive,
  CheckCircle, Circle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { COLORS } from "@/components/utils/constants";
import { SUPERMARKET_CATEGORIES } from "@/components/utils/ingredientCategorizer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApp } from "@/components/contexts/AppContext";

export default function ShoppingListPage() {
  const navigate = useNavigate();
  
  const {
    shoppingLists: lists,
    isLoading,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList
  } = useApp();

  const [activeList, setActiveList] = useState(null);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    if (lists.length > 0 && !activeList) {
      setActiveList(lists[0]);
    }
  }, [lists, activeList]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    const newList = await createShoppingList({
      name: newListName.trim(),
      items: []
    });
    
    if (newList) {
      setActiveList(newList);
    }
    setShowNewListDialog(false);
    setNewListName("");
  };

  const handleToggleItem = async (itemIndex) => {
    if (!activeList) return;
    
    const updatedItems = [...activeList.items];
    updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;
    
    await updateShoppingList(activeList.id, {
      items: updatedItems
    });
    
    setActiveList({ ...activeList, items: updatedItems });
  };

  const handleDeleteItem = async (itemIndex) => {
    if (!activeList) return;
    
    const updatedItems = activeList.items.filter((_, idx) => idx !== itemIndex);
    
    await updateShoppingList(activeList.id, {
      items: updatedItems
    });
    
    setActiveList({ ...activeList, items: updatedItems });
  };

  const handleArchiveList = async () => {
    if (!activeList) return;
    
    if (confirm(`"${activeList.name}" archivieren?`)) {
      await updateShoppingList(activeList.id, {
        is_archived: true
      });
      
      const remainingLists = lists.filter(l => l.id !== activeList.id && !l.is_archived);
      setActiveList(remainingLists[0] || null);
    }
  };

  const handleClearChecked = async () => {
    if (!activeList) return;
    
    if (confirm("Alle abgehakten Einträge löschen?")) {
      const updatedItems = activeList.items.filter(item => !item.checked);
      
      await updateShoppingList(activeList.id, {
        items: updatedItems
      });
      
      setActiveList({ ...activeList, items: updatedItems });
    }
  };

  const groupedItems = useMemo(() => {
    if (!activeList || !activeList.items) return {};
    
    const grouped = {};
    
    activeList.items.forEach(item => {
      const category = item.category || 'sonstiges';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [activeList]);

  const progress = useMemo(() => {
    if (!activeList || activeList.items.length === 0) return 0;
    
    const checked = activeList.items.filter(item => item.checked).length;
    return Math.round((checked / activeList.items.length) * 100);
  }, [activeList]);

  const activeLists = useMemo(() => 
    lists.filter(l => !l.is_archived),
    [lists]
  );

  if (isLoading.shoppingLists) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        <div className="animate-pulse text-gray-600">Einkaufslisten werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Browse"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
                Einkaufsliste
              </h1>
              <p className="text-lg mt-1" style={{ color: COLORS.TEXT_SECONDARY }}>
                {activeLists.length} {activeLists.length === 1 ? 'Liste' : 'Listen'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewListDialog(true)}
            className="text-white font-medium px-6 py-3 rounded-xl"
            style={{ backgroundColor: COLORS.ACCENT }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Neue Liste
          </Button>
        </div>

        {activeLists.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold mb-2 text-gray-800">
                Noch keine Einkaufslisten
              </h3>
              <p className="text-gray-600 mb-6">
                Erstelle deine erste Einkaufsliste, um loszulegen!
              </p>
              <Button
                onClick={() => setShowNewListDialog(true)}
                className="text-white rounded-xl"
                style={{ backgroundColor: COLORS.ACCENT }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Erste Liste erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Meine Listen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeLists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => setActiveList(list)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        activeList?.id === list.id
                          ? 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 truncate">{list.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {list.items?.length || 0}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              {activeList ? (
                <div className="space-y-6">
                  <Card className="rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">{activeList.name}</h2>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearChecked}
                            className="rounded-xl"
                            disabled={!activeList.items || activeList.items.length === 0 || !activeList.items.some(item => item.checked)}
                          >
                            Abgehakte löschen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleArchiveList}
                            className="rounded-xl"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archivieren
                          </Button>
                        </div>
                      </div>

                      {activeList.items && activeList.items.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Fortschritt: {progress}%
                            </span>
                            <span className="text-sm text-gray-600">
                              {activeList.items.filter(i => i.checked).length} / {activeList.items.length} erledigt
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: COLORS.ACCENT,
                                width: `${progress}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!activeList.items || activeList.items.length === 0 ? (
                    <Card className="rounded-2xl">
                      <CardContent className="p-12 text-center">
                        <Circle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">
                          Diese Liste ist noch leer. Füge Zutaten aus deinen Rezepten hinzu!
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedItems).map(([category, items]) => {
                        const categoryInfo = SUPERMARKET_CATEGORIES[category] || SUPERMARKET_CATEGORIES.sonstiges;
                        
                        return (
                          <Card key={category} className="rounded-2xl">
                            <CardHeader className="pb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                                  style={{ backgroundColor: `${categoryInfo.color}20` }}
                                >
                                  {categoryInfo.icon}
                                </div>
                                <CardTitle className="text-lg">{categoryInfo.name}</CardTitle>
                                <Badge variant="outline">{items.length}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {items.map((item, idx) => {
                                const itemIndex = activeList.items.indexOf(item);
                                
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                      item.checked ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <Checkbox
                                        checked={item.checked}
                                        onCheckedChange={() => handleToggleItem(itemIndex)}
                                      />
                                      <div className="flex-1">
                                        <p className={`font-medium text-gray-800 ${item.checked ? 'line-through' : ''}`}>
                                          {item.ingredient_name}
                                        </p>
                                        {item.amount && item.unit && (
                                          <p className="text-sm text-gray-600">
                                            {item.amount} {item.unit}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteItem(itemIndex)}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Card className="rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                      Wähle eine Liste aus
                    </h3>
                    <p className="text-gray-600">
                      Wähle eine Liste aus der Seitenleiste, um sie anzuzeigen und zu bearbeiten.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Einkaufsliste erstellen</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Name der Liste (z.B. Wocheneinkauf)"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
                autoFocus
                className="rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewListDialog(false)} className="rounded-xl">
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="text-white rounded-xl"
                style={{ backgroundColor: COLORS.ACCENT }}
              >
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}