import React from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean | null;
  className?: string;
}

const sizeClasses = {
  xs: "size-7 text-[11px] rounded-lg",
  sm: "size-9 text-xs rounded-xl",
  md: "size-11 text-sm rounded-xl",
  lg: "size-14 text-base rounded-2xl",
  xl: "size-20 text-2xl rounded-2xl",
};

/** Initials-based avatar (no stock photos — identity you can trust). */
export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn("object-cover bg-brand-100 text-brand-800", sizeClasses[size])}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex items-center justify-center bg-brand-700 text-white font-bold select-none",
            sizeClasses[size]
          )}
        >
          {initials(name)}
        </span>
      )}
      {online != null && (
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white",
            online ? "bg-success-500" : "bg-ink-300"
          )}
        />
      )}
    </span>
  );
}
