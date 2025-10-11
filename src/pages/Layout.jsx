
import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChefHat, BookOpen, Plus, Settings, FolderHeart, Trash2, ImageIcon, ShoppingCart, Bug
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { initToast } from "@/components/ui/toastUtils";
import { AuthProvider } from "@/components/contexts/AuthContext";
import { AppProvider, useCategories } from "@/components/contexts/AppContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { COLORS } from "@/components/utils/constants";
import { registerGlobalErrorHandlers } from "@/components/utils/logging";
import { isDevelopment } from "@/components/utils/env";
import { offlineQueue } from "@/components/lib/http";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// GLOBAL ERROR HANDLERS & TOAST INIT
// ============================================
registerGlobalErrorHandlers();
initToast();

function NavList() {
  const location = useLocation();
  const { categories } = useCategories();

  const isActive = (url) =>
    new URL(url, window.location.origin).pathname === location.pathname;

  const mainNavigationItems = [
    { title: "Alle Rezepte", url: createPageUrl("Browse"), icon: BookOpen },
    { title: "Sammlungen", url: createPageUrl("Collections"), icon: FolderHeart },
    { title: "Einkaufsliste", url: createPageUrl("ShoppingList"), icon: ShoppingCart },
    { title: "Rezept importieren", url: createPageUrl("Import"), icon: Plus },
  ];

  const settingsItems = [
    { title: "Kategorien verwalten", url: createPageUrl("Categories"), icon: Settings },
    { title: "Zutatenbilder", url: createPageUrl("IngredientImages"), icon: ImageIcon },
    { title: "Papierkorb", url: createPageUrl("Trash"), icon: Trash2 },
  ];

  return (
    <SidebarContent className="bg-white">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5" style={{ color: COLORS.ACCENT }} />
          <div>
            <div className="font-semibold tracking-tight" style={{ color: COLORS.TEXT_PRIMARY }}>
              RecipeVault
            </div>
            <div className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
              Deine Rezeptsammlung
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarGroup className="border-t border-gray-100">
        <SidebarGroupContent className="overflow-y-auto h-[calc(100svh-72px)] px-2">
          <SidebarMenu className="py-2">
            {mainNavigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} className="rounded-lg">
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarSeparator />
          <SidebarGroupLabel className="px-2 pt-4 pb-1 text-xs uppercase tracking-wide"
            style={{ color: COLORS.TEXT_SECONDARY }}>
            Mahlzeiten
          </SidebarGroupLabel>
          <SidebarMenu className="py-1">
            {categories.meal.map((c) => {
              const url = `${createPageUrl("Browse")}?category=${encodeURIComponent(c.name)}`;
              return (
                <SidebarMenuItem key={`meal-${c.id}`}>
                  <SidebarMenuButton asChild isActive={isActive(url)} className="rounded-lg">
                    <Link to={url} className="flex items-center gap-2">
                      <span>{c.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <SidebarGroupLabel className="px-2 pt-4 pb-1 text-xs uppercase tracking-wide"
            style={{ color: COLORS.TEXT_SECONDARY }}>
            Gänge
          </SidebarGroupLabel>
          <SidebarMenu className="py-1">
            {categories.gang.map((c) => {
              const url = `${createPageUrl("Browse")}?category=${encodeURIComponent(c.name)}`;
              return (
                <SidebarMenuItem key={`gang-${c.id}`}>
                  <SidebarMenuButton asChild isActive={isActive(url)} className="rounded-lg">
                    <Link to={url} className="flex items-center gap-2">
                      <span>{c.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <SidebarSeparator />
          <SidebarMenu className="py-2">
            {settingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} className="rounded-lg">
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function LayoutContent() {
  const location = useLocation();
  const pageKey = location.pathname + location.search;

  return (
    <SidebarProvider className="min-h-svh">
      <div className="min-h-svh flex w-full" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        {/* Statische Sidebar */}
        <Sidebar side="left" className="bg-white">
          <NavList />
        </Sidebar>

        {/* Content Area mit Fade Transition */}
        <main className="flex-1 flex flex-col overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="flex-1"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Dev Debug Button */}
      {isDevelopment() && (
        <div className="fixed bottom-4 right-4 z-40">
          <Link
            to={createPageUrl("Debug")}
            className="px-3 py-2 text-white rounded-xl shadow-md text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: COLORS.ACCENT }}
            title="Debug Console"
          >
            <Bug className="w-4 h-4" />
            Debug
          </Link>
        </div>
      )}

      <Toaster />
    </SidebarProvider>
  );
}

export default function Layout() {
  // Wrap everything in providers
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ProtectedRoute>
            <LayoutContent />
          </ProtectedRoute>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
