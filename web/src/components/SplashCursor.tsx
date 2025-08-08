"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashCursorProps {
  className?: string;
}

export function SplashCursor({ className = "" }: SplashCursorProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const isDefault = className.includes("default");

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseDown = () => {
      setIsClicking(true);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Default modda her zaman görünür
  if (!isVisible && !isDefault) return null;

  return (
    <>
      {/* Ana Cursor */}
      <motion.div
        className={`fixed pointer-events-none z-50 ${className}`}
        style={{
          left: mousePosition.x - 20,
          top: mousePosition.y - 20,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isClicking ? 0.8 : 1, 
          opacity: isDefault ? 0.8 : 0.6 
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Ana Cursor Ring */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-400/30 shadow-lg" />
        
        {/* İç Glow */}
        <motion.div
          className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-400/10 to-blue-400/10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Dış Pulse */}
        <motion.div
          className="absolute inset-0 w-10 h-10 rounded-full border border-purple-400/20"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </motion.div>

      {/* Splash Effect */}
      {isClicking && (
        <motion.div
          className="fixed pointer-events-none z-40"
          style={{
            left: mousePosition.x - 40,
            top: mousePosition.y - 40,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ 
            scale: [0, 1.5, 2],
            opacity: [1, 0.8, 0],
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Splash Ring */}
          <div className="w-20 h-20 rounded-full border-2 border-purple-400/40" />
          
          {/* Splash Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/60 rounded-full"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
              initial={{ 
                x: 0, 
                y: 0, 
                opacity: 1,
                scale: 1 
              }}
              animate={{
                x: Math.cos((i * 45 * Math.PI) / 180) * 60,
                y: Math.sin((i * 45 * Math.PI) / 180) * 60,
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.05,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Hover Trail Effect */}
      <motion.div
        className="fixed pointer-events-none z-30"
        style={{
          left: mousePosition.x - 15,
          top: mousePosition.y - 15,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 0.3 
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm" />
      </motion.div>
    </>
  );
}
