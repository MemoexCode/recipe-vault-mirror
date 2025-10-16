import React from 'react';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { AppProvider } from '@/components/contexts/AppContext';

// The Layout component has been temporarily commented out for debugging.
// import Layout from '../Layout';

export default function App({ children }) {
  // This is the root component that wraps every page.
  // We are stripping it down to the bare providers and a test element
  // to isolate the source of the "Invariant failed" error.
  return (
    <>
      {/* 
      <AuthProvider>
        <AppContextProvider>
          <Layout>{children}</Layout>
        </AppContextProvider>
      </AuthProvider>
      */}
      <h1>CACHE BUST SUCCESSFUL</h1>
    </>
  );
}