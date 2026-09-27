import React from "react";
import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

/** Unified surface card. Deliberately quiet: white panel, thin border, soft shadow. */
export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-panel rounded-2xl border border-line shadow-card",
        interactive && "transition-all duration-150 hover:shadow-raised hover:border-line-strong active:scale-[0.995]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 pt-5 pb-0 sm:px-6 sm:pt-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[15px] font-bold text-ink-900 leading-snug", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-500 mt-1 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4 sm:px-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4 sm:px-6 border-t border-line", className)} {...props}>
      {children}
    </div>
  );
}

/** Small uppercase section kicker used throughout the product. */
export function SectionLabel({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-xs font-bold uppercase tracking-[0.08em] text-ink-400", className)}
      {...props}
    >
      {children}
    </span>
  );
}
