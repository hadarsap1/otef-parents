"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

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

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function WheelColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedIndex = items.indexOf(selected);

  // Scroll to selected on mount and when selected changes externally
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolling.current) return;
    const target = selectedIndex * ITEM_HEIGHT;
    // Use instant scroll on first render so items are positioned correctly,
    // then smooth for subsequent changes
    const isInitial = el.scrollTop === 0 && selectedIndex === 0;
    if (isInitial) {
      // Force a layout recalc then set position
      el.scrollTop = 0;
    } else {
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Ensure correct position after mount (handles cases where layout isn't ready)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      if (!isScrolling.current) {
        el.scrollTo({ top: selectedIndex * ITEM_HEIGHT, behavior: "instant" as ScrollBehavior });
      }
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Use floor + 0.5 rounding to ensure index 0 is reachable even with small scrollTop values
    const rawIndex = el.scrollTop / ITEM_HEIGHT;
    const index = Math.round(rawIndex);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const targetTop = clamped * ITEM_HEIGHT;
    // Only scroll if not already at the target (avoids infinite scroll events)
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      el.scrollTo({ top: targetTop, behavior: "smooth" });
    }
    if (items[clamped] !== selected) {
      onSelect(items[clamped]);
    }
    isScrolling.current = false;
  }, [items, selected, onSelect]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(snapToNearest, 80);
  }, [snapToNearest]);

  return (
    <div className="relative" style={{ height: PICKER_HEIGHT }}>
      {/* Highlight bar */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 border-y border-primary/30 bg-primary/5 rounded-lg"
        style={{
          top: ITEM_HEIGHT * 2,
          height: ITEM_HEIGHT,
        }}
      />
      {/* Fade top */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white dark:from-background to-transparent z-20 pointer-events-none" />
      {/* Fade bottom */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-background to-transparent z-20 pointer-events-none" />

      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide overscroll-contain"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
      >
        {/* Top padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "flex items-center justify-center transition-all duration-150 cursor-pointer select-none",
              item === selected
                ? "text-primary font-bold text-xl"
                : "text-muted-foreground text-base"
            )}
            style={{
              height: ITEM_HEIGHT,
            }}
            onClick={() => {
              onSelect(item);
              const el = containerRef.current;
              if (el) {
                const idx = items.indexOf(item);
                el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
              }
            }}
          >
            {item}
          </div>
        ))}
        {/* Bottom padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  label,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
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

  const handleConfirm = () => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
  };

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
          {displayValue || "—:—"}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ביטול
              </button>
              <span className="text-sm font-semibold">
                {label || "בחירת שעה"}
              </span>
              <button
                type="button"
                onClick={handleConfirm}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                אישור
              </button>
            </div>

            {/* Wheels */}
            <div className="flex items-center justify-center gap-2 px-8 py-4" dir="ltr">
              <div className="flex-1">
                <WheelColumn
                  items={HOURS}
                  selected={hour}
                  onSelect={setHour}
                />
              </div>
              <div className="text-2xl font-bold text-muted-foreground pb-1">
                :
              </div>
              <div className="flex-1">
                <WheelColumn
                  items={MINUTES}
                  selected={minute}
                  onSelect={setMinute}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
