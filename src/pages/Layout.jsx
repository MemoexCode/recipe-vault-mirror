
import React from "react";
import {
  ChefHat, BookOpen, Plus, Settings, FolderHeart, Trash2, ImageIcon, ShoppingCart, Bug
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { initToast } from "@/components/ui/toastUtils";
import { COLORS } from "@/components/utils/constants";
import { registerGlobalErrorHandlers } from "@/components/utils/logging";
import { isDevelopment } from "@/components/utils/env";
import { AppProvider } from "@/components/contexts/AppContext";
import { AuthProvider } from "@/components/contexts/AuthContext";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { createPageUrl } from "@/utils";

// ============================================
// GLOBAL ERROR HANDLERS & TOAST INIT
// ============================================
registerGlobalErrorHandlers();
initToast();

// Simplified NavList without router hooks
function NavList() {
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
            <div className="font-semibold tracking-tight text-[15px]" style={{ color: COLORS.TEXT_PRIMARY }}>
              RecipeVault
            </div>
            <div className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
              Deine Rezeptsammlung
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarGroup className="border-t border-gray-100">
        <SidebarGroupContent className="overflow-y-auto h-[calc(100vh-72px)] px-2">
          <SidebarMenu className="py-2">
            {mainNavigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className="rounded-lg">
                  <a href={item.url} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarSeparator />
          
          <SidebarMenu className="py-2">
            {settingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className="rounded-lg">
                  <a href={item.url} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ProtectedRoute>
            <SidebarProvider className="min-h-screen">
              <div className="min-h-screen flex w-full" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
                {/* Statische Sidebar */}
                <Sidebar side="left" className="bg-white border-r border-gray-100">
                  <NavList />
                </Sidebar>

                {/* Content Area - Base44 injects the active page here */}
                <main className="flex-1 min-w-0 overflow-x-hidden">
                  <div className="min-h-screen">
                    {children}
                  </div>
                </main>
              </div>

              {/* Dev Debug Button */}
              {isDevelopment() && (
                <div className="fixed bottom-4 right-4 z-40">
                  <a
                    href={createPageUrl("Debug")}
                    className="px-3 py-2 text-white rounded-xl shadow-md text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: COLORS.ACCENT }}
                    title="Debug Console"
                  >
                    <Bug className="w-4 h-4" />
                    Debug
                  </a>
                </div>
              )}

              <Toaster />
            </SidebarProvider>
          </ProtectedRoute>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
