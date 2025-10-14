import React, { useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { createPageUrl } from '@/utils';

/**
 * PROTECTED ROUTE - PLATFORM COMPLIANT VERSION
 * 
 * ❌ DOES NOT USE: useNavigate, useLocation, Navigate from react-router-dom
 * ✅ USES: window.location for redirects (platform-compliant)
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading && !isAuthenticated) {
      // Use native browser navigation instead of React Router
      const loginUrl = '/login'; // Base44 platform provides this route
      window.location.href = loginUrl;
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
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

  // Don't render children if not authenticated (prevents flash of content)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}