"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WheelColumn } from "./wheel-column";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

export function TimePicker({
  value,
  onChange,
  label,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const userInteracted = useRef(false);
  const [hour, setHour] = useState(() => (value || "08:00").split(":")[0]);
  const [minute, setMinute] = useState(() => {
    const m = parseInt((value || "08:00").split(":")[1] || "0", 10);
    // Snap to nearest 5
    const snapped = Math.round(m / 5) * 5;
    return String(snapped % 60).padStart(2, "0");
  });

  // Sync from external value changes
  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(":");
    if (h && HOURS.includes(h)) setHour(h);
    if (m) {
      const snapped = Math.round(parseInt(m, 10) / 5) * 5;
      setMinute(String(snapped % 60).padStart(2, "0"));
    }
  }, [value]);

  const displayValue = value ? `${hour}:${minute}` : "";

  // Reset interaction flag when picker opens
  useEffect(() => {
    if (open) {
      userInteracted.current = false;
    }
  }, [open]);

  // Call onChange when hour or minute changes, but only after user interaction
  useEffect(() => {
    if (open && userInteracted.current) {
      onChange(`${hour}:${minute}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-between w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm transition-colors",
          "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !displayValue && "text-muted-foreground",
          className
        )}
        style={{ height: "2.75rem" }}
      >
        <span dir="ltr" className="font-medium tabular-nums">
          {displayValue || "-:-"}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-center px-4 py-3 border-b border-border/50">
              <span className="text-sm font-semibold">
                {label || "בחירת שעה"}
              </span>
            </div>

            {/* Wheels */}
            <div className="flex items-center justify-center gap-2 px-8 py-4" dir="ltr">
              <div className="flex-1">
                <WheelColumn
                  items={HOURS}
                  selected={hour}
                  onSelect={(v) => { userInteracted.current = true; setHour(v); }}
                />
              </div>
              <div className="text-2xl font-bold text-muted-foreground pb-1">
                :
              </div>
              <div className="flex-1">
                <WheelColumn
                  items={MINUTES}
                  selected={minute}
                  onSelect={(v) => { userInteracted.current = true; setMinute(v); }}
                />
              </div>
            </div>

            {/* Close button */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
