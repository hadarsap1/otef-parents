"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export { ITEM_HEIGHT, VISIBLE_ITEMS, PICKER_HEIGHT };

export function WheelColumn({
  items,
  labels,
  selected,
  onSelect,
}: {
  items: string[];
  labels?: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasMounted = useRef(false);

  const selectedIndex = Math.max(0, items.indexOf(selected));

  // Scroll to selected on mount and when selected changes externally
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolling.current) return;
    const target = selectedIndex * ITEM_HEIGHT;
    if (!hasMounted.current) {
      // First render - instant position without animation
      el.scrollTop = target;
      hasMounted.current = true;
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

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rawIndex = el.scrollTop / ITEM_HEIGHT;
    const index = Math.round(rawIndex);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const targetTop = clamped * ITEM_HEIGHT;
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
      {/* Selection highlight */}
      <div
        className="absolute inset-x-1 pointer-events-none z-10 rounded-xl bg-primary/8 border border-primary/20"
        style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
      />
      {/* Fade edges */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white dark:from-background via-white/80 dark:via-background/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-background via-white/80 dark:via-background/80 to-transparent z-20 pointer-events-none" />

      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
      >
        <div style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item, i) => (
          <div
            key={item}
            className={cn(
              "flex items-center justify-center transition-all duration-150 cursor-pointer select-none",
              item === selected
                ? "text-foreground font-bold text-lg"
                : "text-muted-foreground/60 text-sm"
            )}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => {
              onSelect(item);
              const el = containerRef.current;
              if (el) {
                el.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
              }
            }}
          >
            {labels ? labels[i] : item}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
}
