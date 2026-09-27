import React from "react";
import { ShramSetuLogo } from "./ShramSetuLogo";
import { cn } from "@/lib/cn";

export interface SahakariEmblemProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

/**
 * Backwards-compatible emblem component that renders the official Shram Setu brand logo.
 */
export function SahakariEmblem({ className = "w-8 h-8", size, rounded = true }: SahakariEmblemProps) {
  return (
    <ShramSetuLogo
      size={size ?? 32}
      className={cn(rounded && "rounded-lg", className)}
      alt="Shram Setu"
    />
  );
}

export default SahakariEmblem;
