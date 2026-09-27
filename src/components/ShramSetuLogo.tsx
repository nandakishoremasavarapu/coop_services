import React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

export interface ShramSetuLogoProps {
  /** Size in pixels or standard preset (xs: 20, sm: 28, md: 36, lg: 48, xl: 64). Default: 36. */
  size?: LogoSize;
  /** Presentation variant: icon only, horizontal with text, or vertically stacked. Default: "icon". */
  variant?: "icon" | "horizontal" | "vertical";
  /** Optional subtitle or portal descriptor (e.g. "Citizen Portal"). */
  sub?: string;
  /** Whether the logo is placed on a dark background. */
  dark?: boolean;
  /** Additional CSS class names for the outer container. */
  className?: string;
  /** Preload with high priority (useful for headers and above-the-fold brand identity). */
  priority?: boolean;
  /** Custom accessible alt text. Defaults to "Shram Setu". */
  alt?: string;
}

const PRESET_SIZES: Record<string, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

/**
 * Official Shram Setu brand logo component.
 * Ensures consistent aspect ratio, sizing, accessible labelling, and responsive layout across the application.
 */
export function ShramSetuLogo({
  size = "md",
  variant = "icon",
  sub,
  dark = false,
  className,
  priority = false,
  alt = "Shram Setu",
}: ShramSetuLogoProps) {
  const pixelSize = typeof size === "number" ? size : PRESET_SIZES[size] ?? 36;
  // Natural logo dimensions: 2308 x 2248 (~1.0267 : 1).
  const imgWidth = pixelSize;
  const imgHeight = Math.round(pixelSize * (2248 / 2308));

  const imageElement = (
    <span
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src="/logo/logo.png"
        alt={alt}
        width={imgWidth}
        height={imgHeight}
        priority={priority}
        className="object-contain w-full h-full"
      />
    </span>
  );

  if (variant === "icon") {
    return imageElement;
  }

  if (variant === "vertical") {
    return (
      <span className={cn("inline-flex flex-col items-center text-center gap-2", className)}>
        {imageElement}
        <span className="flex flex-col items-center leading-tight">
          <span className={cn("font-extrabold tracking-tight text-lg", dark ? "text-white" : "text-ink-950")}>
            Shram&nbsp;Setu
          </span>
          {sub && (
            <span className={cn("text-xs font-semibold mt-0.5", dark ? "text-brand-200" : "text-ink-500")}>
              {sub}
            </span>
          )}
        </span>
      </span>
    );
  }

  // Horizontal variant (logo + wordmark + optional subtext)
  return (
    <span className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      {imageElement}
      <span className="flex flex-col min-w-0 leading-tight">
        <span className={cn("font-extrabold tracking-tight text-[17px]", dark ? "text-white" : "text-ink-900")}>
          Shram&nbsp;Setu
        </span>
        {sub && (
          <span className={cn("text-2xs font-semibold truncate", dark ? "text-brand-200" : "text-ink-400")}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

export default ShramSetuLogo;
