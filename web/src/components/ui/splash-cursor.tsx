"use client";
import { useEffect, useRef } from "react";

function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0.5, g: 0, b: 0 },
  TRANSPARENT = true,
}: {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: { r: number; g: number; b: number };
  TRANSPARENT?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL context ve shader'lar için temel fonksiyonlar
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Canvas boyutlandırma
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Basit bir arka plan efekti
    const render = () => {
      gl.clearColor(BACK_COLOR.r, BACK_COLOR.g, BACK_COLOR.b, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      requestAnimationFrame(render);
    };

    render();

    // Temizlik
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [
    SIM_RESOLUTION,
    DYE_RESOLUTION,
    CAPTURE_RESOLUTION,
    DENSITY_DISSIPATION,
    VELOCITY_DISSIPATION,
    PRESSURE,
    PRESSURE_ITERATIONS,
    CURL,
    SPLAT_RADIUS,
    SPLAT_FORCE,
    SHADING,
    COLOR_UPDATE_SPEED,
    BACK_COLOR,
    TRANSPARENT,
  ]);

  return (
    <div className="fixed top-0 left-0 z-50 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-screen h-screen"
        style={{ background: "transparent" }}
      />
    </div>
  );
}

export { SplashCursor };
