
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { http } from "@/components/lib/http";
import { COLORS } from "@/components/utils/constants";
import { useApp } from "@/components/contexts/AppContext";

export default function ShoppingListPage() {
  
  const {
    shoppingLists: lists,
    isLoading,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList, // Added deleteShoppingList
    loadShoppingLists
  } = useApp();

  const [activeList, setActiveList] = useState(null);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  // Debounced update für Item-Changes
  const [updateTimeout, setUpdateTimeout] = useState(null);

  // Lazy load nur wenn auf dieser Page
  useEffect(() => {
    if (lists.length === 0 && !isLoading.shoppingLists) {
      loadShoppingLists();
    }
  }, [lists.length, isLoading.shoppingLists, loadShoppingLists]);

  // Set active list wenn verfügbar
  useEffect(() => {
    if (lists.length > 0 && !activeList) {
      setActiveList(lists[0]);
    }
  }, [lists, activeList]);

  const debouncedUpdate = (updatedItems) => {
    // Clear previous timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      if (activeList) {
        await updateShoppingList(activeList.id, {
          items: updatedItems
        });
      }
    }, 300); // 300ms debounce
    
    setUpdateTimeout(timeout);
  };

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    const created = await createShoppingList({ name, items: [] });
    setActiveList(created);
    setShowNewListDialog(false);
    setNewListName("");
  };

  const handleToggleItem = (itemIndex) => {
    if (!activeList) return;
    
    const updatedItems = [...activeList.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], checked: !updatedItems[itemIndex].checked };
    
    // Optimistic update
    setActiveList({ ...activeList, items: updatedItems });
    
    // Debounced persist
    debouncedUpdate(updatedItems);
  };

  const handleDeleteItem = (itemIndex) => {
    if (!activeList) return;
    
    const updatedItems = activeList.items.filter((_, idx) => idx !== itemIndex);
    
    // Optimistic update
    setActiveList({ ...activeList, items: updatedItems });
    
    // Debounced persist
    debouncedUpdate(updatedItems);
  };

  const items = activeList?.items ?? [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => window.location.href = createPageUrl("Browse")} 
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>
          Einkaufsliste
        </h1>
      </div>

      {isLoading.shoppingLists ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aktive Liste</CardTitle>
            <div className="flex gap-2">
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Neue Liste…"
                className="h-9 rounded-lg"
              />
              <Button onClick={handleCreateList} className="rounded-lg">Neu</Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>
                Noch keine Einträge.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="bg-white rounded-xl px-3 py-2 flex items-center gap-3 border">
                    <button onClick={() => handleToggleItem(i)} className="shrink-0">
                      {it.checked ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-400" />}
                    </button>
                    <span className={`flex-1 ${it.checked ? "line-through text-gray-400" : ""}`}>
                      {it.ingredient_name || it.name}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg"
                      onClick={() => handleDeleteItem(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
