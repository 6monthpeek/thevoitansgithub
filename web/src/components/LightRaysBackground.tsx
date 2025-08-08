"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LightRaysBackgroundProps {
  className?: string;
}

export function LightRaysBackground({ className = "" }: LightRaysBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      {/* Light Rays */}
      <motion.div
        className="absolute inset-0"
                 style={{
           background: `
             radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
               rgba(9, 2, 14, 0.1) 0%, 
               transparent 50%),
             radial-gradient(circle at 20% 80%, 
               rgba(11, 4, 16, 0.05) 0%, 
               transparent 40%),
             radial-gradient(circle at 80% 20%, 
               rgba(17, 5, 19, 0.05) 0%, 
               transparent 40%),
             radial-gradient(circle at 40% 40%, 
               rgba(20, 6, 23, 0.03) 0%, 
               transparent 60%)
           `,
         }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated Rays */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
                     style={{
             background: `conic-gradient(from ${i * 45}deg, transparent 0deg, rgba(9, 2, 14, 0.02) 10deg, transparent 20deg)`,
             transformOrigin: "center",
           }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20 + i * 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
                     className="absolute w-1 h-1 bg-[#09020E]/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
