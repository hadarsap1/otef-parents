"use client";

import { useState } from "react";
import { Calendar, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddToCalendarButtonProps {
  type: "personal" | "lesson" | "playdate";
  id: string;
  className?: string;
  compact?: boolean;
}

export function AddToCalendarButton({
  type,
  id,
  className,
  compact = false,
}: AddToCalendarButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handleClick() {
    if (status === "loading" || status === "done") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }

      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      title="הוסף ליומן Google"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium transition-colors",
        "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        status === "done" && "border-green-500/30 text-green-600 bg-green-50",
        status === "error" && "border-red-500/30 text-red-600 bg-red-50",
        className
      )}
    >
      {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === "done" && <Check className="h-3.5 w-3.5" />}
      {status === "idle" && <Calendar className="h-3.5 w-3.5" />}
      {status === "error" && <Calendar className="h-3.5 w-3.5" />}
      {!compact && (
        <span>
          {status === "done"
            ? "נוסף!"
            : status === "error"
              ? "שגיאה"
              : "ליומן"}
        </span>
      )}
    </button>
  );
}
