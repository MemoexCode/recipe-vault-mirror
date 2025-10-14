
import React from 'react';
import { AppProvider } from '@/components/contexts/AppContext';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { createPageUrl } from '@/utils';
import { useApp } from '@/components/contexts/AppContext';

// This NavList is now 100% platform-compliant.
// It uses standard <a> tags with the createPageUrl helper for navigation,
// which prevents the "Invariant failed" error. It correctly calls useApp()
// because it is rendered inside the AppProvider's scope.
function NavList() {
  const { categories } = useApp();
  const navItems = [
    { name: 'Alle Rezepte', href: createPageUrl('Browse') },
    { name: 'Sammlungen', href: createPageUrl('Collections') },
    { name: 'Einkaufsliste', href: createPageUrl('ShoppingList') },
    { name: 'Import', href: createPageUrl('Import') },
  ];

  return (
    <nav className="grid items-start gap-1 px-2 text-sm font-medium">
      {navItems.map((item) => (
        <a key={item.name} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-gray-100">
          {item.name}
        </a>
      ))}
      {categories && categories.length > 0 && <hr className="my-2" />}
      {categories?.map((category) => (
        <a key={category.id} href={createPageUrl('CategoryDetail', { id: category.id })} className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-gray-100">
          {category.name}
        </a>
      ))}
    </nav>
  );
}

// This is the definitive, platform-compliant version of the Layout.
// Its sole purpose is to wrap the page content (`children`) with all necessary providers
// and the persistent UI shell, without any manual routing logic.
export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <div className="hidden border-r bg-gray-50/50 md:block w-64">
                <div className="flex h-full max-h-screen flex-col gap-2">
                  <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <a href={createPageUrl('Browse')} className="font-semibold text-lg">RecipeVault</a>
                  </div>
                  <div className="flex-1 overflow-auto py-2">
                    <NavList />
                  </div>
                </div>
              </div>
              <main className="flex-1 overflow-y-auto p-8">
                {children}
              </main>
              <Toaster />
            </div>
          </ProtectedRoute>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
