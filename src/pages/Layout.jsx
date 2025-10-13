
import React from "react";
import { Link, useLocation } from "react-router-dom";
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
import { COLORS } from "@/components/utils/constants";
import { registerGlobalErrorHandlers } from "@/components/utils/logging";
import { isDevelopment } from "@/components/utils/env";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// GLOBAL ERROR HANDLERS & TOAST INIT
// ============================================
registerGlobalErrorHandlers();
initToast();

// Simplified NavList without useCategories to avoid provider issues
function NavList() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname === `/${path}`;
  };

  const mainNavigationItems = [
    { title: "Alle Rezepte", path: "/", icon: BookOpen },
    { title: "Sammlungen", path: "/collections", icon: FolderHeart },
    { title: "Einkaufsliste", path: "/shoppinglist", icon: ShoppingCart },
    { title: "Rezept importieren", path: "/import", icon: Plus },
  ];

  const settingsItems = [
    { title: "Kategorien verwalten", path: "/categories", icon: Settings },
    { title: "Zutatenbilder", path: "/ingredientimages", icon: ImageIcon },
    { title: "Papierkorb", path: "/trash", icon: Trash2 },
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
                <SidebarMenuButton asChild isActive={isActive(item.path)} className="rounded-lg">
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarSeparator />
          
          <SidebarMenu className="py-2">
            {settingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.path)} className="rounded-lg">
                  <Link to={item.path} className="flex items-center gap-2">
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const pageKey = location.pathname + location.search;

  return (
    <SidebarProvider className="min-h-screen">
      <div className="min-h-screen flex w-full" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
        {/* Statische Sidebar */}
        <Sidebar side="left" className="bg-white border-r border-gray-100">
          <NavList />
        </Sidebar>

        {/* Content Area */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageKey}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="min-h-screen"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Dev Debug Button */}
      {isDevelopment() && (
        <div className="fixed bottom-4 right-4 z-40">
          <Link
            to="/debug"
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
