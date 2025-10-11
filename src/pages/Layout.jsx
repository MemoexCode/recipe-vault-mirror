
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { initToast, useToast } from "@/components/ui/toastUtils";
import { AuthProvider } from "@/components/contexts/AuthContext";
import { AppProvider, useCategories } from "@/components/contexts/AppContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { getIconComponent } from "@/components/utils/iconMapper";
import { COLORS } from "@/components/utils/constants";
import { registerGlobalErrorHandlers } from "@/components/utils/logging";
import { isDevelopment, toggleDeveloperMode, isManualDevModeEnabled } from "@/components/utils/env";
import { offlineQueue } from "@/components/lib/http";
import { motion, AnimatePresence } from "framer-motion";


// ============================================
// SIDEBAR CONTENT COMPONENT WITH GHOST MARKER
// ============================================
function SidebarContentComponent() {
  const location = useLocation();
  const { categories, recipeCounts, isLoading } = useCategories();
  
  // Ghost Marker State
  const [activeItemRect, setActiveItemRect] = useState({ top: 0, height: 48 });
  const menuRef = useRef(null);
  const itemRefs = useRef({});

  // ============================================
  // NAVIGATION CONFIGURATION
  // ============================================
  const mainNavigationItems = [
    { title: "Alle Rezepte", url: createPageUrl("Browse"), icon: BookOpen },
    { title: "Sammlungen", url: createPageUrl("Collections"), icon: FolderHeart },
    { title: "Einkaufsliste", url: createPageUrl("ShoppingList"), icon: ShoppingCart },
    { title: "Rezept importieren", url: createPageUrl("Import"), icon: Plus }
  ];

  const settingsItems = [
    { title: "Kategorien verwalten", url: createPageUrl("Categories"), icon: Settings },
    { title: "Zutatenbilder", url: createPageUrl("IngredientImages"), icon: ImageIcon },
    { title: "Papierkorb", url: createPageUrl("Trash"), icon: Trash2 }
  ];

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const isCurrentPath = (url) => {
    const currentBase = location.pathname;
    const targetBase = new URL(url, window.location.origin).pathname;
    return currentBase === targetBase;
  };

  // ============================================
  // GHOST MARKER POSITION TRACKING
  // ============================================
  useEffect(() => {
    // Finde aktives Item und berechne Position
    const updateGhostPosition = () => {
      if (!menuRef.current) return;

      // Durchsuche alle Items und finde das aktive
      let activeElement = null;
      let activeKey = null;

      // Check main navigation
      for (const item of mainNavigationItems) {
        if (isCurrentPath(item.url)) {
          activeKey = `main-${item.title}`;
          activeElement = itemRefs.current[activeKey];
          break;
        }
      }

      // Check settings
      if (!activeElement) {
        for (const item of settingsItems) {
          if (isCurrentPath(item.url)) {
            activeKey = `settings-${item.title}`;
            activeElement = itemRefs.current[activeKey];
            break;
          }
        }
      }

      // Check categories
      if (!activeElement && !isLoading) {
        const allCategories = [
          ...categories.meal.map(c => ({ ...c, type: 'meal' })),
          ...categories.gang.map(c => ({ ...c, type: 'gang' }))
        ];

        for (const category of allCategories) {
          const categoryUrl = `${createPageUrl("Browse")}?category=${category.name}`;
          const isActive = location.pathname === createPageUrl("Browse").replace('//', '/') &&
                          location.search.includes(`category=${category.name}`);
          
          if (isActive) {
            activeKey = `category-${category.type}-${category.name}`;
            activeElement = itemRefs.current[activeKey];
            break;
          }
        }
      }

      if (activeElement) {
        const menuRect = menuRef.current.getBoundingClientRect();
        const itemRect = activeElement.getBoundingClientRect();
        
        setActiveItemRect({
          top: itemRect.top - menuRect.top,
          height: itemRect.height
        });
      }
    };

    // Debounce für Performance
    const timeoutId = setTimeout(updateGhostPosition, 50);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, categories, isLoading]);

  const CategoryList = ({ categoryList, type }) => (
    <SidebarMenu>
      {categoryList.map((category) => {
        const count = recipeCounts[type][category.name] || 0;
        const categoryUrl = `${createPageUrl("Browse")}?category=${category.name}`;
        const isActive = location.pathname === createPageUrl("Browse").replace('//', '/') &&
                        location.search.includes(`category=${category.name}`);
        const IconComponent = getIconComponent(category.icon);
        const itemKey = `category-${type}-${category.name}`;

        return (
          <SidebarMenuItem key={category.id}>
            <SidebarMenuButton
              asChild
              className={`hover:bg-opacity-10 transition-all duration-200 rounded-xl mb-1 relative ${
                isActive ? 'text-white' : ''
              }`}
              style={isActive ? {
                color: "white"
              } : {
                color: COLORS.TEXT_PRIMARY
              }}
            >
              <Link
                to={categoryUrl}
                ref={(el) => {
                  if (el) itemRefs.current[itemKey] = el;
                }}
                className="flex items-center justify-between px-4 py-2.5 z-10 relative"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium capitalize">{category.name}</span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : `${COLORS.ACCENT}20`,
                    color: isActive ? "white" : COLORS.ACCENT
                  }}
                >
                  {count}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <Sidebar className="border-r" style={{ backgroundColor: COLORS.WHITE, borderColor: COLORS.SILVER_LIGHT }}>
      {/* HEADER */}
      <SidebarHeader className="border-b p-6" style={{ borderColor: COLORS.SILVER_LIGHT }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.ACCENT }}>
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-xl" style={{ color: COLORS.TEXT_PRIMARY }}>RecipeVault</h2>
            <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>Deine Rezeptsammlung</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3 relative overflow-hidden" ref={menuRef}>
        {/* GHOST MARKER - ANIMATED BACKGROUND */}
        <motion.div
          className="absolute left-3 right-3 rounded-xl pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(255,87,34,0.2), rgba(255,87,34,0.35))",
            zIndex: 0
          }}
          animate={{
            top: activeItemRect.top,
            height: activeItemRect.height
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
        />

        {/* MAIN NAVIGATION */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigationItems.map((item) => {
                const isActive = isCurrentPath(item.url);
                const itemKey = `main-${item.title}`;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-opacity-10 hover:shadow-md transition-all duration-200 rounded-xl mb-1 relative ${
                        isActive ? 'text-white' : ''
                      }`}
                      style={isActive ? {
                        color: "white"
                      } : {
                        color: COLORS.TEXT_PRIMARY
                      }}
                    >
                      <Link
                        to={item.url}
                        ref={(el) => {
                          if (el) itemRefs.current[itemKey] = el;
                        }}
                        className="flex items-center gap-3 px-4 py-3 z-10 relative"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CATEGORIES */}
        {!isLoading && (
          <>
            <SidebarSeparator className="my-2" style={{ backgroundColor: COLORS.SILVER_LIGHT }} />

            {/* MAHLZEITEN */}
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase" style={{ color: COLORS.TEXT_SECONDARY }}>
                Mahlzeiten
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <CategoryList categoryList={categories.meal} type="meal" />
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2" style={{ backgroundColor: COLORS.SILVER_LIGHT }} />

            {/* GÄNGE */}
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase" style={{ color: COLORS.TEXT_SECONDARY }}>
                Gänge
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <CategoryList categoryList={categories.gang} type="gang" />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-2" style={{ backgroundColor: COLORS.SILVER_LIGHT }} />

        {/* SETTINGS */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = isCurrentPath(item.url);
                const itemKey = `settings-${item.title}`;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-opacity-10 hover:shadow-md transition-all duration-200 rounded-xl mb-1 relative ${
                        isActive ? 'text-white' : ''
                      }`}
                      style={isActive ? {
                        color: "white"
                      } : {
                        color: COLORS.TEXT_PRIMARY
                      }}
                    >
                      <Link
                        to={item.url}
                        ref={(el) => {
                          if (el) itemRefs.current[itemKey] = el;
                        }}
                        className="flex items-center gap-3 px-4 py-3 z-10 relative"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CHANGELOG LINK */}
        <div className="mt-auto pt-4 border-t" style={{ borderColor: COLORS.SILVER_LIGHT }}>
          <Link
            to={createPageUrl("Changelog")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700 block">Änderungsprotokoll</span>
              <span className="text-xs text-gray-500 block">Was ist neu?</span>
            </div>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// ============================================
// MAIN LAYOUT COMPONENT
// ============================================
export default function Layout({ children, currentPageName }) {
  const { toast } = useToast();

  // Offline Queue Status
  const [queueSize, setQueueSize] = React.useState(0);

  // Initialisiere Toast-System
  React.useEffect(() => {
    initToast(toast);
  }, [toast]);

  // Registriere globale Error-Handler beim Mount
  React.useEffect(() => {
    registerGlobalErrorHandlers();
  }, []);

  // Registriere Queue Listener
  React.useEffect(() => {
    const handleQueueChange = (size) => {
      setQueueSize(size);
    };

    offlineQueue.addListener(handleQueueChange);
    setQueueSize(offlineQueue.getQueueSize());

    return () => {
      offlineQueue.removeListener(handleQueueChange);
    };
  }, []);

  const devModeActive = isManualDevModeEnabled();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <AppProvider>
            <SidebarProvider>
              <style>{`
                :root {
                  --primary-black: ${COLORS.PRIMARY};
                  --pure-white: ${COLORS.WHITE};
                  --silver: ${COLORS.SILVER};
                  --silver-light: ${COLORS.SILVER_LIGHT};
                  --silver-lighter: ${COLORS.SILVER_LIGHTER};
                  --accent-orange: ${COLORS.ACCENT};
                  --text-primary: ${COLORS.TEXT_PRIMARY};
                  --text-secondary: ${COLORS.TEXT_SECONDARY};
                }

                body {
                  overflow-x: hidden;
                  background-color: var(--silver-lighter);
                }

                * {
                  box-sizing: border-box;
                }
              `}</style>
              <div className="min-h-screen flex w-full" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
                {/* SIDEBAR - STATIC, NO ANIMATION */}
                <SidebarContentComponent />
                
                {/* MAIN CONTENT AREA - ANIMATED */}
                <main className="flex-1 flex flex-col overflow-x-hidden">
                  <div className="flex-1">
                    {/* ISOLATED CONTENT TRANSITION - SIDEBAR REMAINS STATIC */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={currentPageName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ 
                          duration: 0.25, 
                          ease: "easeInOut" 
                        }}
                        className="h-full"
                      >
                        {children}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </main>

                {/* DEVELOPER BUTTONS (BOTTOM-RIGHT) */}
                <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                  {/* OFFLINE QUEUE INDICATOR */}
                  <AnimatePresence>
                    {queueSize > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 py-2 text-white rounded-xl shadow-lg text-sm font-medium flex items-center gap-2"
                        style={{ backgroundColor: COLORS.ACCENT }}
                        title={`${queueSize} ausstehende Änderungen werden synchronisiert`}
                      >
                        <motion.span
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          ⚡
                        </motion.span>
                        <span className="hidden lg:inline">
                          {queueSize} ausstehend
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* DEBUG CONSOLE BUTTON */}
                  {isDevelopment() && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Link
                        to={createPageUrl("Debug")}
                        className="px-4 py-2 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 text-sm font-medium flex items-center gap-2 group"
                        style={{ backgroundColor: COLORS.ACCENT }}
                        title="Debug Console öffnen"
                      >
                        <Bug className="w-4 h-4" />
                        <span className="hidden lg:inline">Debug</span>
                      </Link>
                    </motion.div>
                  )}

                  {/* DEVELOPER MODE TOGGLE */}
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={toggleDeveloperMode}
                    className="px-4 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 text-sm font-medium flex items-center gap-2 group text-white"
                    style={{ backgroundColor: devModeActive ? COLORS.ACCENT : COLORS.PRIMARY }}
                    title="Entwicklermodus umschalten (lokal gespeichert, erfordert Reload)"
                    aria-label="Entwicklermodus umschalten"
                    tabIndex={0}
                  >
                    🧰
                    <span className="hidden lg:inline">
                      {devModeActive ? 'Dev: ON' : 'Dev: OFF'}
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* TOAST CONTAINER */}
              <Toaster />
            </SidebarProvider>
          </AppProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  );
}
