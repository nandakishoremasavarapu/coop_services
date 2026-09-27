"use client";

import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------------
 * Field — label + control + hint/error wrapper with automatic aria wiring.
 * ------------------------------------------------------------------------ */
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode | ((id: string) => React.ReactNode);
  className?: string;
}

export function Field({ label, hint, error, required, htmlFor, children, className }: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink-800">
          {label}
          {required && <span className="text-danger-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {typeof children === "function" ? children(id) : children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-xl border border-line-strong bg-white text-ink-900 placeholder:text-ink-400 shadow-xs transition-colors " +
  "hover:border-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 focus:outline-none " +
  "disabled:bg-ink-50 disabled:text-ink-400 disabled:cursor-not-allowed";

/* --------------------------------------------------------------------------- */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, icon, ...props },
  ref
) {
  if (icon) {
    return (
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none [&>svg]:size-4.5">
          {icon}
        </span>
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(controlBase, "h-11 pl-10.5 pr-4 text-sm", invalid && "border-danger-400 focus:border-danger-500 focus:ring-danger-500/15", className)}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "h-11 px-4 text-sm", invalid && "border-danger-400 focus:border-danger-500 focus:ring-danger-500/15", className)}
      {...props}
    />
  );
});

/* --------------------------------------------------------------------------- */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "px-4 py-3 text-sm leading-relaxed min-h-24 resize-y", invalid && "border-danger-400 focus:border-danger-500 focus:ring-danger-500/15", className)}
      {...props}
    />
  );
});

/* --------------------------------------------------------------------------- */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "h-11 px-3.5 text-sm appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-9", "bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2363716a%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]", invalid && "border-danger-400 focus:border-danger-500 focus:ring-danger-500/15", className)}
      {...props}
    >
      {children}
    </select>
  );
});

/* --------------------------------------------------------------------------- */
interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "checked"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onCheckedChange, label, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 cursor-pointer",
        checked ? "bg-brand-600" : "bg-ink-300",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1 size-5 rounded-full bg-white shadow-md transition-all duration-200",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

/* --------------------------------------------------------------------------- */
interface ChoiceCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  selected: boolean;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

/** Selectable card button (radio-like) used for role/service/time pickers. */
export function ChoiceCard({ selected, icon, title, description, className, ...props }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all duration-150 cursor-pointer flex items-start gap-3.5",
        selected
          ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/30 shadow-xs"
          : "border-line bg-white hover:border-line-strong hover:bg-ink-50/60",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden
          className={cn(
            "size-10 rounded-xl flex items-center justify-center shrink-0 [&>svg]:size-5",
            selected ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600"
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-bold leading-snug", selected ? "text-brand-900" : "text-ink-900")}>
          {title}
        </span>
        {description && <span className="block text-[13px] text-ink-500 mt-0.5 leading-snug">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "size-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors",
          selected ? "border-brand-600 bg-brand-600" : "border-ink-300 bg-white"
        )}
      >
        {selected && (
          <svg viewBox="0 0 24 24" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
    </button>
  );
}
