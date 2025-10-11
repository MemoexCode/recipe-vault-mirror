/**
 * LOADING FALLBACK COMPONENT
 * 
 * Zweck:
 * - Wiederverwendbarer Loader für React.lazy Suspense
 * - Konsistent mit App Design System
 * - Deutsche Loading-Nachricht
 * 
 * Verwendung:
 * <Suspense fallback={<Loader />}>
 *   <LazyComponent />
 * </Suspense>
 */

import React from "react";
import { COLORS } from "@/components/utils/constants";

export default function Loader({ message = "Wird geladen …" }) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: COLORS.SILVER_LIGHTER }}
    >
      <div className="text-center">
        <div 
          className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6"
          style={{ borderColor: COLORS.ACCENT }}
        />
        <p 
          className="text-xl font-medium"
          style={{ color: COLORS.TEXT_PRIMARY }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}