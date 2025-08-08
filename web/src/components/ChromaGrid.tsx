"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface ChromaGridProps {
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    color?: string;
  }>;
  className?: string;
}

export function ChromaGrid({ items, className = "" }: ChromaGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          className="relative group cursor-pointer"
          onHoverStart={() => setHoveredId(item.id)}
          onHoverEnd={() => setHoveredId(null)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <motion.div
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 p-6 h-48"
            whileHover={{ 
              scale: 1.02,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Chroma Effect Background */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${item.color || '#8b5cf6'}20 0%, transparent 50%)`,
              }}
            />
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-gray-300 text-sm">{item.subtitle}</p>
                )}
              </div>
              
              {/* Hover Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={false}
                animate={{
                  background: hoveredId === item.id 
                    ? "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139, 92, 246, 0.3) 0%, transparent 70%)"
                    : "radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%)"
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
