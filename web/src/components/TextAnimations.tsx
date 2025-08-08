"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

// TypeWriter Animation Component
interface TypeWriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypeWriter({ text, speed = 100, className = "", onComplete }: TypeWriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-4 bg-current ml-1"
      />
    </span>
  );
}

// Gradient Text Animation Component
interface GradientTextProps {
  children: string;
  colors?: string[];
  className?: string;
  duration?: number;
}

export function GradientText({ children, colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"], className = "", duration = 3 }: GradientTextProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r ${className}`}
      style={{
        background: `linear-gradient(-45deg, ${colors.join(", ")})`,
        backgroundSize: `${colors.length * 100}% ${colors.length * 100}%`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text"
      }}
      animate={{
        backgroundPosition: [`0% 50%`, `${colors.length * 100}% 50%`, `0% 50%`]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {children}
    </motion.span>
  );
}

// Rotating Text Animation Component
interface RotatingTextProps {
  texts: string[];
  className?: string;
  duration?: number;
}

export function RotatingText({ texts, className = "", duration = 2 }: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % texts.length);
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [texts.length, duration]);

  return (
    <motion.span
      key={currentIndex}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {texts[currentIndex]}
    </motion.span>
  );
}

// Count Up Animation Component
interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function CountUp({ end, duration = 2, className = "", prefix = "", suffix = "" }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  return (
    <span className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}
