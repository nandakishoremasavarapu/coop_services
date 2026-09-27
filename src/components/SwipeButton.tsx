"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface SwipeButtonProps {
  label: string;
  onComplete: () => void;
  color?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function SwipeButton({ label, onComplete, color = "#1a56db", disabled = false, icon }: SwipeButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(240);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const handleStart = (clientX: number) => {
    if (disabled || completed) return;
    setIsDragging(true);
    startXRef.current = clientX;
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const width = containerRef.current.offsetWidth || containerWidth;
    const thumbWidth = 56;
    const maxTravel = width - thumbWidth - 8;
    const delta = clientX - startXRef.current;
    const newProgress = Math.max(0, Math.min(1, delta / maxTravel));
    setProgress(newProgress);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (progress >= 0.85) {
      setCompleted(true);
      setProgress(1);
      setTimeout(() => {
        onComplete();
      }, 300);
    } else {
      setProgress(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-14 rounded-full overflow-hidden select-none"
      style={{ background: `${color}22`, border: `2px solid ${color}44` }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Background fill */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-75 rounded-full"
        style={{
          width: `${progress * 100}%`,
          background: `${color}33`,
        }}
      />
      {/* Label */}
      <div
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
        style={{ color: color, paddingLeft: 72 }}
      >
        {completed ? "✓ Done" : label}
      </div>
      {/* Thumb */}
      <div
        className="absolute top-1 bottom-1 rounded-full flex items-center justify-center shadow-md transition-all duration-150"
        style={{
          width: 48,
          left: 4 + progress * (containerWidth - 56 - 8),
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        }}
      >
        {icon ?? <ChevronRight size={20} color="white" />}
      </div>
    </div>
  );
}
