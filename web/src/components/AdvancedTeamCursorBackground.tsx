"use client";

import { useEffect, useRef } from "react";

export default function AdvancedTeamCursorBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      angle: number;
      distance: number;
      hue: number;
      opacity: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    // Create particles
    const createParticles = () => {
      particles.length = 0;
      const particleCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 10000));
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 50;
        const hue = Math.random() * 60 + 30; // Gold to amber range
        particles.push({
          x: mouseX + Math.cos(angle) * distance,
          y: mouseY + Math.sin(angle) * distance,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.2,
          speedY: (Math.random() - 0.5) * 0.2,
          color: `hsl(${hue}, 80%, 60%)`,
          angle,
          distance,
          hue,
          opacity: Math.random() * 0.4 + 0.2,
          pulseSpeed: Math.random() * 0.01 + 0.005,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    resizeCanvas();

    const animate = () => {
      // Create fade trail effect
      ctx.fillStyle = "rgba(10, 10, 10, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smooth mouse movement
      targetX += (mouseX - targetX) * 0.1;
      targetY += (mouseY - targetY) * 0.1;

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Move particle in circular motion around mouse
        particle.angle += 0.01;
        particle.x = targetX + Math.cos(particle.angle) * particle.distance;
        particle.y = targetY + Math.sin(particle.angle) * particle.distance;

        // Add some random movement
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        if (particle.y < 0) particle.y = canvas.height;

        // Pulsing effect
        const pulse = Math.sin(Date.now() * particle.pulseSpeed + particle.pulsePhase) * 0.3 + 0.7;
        const currentSize = particle.size * pulse;
        const currentOpacity = particle.opacity * pulse;

        // Draw particle with enhanced glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
        
        // Create multiple gradients for layered glow effect
        const innerGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          currentSize
        );
        innerGradient.addColorStop(0, `hsla(${particle.hue}, 90%, 70%, ${currentOpacity})`);
        innerGradient.addColorStop(0.7, `hsla(${particle.hue}, 80%, 60%, ${currentOpacity * 0.5})`);
        innerGradient.addColorStop(1, "transparent");
        
        const outerGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          currentSize,
          particle.x,
          particle.y,
          currentSize * 6
        );
        outerGradient.addColorStop(0, `hsla(${particle.hue}, 70%, 50%, ${currentOpacity * 0.3})`);
        outerGradient.addColorStop(0.5, `hsla(${particle.hue}, 60%, 40%, ${currentOpacity * 0.1})`);
        outerGradient.addColorStop(1, "transparent");

        // Draw outer glow
        ctx.fillStyle = outerGradient;
        ctx.fill();
        
        // Draw inner glow
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // Draw connections to nearby particles with enhanced effect
        particles.slice(index + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (0.3 * (1 - distance / 150)) * pulse;
            
            // Draw main connection
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `hsla(${(particle.hue + otherParticle.hue) / 2}, 70%, 50%, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Draw energy flow along connection
            const flowProgress = (Date.now() * 0.001 + index * 0.1) % 1;
            const flowX = particle.x + (otherParticle.x - particle.x) * flowProgress;
            const flowY = particle.y + (otherParticle.y - particle.y) * flowProgress;
            
            ctx.beginPath();
            ctx.arc(flowX, flowY, 1, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(particle.hue + otherParticle.hue) / 2}, 90%, 70%, ${opacity * 2})`;
            ctx.fill();
          }
        });

        // Draw connection to mouse with enhanced effect
        const mouseDistance = Math.sqrt(
          Math.pow(particle.x - targetX, 2) + Math.pow(particle.y - targetY, 2)
        );
        
        if (mouseDistance < 200) {
          const opacity = (0.4 * (1 - mouseDistance / 200)) * pulse;
          
          // Draw main connection
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = `hsla(${particle.hue}, 80%, 60%, ${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw energy flow
          const flowProgress = (Date.now() * 0.002) % 1;
          const flowX = particle.x + (targetX - particle.x) * flowProgress;
          const flowY = particle.y + (targetY - particle.y) * flowProgress;
          
          ctx.beginPath();
          ctx.arc(flowX, flowY, 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${particle.hue}, 90%, 70%, ${opacity * 2})`;
          ctx.fill();
        }
      });

      // Draw enhanced mouse glow with multiple layers
      const time = Date.now() * 0.001;
      
      // Outer glow
      const outerMouseGradient = ctx.createRadialGradient(
        targetX,
        targetY,
        0,
        targetX,
        targetY,
        80 + Math.sin(time) * 10
      );
      outerMouseGradient.addColorStop(0, "rgba(212, 175, 55, 0.2)");
      outerMouseGradient.addColorStop(0.4, "rgba(212, 175, 55, 0.05)");
      outerMouseGradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = outerMouseGradient;
      ctx.fillRect(targetX - 80, targetY - 80, 160, 160);

      // Inner glow
      const innerMouseGradient = ctx.createRadialGradient(
        targetX,
        targetY,
        0,
        targetX,
        targetY,
        30 + Math.sin(time * 1.5) * 5
      );
      innerMouseGradient.addColorStop(0, "rgba(212, 175, 55, 0.4)");
      innerMouseGradient.addColorStop(0.5, "rgba(212, 175, 55, 0.1)");
      innerMouseGradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = innerMouseGradient;
      ctx.fillRect(targetX - 30, targetY - 30, 60, 60);

      // Core glow
      const coreMouseGradient = ctx.createRadialGradient(
        targetX,
        targetY,
        0,
        targetX,
        targetY,
        10
      );
      coreMouseGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      coreMouseGradient.addColorStop(0.5, "rgba(212, 175, 55, 0.6)");
      coreMouseGradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = coreMouseGradient;
      ctx.fillRect(targetX - 10, targetY - 10, 20, 20);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
