"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyFeed } from "@/components/daily-feed";
import { AddLessonDialog } from "@/components/add-lesson-dialog";
import { AddEventDialog } from "@/components/personal-events";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(dateStr: string) {
  const today = todayStr();
  const tomorrow = shiftDate(today, 1);
  const yesterday = shiftDate(today, -1);

  if (dateStr === today) return "היום";
  if (dateStr === tomorrow) return "מחר";
  if (dateStr === yesterday) return "אתמול";

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DailyFeedWrapper() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [date, setDate] = useState(todayStr);
  const refresh = () => setRefreshKey((k) => k + 1);

  const isToday = date === todayStr();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">סיכום היום</h2>
        </div>
        <div className="flex items-center gap-2">
          <AddEventDialog onAdded={refresh} />
          <AddLessonDialog onAdded={refresh} />
        </div>
      </div>

      {/* Date navigation - RTL: right arrow = next day, left arrow = prev day */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-lg"
          onClick={() => setDate((d) => shiftDate(d, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <button
          onClick={() => !isToday && setDate(todayStr())}
          className="text-sm font-medium px-2"
        >
          {formatDayLabel(date)}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-lg"
          onClick={() => setDate((d) => shiftDate(d, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <DailyFeed key={`${date}-${refreshKey}`} date={date} />
    </div>
  );
}
