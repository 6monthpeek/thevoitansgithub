"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface NavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface GooeyNavProps {
  items: NavItem[];
  className?: string;
}

export function GooeyNav({ items, className = "" }: GooeyNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className={`relative ${className}`}>
             {/* Gooey Background */}
       <motion.div
         className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-xl rounded-full border border-white/10"
         style={{
           filter: "blur(20px)",
         }}
         animate={{
           scale: activeId ? 1.1 : 1,
           opacity: activeId ? 0.8 : 0.3,
         }}
         transition={{ duration: 0.3 }}
       />
      
      {/* Navigation Items */}
      <div className="relative flex items-center gap-2 p-2">
        {items.map((item, index) => (
          <motion.button
            key={item.id}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeId === item.id
                ? "text-black bg-white shadow-lg"
                : "text-gray-300 hover:text-black hover:bg-white"
            }`}
            onClick={() => {
              setActiveId(item.id);
              item.onClick?.();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {item.label}
            
                         {/* Active Indicator */}
             {activeId === item.id && (
               <motion.div
                 className="absolute inset-0 bg-white rounded-full -z-10"
                 layoutId="activeNav"
                 initial={false}
                 transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
               />
             )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
