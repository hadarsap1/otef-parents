"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { WheelColumn } from "./wheel-column";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const userInteracted = useRef(false);

  const today = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, []);

  const [year, setYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0], 10);
    return today.year;
  });
  const [month, setMonth] = useState(() => {
    if (value) return parseInt(value.split("-")[1], 10) - 1;
    return today.month;
  });
  const [day, setDay] = useState(() => {
    if (value) return parseInt(value.split("-")[2], 10);
    return today.day;
  });

  // Sync from external value
  useEffect(() => {
    if (!value) return;
    const parts = value.split("-");
    if (parts.length === 3) {
      setYear(parseInt(parts[0], 10));
      setMonth(parseInt(parts[1], 10) - 1);
      setDay(parseInt(parts[2], 10));
    }
  }, [value]);

  // Generate years: current year -1 to +2, expanded to include value's year
  const years = useMemo(() => {
    const minYear = Math.min(today.year - 1, year);
    const maxYear = Math.max(today.year + 2, year);
    const arr: string[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      arr.push(String(y));
    }
    return arr;
  }, [today.year, year]);

  // Months 0-11
  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => String(i)),
  []);
  const monthLabels = HEBREW_MONTHS;

  // Days depend on year+month
  const daysInMonth = getDaysInMonth(year, month);
  const days = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
  [daysInMonth]);

  // Clamp day if month changes
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [daysInMonth, day]);

  // Reset interaction flag when picker opens
  useEffect(() => {
    if (open) {
      userInteracted.current = false;
    }
  }, [open]);

  // Call onChange when values change while open, but only after user interaction
  useEffect(() => {
    if (open && userInteracted.current) {
      const clampedDay = Math.min(day, daysInMonth);
      const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
      onChange(formatted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  const displayValue = formatDisplayDate(value);

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
        <span className="font-medium">
          {displayValue || "בחירת תאריך"}
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
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
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
                {label || "בחירת תאריך"}
              </span>
            </div>

            {/* Wheels */}
            <div className="flex items-center justify-center gap-1 px-4 py-4" dir="rtl">
              <div className="flex-[1.2]">
                <WheelColumn
                  items={days}
                  selected={String(Math.min(day, daysInMonth))}
                  onSelect={(v) => { userInteracted.current = true; setDay(parseInt(v, 10)); }}
                />
              </div>
              <div className="flex-[2]">
                <WheelColumn
                  items={months}
                  labels={monthLabels}
                  selected={String(month)}
                  onSelect={(v) => { userInteracted.current = true; setMonth(parseInt(v, 10)); }}
                />
              </div>
              <div className="flex-[1.5]">
                <WheelColumn
                  items={years}
                  selected={String(year)}
                  onSelect={(v) => { userInteracted.current = true; setYear(parseInt(v, 10)); }}
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
