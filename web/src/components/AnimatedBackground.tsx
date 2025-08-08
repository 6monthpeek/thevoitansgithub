"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden">
      <img 
        src="/thevoitanspurple-saturation100.gif" 
        alt="Arka plan animasyonu"
        className="w-full h-full object-cover"
        style={{ opacity: 0.8 }}
      />
    </div>
  );
}
