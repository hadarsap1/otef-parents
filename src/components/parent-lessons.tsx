"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronDown, ChevronUp, Video, SplitSquareHorizontal, Repeat, Check, Loader2 as Loader, AlertTriangle, Sparkles } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";
import { cn } from "@/lib/utils";

interface SubGroup {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number | null;
  members: { child: { id: string; name: string } }[];
}

interface ChildInfo {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  zoomLink: string | null;
  notes: string | null;
  recurrence: string;
  hasSubGroups: boolean;
  subGroupMode?: string;
  isEnrichment?: boolean;
  teacher: { name: string | null };
  group: { id: string; name: string } | null;
  subGroups?: SubGroup[];
}

function formatDateHe(dateVal: string | Date) {
  const d = new Date(dateVal);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[d.getDay()];
  return `יום ${dayName}, ${d.getDate()}/${d.getMonth() + 1}`;
}

function TimeslotPicker({
  lesson,
  children,
}: {
  lesson: Lesson;
  children: ChildInfo[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");

  if (!lesson.subGroups || children.length === 0) return null;

  // Find which slot the selected child is in
  const childSlot = lesson.subGroups.find((sg) =>
    sg.members.some((m) => m.child.id === selectedChildId)
  );

  async function handleJoin(lessonGroupId: string) {
    setLoading(lessonGroupId);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChildId, lessonGroupId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const messages: Record<string, string> = {
          "Slot is full": "המשבצת מלאה. נסו משבצת אחרת.",
          "Child not found": "ילד/ה לא נמצא/ה",
          "Slot not found": "משבצת לא נמצאה",
        };
        setError(messages[data?.error] ?? "שגיאה. נסו שוב.");
        return;
      }
      router.refresh();
    } catch {
      setError("שגיאת רשת. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(null);
    }
  }

  async function handleLeave() {
    setLoading("leave");
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/join`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChildId }),
      });
      if (!res.ok) {
        setError("שגיאה בביטול הרשמה. נסו שוב.");
        return;
      }
      router.refresh();
    } catch {
      setError("שגיאת רשת. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Child selector for multi-child parents */}
      {children.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">בחרו ילד/ה:</p>
          <div className="flex flex-wrap gap-1.5">
            {children.map((child) => {
              const isInAnySlot = lesson.subGroups?.some((sg) =>
                sg.members.some((m) => m.child.id === child.id)
              );
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => { setSelectedChildId(child.id); setError(null); }}
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg border transition-colors min-h-[44px]",
                    selectedChildId === child.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {child.name}
                  {isInAnySlot && <Check className="h-3 w-3 inline-block ms-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {children.length === 1 ? `בחרו משבצת זמן ל${children[0].name}:` : `בחרו משבצת זמן:`}
      </p>
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="בחירת משבצת זמן">
        {lesson.subGroups.map((sg) => {
          const memberCount = sg.members.length;
          const isFull = sg.maxCapacity != null && memberCount >= sg.maxCapacity;
          const isSelected = childSlot?.id === sg.id;

          return (
            <button
              key={sg.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${sg.startTime}-${sg.endTime}, ${isSelected ? "נבחר" : isFull ? "מלא" : `${memberCount} מתוך ${sg.maxCapacity ?? "∞"} רשומים`}`}
              disabled={loading !== null || (isFull && !isSelected)}
              onClick={() => isSelected ? handleLeave() : handleJoin(sg.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors min-h-[44px]",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : isFull
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/50"
              )}
            >
              <span className="font-medium" dir="ltr">{sg.startTime}-{sg.endTime}</span>
              <span className="text-xs">
                {loading === sg.id || (loading === "leave" && isSelected) ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : isSelected ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isFull ? (
                  "מלא"
                ) : (
                  `${memberCount}/${sg.maxCapacity ?? "∞"}`
                )}
              </span>
            </button>
          );
        })}
      </div>

      {childSlot && (
        <p className="text-xs text-primary" dir="ltr">
          {children.length > 1
            ? `${children.find((c) => c.id === selectedChildId)?.name}: ${childSlot.startTime}-${childSlot.endTime}`
            : `נרשמתם ל-${childSlot.startTime}-${childSlot.endTime}`}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

export function ParentLessons({
  initialLessons,
  childIds,
  children,
}: {
  initialLessons: Lesson[];
  childIds?: string[];
  children?: ChildInfo[];
}) {
  const [expanded, setExpanded] = useState(true);

  if (initialLessons.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="אין שיעורים"
        description="כרגע אין שיעורים מתוכננים לילדים שלך"
      />
    );
  }

  // Build children list from childIds if not provided
  const childrenList = children ?? (childIds ?? []).map((id) => ({ id, name: "" }));

  return (
    <div className="space-y-3">
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader
          className="bg-gradient-to-l from-primary/5 to-transparent pb-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setExpanded(!expanded);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">שיעורים</CardTitle>
              <CardDescription className="text-sm">
                {initialLessons.length} שיעורים קרובים
              </CardDescription>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expanded && (
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {initialLessons.map((lesson) => {
                const isTimeslots = lesson.hasSubGroups && lesson.subGroupMode === "TIMESLOTS";

                // For MANUAL sub-groups, find which sub-group the child is in
                let displayTime = { start: lesson.startTime, end: lesson.endTime };
                let subGroupName: string | null = null;

                if (lesson.hasSubGroups && lesson.subGroupMode !== "TIMESLOTS" && lesson.subGroups && childIds) {
                  const childSubGroup = lesson.subGroups.find((sg) =>
                    sg.members.some((m) => childIds.includes(m.child.id))
                  );
                  if (childSubGroup) {
                    displayTime = { start: childSubGroup.startTime, end: childSubGroup.endTime };
                    subGroupName = childSubGroup.name;
                  }
                }

                // For TIMESLOTS, check if child already picked a slot
                if (isTimeslots && lesson.subGroups && childIds) {
                  const childSlot = lesson.subGroups.find((sg) =>
                    sg.members.some((m) => childIds.includes(m.child.id))
                  );
                  if (childSlot) {
                    displayTime = { start: childSlot.startTime, end: childSlot.endTime };
                  }
                }

                return (
                  <div
                    key={lesson.id}
                    className="px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatDateHe(lesson.date)}
                        </span>
                        <span className="text-sm font-semibold" dir="ltr">
                          {displayTime.start}
                        </span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {displayTime.end}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={lesson.title}>{lesson.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lesson.group?.name ?? "שיעור"}
                          {lesson.isEnrichment && (
                            <span className="ms-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-3 w-3" />
                              העשרה
                            </span>
                          )}
                          {lesson.recurrence !== "ONCE" && (
                            <span className="ms-1 inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                              <Repeat className="h-3 w-3" />
                              {lesson.recurrence === "WEEKLY" ? "שבועי" : "יומי"}
                            </span>
                          )}
                          {subGroupName && (
                            <span className="ms-1 text-primary">
                              · {subGroupName}
                            </span>
                          )}
                          {isTimeslots && !lesson.subGroups?.some((sg) => sg.members.some((m) => childIds?.includes(m.child.id))) && (
                            <span className="ms-1 text-amber-600">
                              · טרם נבחרה משבצת
                            </span>
                          )}
                        </p>
                        {lesson.teacher.name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {lesson.teacher.name}
                          </p>
                        )}
                        {lesson.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate" title={lesson.notes}>
                            {lesson.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {lesson.zoomLink && (
                          <a
                            href={lesson.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                            title="קישור לזום"
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </a>
                        )}
                        <AddToCalendarButton type="teacher-lesson" id={lesson.id} compact />
                      </div>
                    </div>

                    {/* Timeslot picker for parents */}
                    {isTimeslots && childrenList.length > 0 && (
                      <TimeslotPicker lesson={lesson} children={childrenList} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
