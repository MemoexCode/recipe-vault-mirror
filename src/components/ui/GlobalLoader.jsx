/**
 * GLOBAL LOADER COMPONENT
 * 
 * Zweck:
 * - Full-Screen Loading Overlay für schwere Operationen
 * - Semi-transparenter Hintergrund mit zentriertem Spinner
 * - Verhindert User-Interaktion während Ladevorgang
 * - Verwendet bei: Route-Transitions, schweren Import-Operationen
 * 
 * Verwendung:
 * import { GlobalLoader } from "@/components/ui/GlobalLoader";
 * {isGlobalLoading && <GlobalLoader message="Importiere Rezept..." />}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/components/utils/constants";

export default function GlobalLoader({ message = "Wird geladen …", isVisible = true }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
        >
          <div className="text-center">
            {/* Spinner */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-16 h-16 border-4 border-t-transparent rounded-full mx-auto mb-4"
              style={{ borderColor: `${COLORS.ACCENT} transparent ${COLORS.ACCENT} ${COLORS.ACCENT}` }}
            />
            
            {/* Loading Text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg font-medium"
              style={{ color: COLORS.TEXT_PRIMARY }}
            >
              {message}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}