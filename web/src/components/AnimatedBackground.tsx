"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedBackgroundProps {
  showVideo?: boolean;
  className?: string;
}

export function AnimatedBackground({ 
  showVideo = false,
  className = ""
}: AnimatedBackgroundProps) {
  const [showMainContent, setShowMainContent] = useState(false);
  const [isInitial, setIsInitial] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitial(false);
    }, 2000);

    const mainContentTimer = setTimeout(() => {
      setShowMainContent(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(mainContentTimer);
    };
  }, []);

  return (
    <>
      {/* Splash Screen */}
      <AnimatePresence>
        {!showMainContent && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isInitial ? (
              <motion.div
                key="logo-center"
                className="flex items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="relative">
                  <video 
                    src="/fotor-ai-20250808202835.mp4" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-64 h-64 object-contain"
                    style={{ 
                      opacity: 1,
                      filter: "drop-shadow(0 0 30px rgba(147, 112, 219, 0.8))"
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-700/20 rounded-full blur-xl"></div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
