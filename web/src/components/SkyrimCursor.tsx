"use client";

import { useEffect, useState } from "react";

export default function SkyrimCursor() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
    };

    const handleMouseLeave = () => {
      setCursorVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .skyrim-cursor {
          position: fixed;
          width: 20px;
          height: 20px;
          border: 2px solid var(--skyrim-gold);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transition: transform 0.1s ease-out;
          box-shadow: 
            0 0 10px var(--skyrim-gold),
            0 0 20px var(--skyrim-gold),
            inset 0 0 10px var(--skyrim-purple);
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2), transparent);
        }

        .skyrim-cursor::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          background: var(--skyrim-snow);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px var(--skyrim-snow);
        }

        .skyrim-cursor-trail {
          position: fixed;
          width: 40px;
          height: 40px;
          border: 1px solid var(--skyrim-gold);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          opacity: 0.3;
          transition: transform 0.3s ease-out;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent);
        }

        .skyrim-cursor-ring {
          position: fixed;
          width: 60px;
          height: 60px;
          border: 1px solid var(--skyrim-purple);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9997;
          opacity: 0.2;
          transition: transform 0.5s ease-out;
          background: radial-gradient(circle, rgba(74, 20, 140, 0.1), transparent);
        }

        .link-hover-effect {
          position: relative;
          overflow: hidden;
        }

        .link-hover-effect::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .link-hover-effect:hover::before {
          left: 100%;
        }

        .link-hover-effect:hover {
          color: var(--skyrim-gold);
          text-shadow: 0 0 10px var(--skyrim-gold);
        }

        /* Hide default cursor */
        * {
          cursor: none !important;
        }

        @media (pointer: coarse) {
          * {
            cursor: auto !important;
          }
          .skyrim-cursor,
          .skyrim-cursor-trail,
          .skyrim-cursor-ring {
            display: none;
          }
        }
      `}</style>

      <div
        className="skyrim-cursor"
        style={{
          left: cursorPosition.x - 10,
          top: cursorPosition.y - 10,
          opacity: cursorVisible ? 1 : 0,
          transform: `scale(${cursorVisible ? 1 : 0.8})`,
        }}
      />

      <div
        className="skyrim-cursor-trail"
        style={{
          left: cursorPosition.x - 20,
          top: cursorPosition.y - 20,
          opacity: cursorVisible ? 0.3 : 0,
          transform: `scale(${cursorVisible ? 1 : 0.8})`,
        }}
      />

      <div
        className="skyrim-cursor-ring"
        style={{
          left: cursorPosition.x - 30,
          top: cursorPosition.y - 30,
          opacity: cursorVisible ? 0.2 : 0,
          transform: `scale(${cursorVisible ? 1 : 0.8})`,
        }}
      />
    </>
  );
}
