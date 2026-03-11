"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Users, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DAYS_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

const POLL_INTERVAL = 15_000;

interface Lesson {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  maxKids: number;
  teacher: { name: string | null };
  group: { id: string; name: string } | null;
  _count: { registrations: number };
  registrations: { childId: string }[];
}

interface Child {
  id: string;
  name: string;
}

/** Group lessons by title+day */
function groupLessons(lessons: Lesson[]) {
  const map = new Map<string, Lesson[]>();
  for (const l of lessons) {
    const key = `${l.title}::${l.day}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(l);
  }
  return Array.from(map.entries()).map(([, slots]) => ({
    title: slots[0].title,
    day: slots[0].day,
    teacher: slots[0].teacher,
    slots: slots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export function ParentLessons({
  initialLessons,
  children,
}: {
  initialLessons: Lesson[];
  children: Child[];
}) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch("/api/lessons");
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      }
    } catch {
      // silently ignore — will retry on next poll
    }
  }, []);

  // Auto-poll every 15 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchLessons, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchLessons]);

  // Refresh when tab becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchLessons();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchLessons]);

  const grouped = groupLessons(lessons);

  function openRegister(slot: Lesson) {
    setSelectedSlot(slot);
    setRegisterOpen(true);
  }

  async function handleRegister(childId: string) {
    if (!selectedSlot) return;
    setLoading(childId);
    try {
      const res = await fetch(
        `/api/lessons/${selectedSlot.id}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        }
      );
      if (res.ok) {
        setRegisterOpen(false);
        setSelectedSlot(null);
        await fetchLessons();
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleUnregister(lessonId: string, childId: string) {
    setLoading(childId);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/register`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      if (res.ok) {
        await fetchLessons();
      }
    } finally {
      setLoading(null);
    }
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="אין שיעורים זמינים"
        description="כרגע אין שיעורים פתוחים לרישום"
      />
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ title, day, teacher, slots }) => (
        <Card key={`${title}-${day}`} className="shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent pb-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm">
              יום {DAYS_HE[day]}
              {teacher.name && ` · ${teacher.name}`}
              {` · ${slots.length} קבוצות`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {slots.map((slot, idx) => {
                const isFull =
                  slot._count.registrations >= slot.maxKids;
                const registeredChildIds = slot.registrations.map(
                  (r) => r.childId
                );
                const myRegistered = children.filter((c) =>
                  registeredChildIds.includes(c.id)
                );
                const canRegister = children.some(
                  (c) => !registeredChildIds.includes(c.id)
                );
                const fillPercent = Math.round(
                  (slot._count.registrations / slot.maxKids) * 100
                );

                return (
                  <div
                    key={slot.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer active:bg-muted/50 ${
                      myRegistered.length > 0
                        ? "bg-emerald-50/60 dark:bg-emerald-950/10"
                        : isFull
                          ? "bg-rose-50/40 dark:bg-rose-950/10"
                          : ""
                    }`}
                    onClick={() => {
                      if (!isFull && canRegister) openRegister(slot);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isFull && canRegister) openRegister(slot);
                    }}
                  >
                    {/* Numbered circle */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm ${
                          myRegistered.length > 0
                            ? "bg-emerald-500"
                            : isFull
                              ? "bg-rose-400"
                              : "bg-primary"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {slot.startTime}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Capacity bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-medium">
                              {slot._count.registrations}/{slot.maxKids}
                            </span>
                          </div>
                          {isFull && (
                            <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-full">
                              מלא
                            </span>
                          )}
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFull
                                ? "bg-rose-400"
                                : fillPercent > 60
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Show my registered children */}
                      {myRegistered.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between rounded-xl bg-emerald-100/80 dark:bg-emerald-900/20 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            <span className="font-medium">{child.name} רשום/ה</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2.5 text-xs text-destructive hover:text-destructive rounded-lg"
                            disabled={loading === child.id}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleUnregister(slot.id, child.id);
                            }}
                          >
                            ביטול
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Register button */}
                    {children.length > 0 && !isFull && canRegister && (
                      <Button
                        size="sm"
                        className="shrink-0 min-h-[42px] rounded-xl shadow-sm font-medium"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); openRegister(slot); }}
                      >
                        <UserPlus className="h-4 w-4" data-icon="inline-start" />
                        רישום
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Register child dialog */}
      <Dialog
        open={registerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRegisterOpen(false);
            setSelectedSlot(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              רישום ל{selectedSlot?.title} — {selectedSlot?.startTime}
            </DialogTitle>
            <DialogDescription>
              בחרו ילד/ה לרישום לקבוצה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {children
              .filter(
                (c) =>
                  !selectedSlot?.registrations.some(
                    (r) => r.childId === c.id
                  )
              )
              .map((child) => (
                <Button
                  key={child.id}
                  variant="outline"
                  className="w-full justify-start rounded-xl h-12 text-base"
                  disabled={loading === child.id}
                  onClick={() => handleRegister(child.id)}
                >
                  <UserPlus className="h-4 w-4" data-icon="inline-start" />
                  {loading === child.id ? "רושם..." : child.name}
                </Button>
              ))}
            {children.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                עליכם להוסיף ילד/ה קודם בדף הילדים
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
