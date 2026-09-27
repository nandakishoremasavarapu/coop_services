"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width of the desktop dialog. */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

/**
 * Unified overlay: bottom sheet on phones, centered dialog on desktop.
 * - Backdrop click + Escape to close
 * - Body scroll lock while open
 * - Focus moved into dialog on open
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md", className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    focusable?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      {/* Backdrop */}
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in cursor-default"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative w-full bg-panel shadow-overlay flex flex-col max-h-[92dvh]",
          "rounded-t-3xl sm:rounded-3xl animate-sheet-up sm:animate-pop-in",
          sizeClasses[size],
          className
        )}
      >
        {/* Mobile grab handle affordance */}
        <div className="sm:hidden pt-2.5 pb-0 flex justify-center shrink-0" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-ink-200" />
        </div>

        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:pt-5 pb-4 border-b border-line shrink-0">
            <div className="min-w-0">
              {title && <h2 className="text-base font-bold text-ink-900 leading-snug">{title}</h2>}
              {description && <p className="text-sm text-ink-500 mt-0.5 leading-snug">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="size-9 -mr-1.5 -mt-1 rounded-full inline-flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors shrink-0"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        <div className="px-5 py-4 sm:py-5 overflow-y-auto grow min-h-0">{children}</div>

        {footer && <div className="px-5 py-4 border-t border-line shrink-0 pb-safe">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* --------------------------------------------------------------------------- */
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end pt-1">
        <Button variant="outline" onClick={onClose} disabled={loading} className="sm:w-auto w-full">
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          onClick={onConfirm}
          loading={loading}
          className="sm:w-auto w-full"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
