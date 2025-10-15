

import React, { useEffect } from 'react';
import { AppProvider } from '@/components/contexts/AppContext';
import { AuthProvider, useAuth } from '@/components/contexts/AuthContext';
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

function AuthenticatedLayoutContent({ children }) {
  // This component now renders the actual layout shell,
  // but only *after* authentication has been confirmed.
  return (
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
  );
}

function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only redirect after loading is complete and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      // Base44 platform provides the /login route
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  // While checking auth, show a loader
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the children (the main layout)
  // If not authenticated, return null to prevent content flash during redirect
  return isAuthenticated ? children : null;
}

// This is the definitive, platform-compliant version of the Layout.
// Its sole purpose is to wrap the page content (`children`) with all necessary providers
// and the persistent UI shell, without any manual routing logic.
export default function Layout({ children }) {
  // The main Layout now orchestrates the providers and the auth guard.
  // It is much cleaner and follows a standard React pattern.
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <AuthGuard>
            <AuthenticatedLayoutContent>
              {children}
            </AuthenticatedLayoutContent>
          </AuthGuard>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

