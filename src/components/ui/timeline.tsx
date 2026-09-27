import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOKING_LIFECYCLE, getLifecycleStates, type LifecycleState } from "@/lib/status";

interface BookingTimelineProps {
  status: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

/** Visual booking journey tracker. */
export function BookingTimeline({ status, className, orientation = "horizontal" }: BookingTimelineProps) {
  const states = getLifecycleStates(status);

  if (orientation === "vertical") {
    return (
      <ol className={cn("flex flex-col", className)}>
        {BOOKING_LIFECYCLE.map((step, i) => {
          const state = states[i];
          const last = i === BOOKING_LIFECYCLE.length - 1;
          return (
            <li key={step.key} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <StepDot state={state} />
                {!last && (
                  <span
                    aria-hidden
                    className={cn("w-0.5 grow min-h-7 my-1 rounded-full", state === "done" ? "bg-brand-500" : "bg-ink-200")}
                  />
                )}
              </div>
              <div className={cn("pb-6 text-sm pt-0.5", last && "pb-0")}>
                <p className={cn("font-semibold leading-snug", state === "upcoming" ? "text-ink-400" : "text-ink-900")}>
                  {step.label}
                </p>
                {state === "current" && <p className="text-xs text-brand-700 font-medium mt-0.5">Current stage</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-start w-full", className)}>
      {BOOKING_LIFECYCLE.map((step, i) => {
        const state = states[i];
        const last = i === BOOKING_LIFECYCLE.length - 1;
        return (
          <li key={step.key} className={cn("flex items-start", !last && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5 shrink-0 w-16 sm:w-20 text-center">
              <StepDot state={state} />
              <span
                className={cn(
                  "text-2xs sm:text-xs font-semibold leading-tight",
                  state === "upcoming" ? "text-ink-400" : "text-ink-900"
                )}
              >
                {step.label}
              </span>
            </div>
            {!last && (
              <span
                aria-hidden
                className={cn("h-0.5 flex-1 rounded-full mt-3.5 -mx-2 sm:-mx-1.5", states[i + 1] !== "upcoming" ? "bg-brand-500" : "bg-ink-200")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ state }: { state: LifecycleState }) {
  if (state === "done") {
    return (
      <span className="size-7 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0" aria-hidden>
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative size-7 rounded-full bg-white border-2 border-brand-600 flex items-center justify-center shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-brand-400/30 animate-ping" />
        <span className="size-2.5 rounded-full bg-brand-600" />
      </span>
    );
  }
  return <span className="size-7 rounded-full bg-white border-2 border-ink-200 shrink-0" aria-hidden />;
}
