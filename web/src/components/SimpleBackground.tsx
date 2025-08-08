"use client";

import { useEffect, useRef } from "react";

export default function SimpleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutlandırma
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Parçacık sistemi
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
    }> = [];

    // Başlangıç parçacıkları
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
color: `rgba(128, 0, 128, ${Math.random() * 0.3 + 0.1})`,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    // Fare pozisyonu
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animasyon döngüsü
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Arka plan gradyanı
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0A0B0D');
      gradient.addColorStop(0.5, '#11121A');
      gradient.addColorStop(1, '#0A0B0D');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fare etrafında ışık halkası
      const mouseGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 200);
      mouseGradient.addColorStop(0, 'rgba(147, 112, 219, 0.12)');
      mouseGradient.addColorStop(0.5, 'rgba(147, 112, 219, 0.06)');
      mouseGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = mouseGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Parçacıkları güncelle ve çiz
      particles.forEach((particle, index) => {
        // Fareye çekme efekti
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const force = (150 - distance) / 150;
          particle.x += dx * force * 0.01;
          particle.y += dy * force * 0.01;
          particle.opacity = Math.min(1, particle.opacity + force * 0.02);
        } else {
          particle.opacity = Math.max(0.2, particle.opacity - 0.01);
        }

        // Normal hareket
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Sınırlarda geri dön
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        // Parçacığı çiz
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/i, `${particle.opacity})`);
        ctx.fill();

        // Bağlantı çizgileri
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `rgba(147, 112, 219, ${0.05 * (1 - distance / 80) * Math.min(particle.opacity, otherParticle.opacity)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    // Temizlik
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}
