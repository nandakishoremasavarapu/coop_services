"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface SwipeButtonProps {
  label: string;
  onComplete: () => void;
  tone?: "brand" | "accent" | "success";
  disabled?: boolean;
  icon?: React.ReactNode;
}

const TONE_CLASSES: Record<NonNullable<SwipeButtonProps["tone"]>, { track: string; thumb: string; text: string }> = {
  brand: { track: "bg-brand-50 border-brand-200", thumb: "bg-brand-700", text: "text-brand-800" },
  accent: { track: "bg-accent-50 border-accent-200", thumb: "bg-accent-500", text: "text-accent-700" },
  success: { track: "bg-success-100 border-success-300", thumb: "bg-success-600", text: "text-success-700" },
};

/** Slide-to-confirm control for irreversible on-site job actions. */
export function SwipeButton({ label, onComplete, tone = "brand", disabled = false, icon }: SwipeButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const measure = useCallback(() => {
    setContainerWidth(containerRef.current?.offsetWidth ?? 0);
  }, []);

  // Track container size for thumb positioning.
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const handleStart = (clientX: number) => {
    if (disabled || completed) return;
    measure();
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    const thumbWidth = 48;
    const maxTravel = width - thumbWidth - 8;
    const delta = clientX - startXRef.current;
    const newProgress = Math.max(0, Math.min(1, delta / maxTravel));
    progressRef.current = newProgress;
    setProgress(newProgress);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (progressRef.current >= 0.85) {
      setCompleted(true);
      setProgress(1);
      setTimeout(() => onComplete(), 250);
    } else {
      progressRef.current = 0;
      setProgress(0);
    }
  };

  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-disabled={disabled}
      className={cn(
        "relative h-14 rounded-2xl border-2 overflow-hidden select-none [touch-action:pan-y]",
        toneClasses.track,
        disabled && "opacity-50 pointer-events-none"
      )}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Shimmer label */}
      <div className={cn("absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold pl-14 pr-4", toneClasses.text)}>
        {completed ? (
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Done
          </span>
        ) : (
          <>
            <ChevronsRight className={cn("size-4 shrink-0", !isDragging && "animate-pulse")} aria-hidden />
            <span className="truncate">{label}</span>
          </>
        )}
      </div>
      {/* Thumb */}
      <div
        className={cn(
          "absolute top-1 bottom-1 rounded-xl flex items-center justify-center text-white shadow-raised",
          toneClasses.thumb,
          !isDragging && "transition-[left] duration-200"
        )}
        style={{
          width: 48,
          left: 4 + progress * Math.max(containerWidth - 56, 0),
        }}
      >
        {icon ?? <ChevronsRight className="size-5" aria-hidden />}
      </div>
    </div>
  );
}
