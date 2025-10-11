
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  BookOpen, FolderHeart, ShoppingCart, Plus,
  Settings, Image as ImageIcon, Trash2, Bug
} from "lucide-react";
import { createPageUrl } from "@/utils";

const HIGHLIGHT_ID = "rv_active_highlight";

function SidebarContentComponent() {
  const location = useLocation();
  const { categories, recipeCounts } = useCategories();

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

  const isActiveUrl = (url) => {
    const target = new URL(url, window.location.origin);
    return location.pathname + location.search === target.pathname + target.search;
  };

  const NavItem = ({ title, url, Icon, active }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="relative overflow-hidden rounded-xl mb-1">
        <Link to={url} className="flex items-center gap-3 px-4 py-3">
          {active && (
            <motion.span
              layoutId={HIGHLIGHT_ID}
              className="absolute inset-0 rounded-xl"
              style={{ backgroundColor: COLORS.ACCENT, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <Icon className="w-5 h-5 relative z-10" />
          <motion.span
            className="font-medium relative z-10"
            animate={{ color: active ? "#ffffff" : COLORS.TEXT_PRIMARY }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {title}
          </motion.span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const CategoryList = ({ categoryList, type }) => (
    <SidebarMenu>
      {categoryList.map((c) => {
        const url = `${createPageUrl("Browse")}?category=${encodeURIComponent(c.name)}`;
        const IconC = getIconComponent(c.icon);
        const count = recipeCounts[type][c.name] || 0;
        const active = isActiveUrl(url);

        return (
          <SidebarMenuItem key={c.id}>
            <SidebarMenuButton asChild className="relative overflow-hidden rounded-xl mb-1">
              <Link to={url} className="flex items-center gap-3 px-4 py-3">
                {active && (
                  <motion.span
                    layoutId={HIGHLIGHT_ID}
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: COLORS.ACCENT, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <IconC className="w-5 h-5 relative z-10" />
                <motion.span
                  className="font-medium relative z-10 truncate"
                  animate={{ color: active ? "#ffffff" : COLORS.TEXT_PRIMARY }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                  {c.name}
                </motion.span>
                <span className="ml-auto text-xs relative z-10 opacity-70">{count}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar className="h-screen">
      <SidebarContent className="h-full overflow-y-auto">
        <SidebarHeader className="px-4 py-4">
          <div className="text-sm text-gray-500">Deine Rezeptsammlung</div>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigationItems.map((item) => (
                <NavItem key={item.url} title={item.title} url={item.url} Icon={item.icon} active={isActiveUrl(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Mahlzeiten</SidebarGroupLabel>
          <SidebarGroupContent><CategoryList categoryList={categories.meal} type="meal" /></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Gänge</SidebarGroupLabel>
          <SidebarGroupContent><CategoryList categoryList={categories.gang} type="gang" /></SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Weitere</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <NavItem key={item.url} title={item.title} url={item.url} Icon={item.icon} active={isActiveUrl(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function Layout({ children, currentPageName }) {
  const { toast } = useToast();
  const [queueSize, setQueueSize] = React.useState(0);

  React.useEffect(() => { initToast(toast); }, [toast]);
  React.useEffect(() => { registerGlobalErrorHandlers(); }, []);
  React.useEffect(() => {
    const onQ = (n) => setQueueSize(n);
    offlineQueue.addListener(onQ);
    setQueueSize(offlineQueue.getQueueSize());
    return () => offlineQueue.removeListener(onQ);
  }, []);

  const devModeActive = isManualDevModeEnabled();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <AppProvider>
            <SidebarProvider>
              <style>{`
                :root { --accent-orange: ${COLORS.ACCENT}; }
                body { overflow-x: hidden; background-color: ${COLORS.SILVER_LIGHTER}; }
                * { box-sizing: border-box; }
              `}</style>

              <div className="min-h-screen flex w-full" style={{ backgroundColor: COLORS.SILVER_LIGHTER }}>
                <SidebarContentComponent />

                <main className="flex-1 flex flex-col overflow-x-hidden">
                  <div className="flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={currentPageName}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.24, ease: "easeInOut" }}
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
