"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width treatment per page type. */
  width?: "default" | "narrow" | "wide" | "full";
}

const widths = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
  wide: "max-w-[87.5rem]",
  full: "max-w-none",
};

/** Consistent content container for every page. */
export function PageContainer({ width = "default", className, children, ...props }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-enter-up", widths[width], className)} {...props}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
  meta?: React.ReactNode;
}

/** Consistent title area for every page. */
export function PageHeader({ title, description, backHref, onBack, actions, meta, className }: PageHeaderProps) {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) onBack();
    else if (backHref) router.push(backHref);
    else router.back();
  };

  const showBack = Boolean(backHref || onBack);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 sm:mb-6", className)}>
      <div className="flex items-start gap-2.5 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="mt-0.5 size-10 sm:size-9 rounded-full inline-flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors shrink-0 -ml-1.5"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900 leading-tight text-balance">{title}</h1>
          {description && <p className="text-sm text-ink-500 mt-1 leading-relaxed">{description}</p>}
          {meta && <div className="flex flex-wrap items-center gap-2 mt-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 sm:pt-0.5 flex-wrap">{actions}</div>}
    </div>
  );
}
