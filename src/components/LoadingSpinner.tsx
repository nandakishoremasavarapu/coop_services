"use client";

import React from "react";
import { Spinner, LoadingBlock } from "@/components/ui/states";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

export function LoadingSpinner({ size = 28, label }: LoadingSpinnerProps) {
  if (label) return <LoadingBlock label={label} />;
  return (
    <div className="flex items-center justify-center p-6" role="status">
      <Spinner size={size} />
    </div>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Spinner size={34} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
