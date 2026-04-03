"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  BookOpen,
  MapPin,
  Clock,
  Users,
  PartyPopper,
  CalendarDays,
  Sparkles,
  Trash2,
  Pencil,
  Loader2 as Loader,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { formatTime, formatDateRelative } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonalEventRow } from "@/components/personal-events";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

interface Lesson {
  type: "lesson";
  id: string;
  childName: string;
  childId: string;
  subject: string;
  startTime: string;
  endTime: string;
  zoomUrl: string | null;
  notes: string | null;
  isPast?: boolean;
}

interface PlaydateItem {
  type: "playdate";
  id: string;
  hostName: string | null;
  hostId: string;
  groupName: string;
  address: string;
  dateTime: string;
  endTime: string | null;
  maxCapacity: number;
  status: "OPEN" | "FULL";
  notes: string | null;
  participantCount: number;
  participantNames: string[];
}

interface PersonalEventItem {
  type: "personal";
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  emoji: string | null;
}

interface TeacherLessonItem {
  type: "teacher-lesson";
  id: string;
  title: string;
  groupName: string;
  teacherName: string | null;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  zoomLink: string | null;
  notes: string | null;
  subGroupName: string | null;
  isPast?: boolean;
}

interface FeedData {
  children: { id: string; name: string; grade: string | null }[];
  lessons: Lesson[];
  teacherLessons: TeacherLessonItem[];
  playdates: PlaydateItem[];
  personalEvents: PersonalEventItem[];
}

function isHappeningNow(start: string, end: string) {
  const now = Date.now();
  return now >= new Date(start).getTime() && now <= new Date(end).getTime();
}


function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function LessonRow({
  item,
  isLast,
  onDelete,
  onUpdate,
}: {
  item: Lesson;
  isLast: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (updated: Lesson) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState(item.subject);
  const [date, setDate] = useState(
    new Date(item.startTime).toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(
    new Date(item.startTime).toTimeString().slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    new Date(item.endTime).toTimeString().slice(0, 5)
  );
  const [zoomUrl, setZoomUrl] = useState(item.zoomUrl || "");

  const live = isHappeningNow(item.startTime, item.endTime);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/schedule/${item.id}`, { method: "DELETE" });
    onDelete?.(item.id);
  }

  async function handleSave() {
    if (!subject.trim() || !startTime || !endTime) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          startTime: new Date(`${date}T${startTime}`).toISOString(),
          endTime: new Date(`${date}T${endTime}`).toISOString(),
          zoomUrl: zoomUrl.trim() || null,
        }),
      });
      if (res.ok) {
        onUpdate?.({
          ...item,
          subject: subject.trim(),
          startTime: new Date(`${date}T${startTime}`).toISOString(),
          endTime: new Date(`${date}T${endTime}`).toISOString(),
          zoomUrl: zoomUrl.trim() || null,
        });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div
        className={cn("py-3 space-y-3", !isLast && "border-b border-dashed")}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSubject(item.subject);
            setDate(new Date(item.startTime).toISOString().split("T")[0]);
            setStartTime(new Date(item.startTime).toTimeString().slice(0, 5));
            setEndTime(new Date(item.endTime).toTimeString().slice(0, 5));
            setZoomUrl(item.zoomUrl || "");
            setEditing(false);
          }
        }}
      >
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="מקצוע"
          className="rounded-xl h-10"
        />
        <DatePicker
          value={date}
          onChange={setDate}
          label="תאריך"
          className="rounded-xl"
        />
        <div className="grid grid-cols-2 gap-2">
          <TimePicker
            value={startTime}
            onChange={setStartTime}
            label="שעת התחלה"
            className="rounded-xl"
          />
          <TimePicker
            value={endTime}
            onChange={setEndTime}
            label="שעת סיום"
            className="rounded-xl"
          />
        </div>
        <Input
          value={zoomUrl}
          onChange={(e) => setZoomUrl(e.target.value)}
          placeholder="לינק לזום (אופציונלי)"
          dir="ltr"
          className="rounded-xl h-10"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !subject.trim()}
            className="rounded-xl"
          >
            {saving ? "שומר..." : "שמירה"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSubject(item.subject);
              setDate(new Date(item.startTime).toISOString().split("T")[0]);
              setStartTime(new Date(item.startTime).toTimeString().slice(0, 5));
              setEndTime(new Date(item.endTime).toTimeString().slice(0, 5));
              setZoomUrl(item.zoomUrl || "");
              setEditing(false);
            }}
            className="rounded-xl"
          >
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex gap-3 py-3",
        !isLast && "border-b border-dashed"
      )}
    >
      {/* Time column */}
      <div className="flex flex-col items-center shrink-0 w-14 text-xs">
        <span className={cn("font-medium", live && "text-primary")}>
          {formatTime(item.startTime)}
        </span>
        <span className="text-muted-foreground">
          {formatTime(item.endTime)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {live && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <p
            className={cn(
              "font-medium text-sm truncate",
              live && "text-primary"
            )}
            title={item.subject}
          >
            {item.subject}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            ({item.childName})
          </span>
        </div>

        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.notes}
          </p>
        )}

        {item.zoomUrl && (
          <Button
              size="lg"
              render={<a href={item.zoomUrl} target="_blank" rel="noopener noreferrer" />}
              className={cn(
                "mt-2 w-full text-base font-medium",
                live
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              )}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Video className="h-5 w-5" />
              {live ? "הצטרף עכשיו" : "לינק לשיעור"}
            </Button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 shrink-0">
        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <AddToCalendarButton type="lesson" id={item.id} compact />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-lg hover:bg-muted"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditing(true); }}
          aria-label="עריכת שיעור"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-lg hover:bg-destructive/10"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
          disabled={deleting}
          aria-label="מחיקת שיעור"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
        >
          <div
            className="bg-background rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">מחיקת שיעור</h3>
            <p className="text-sm text-muted-foreground">האם למחוק את השיעור? הפעולה לא ניתנת לביטול.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors min-h-[44px]"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}
                className="px-4 py-2 text-sm rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[44px]"
              >
                מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Render text with clickable links */
function FeedTextWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s,]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("http://") && !part.startsWith("https://"))
          return <span key={i}>{part}</span>;
        let label = part;
        try {
          label = new URL(part).hostname.replace(/^www\./, "");
        } catch {
          // malformed URL — fall back to raw text
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline break-all inline-flex items-center gap-0.5"
          >
            {label}
          </a>
        );
      })}
    </>
  );
}

function TeacherLessonRow({ item }: { item: TeacherLessonItem }) {
  const [open, setOpen] = useState(false);
  const hasDetails = item.notes || item.zoomLink;

  return (
    <div
      className={cn(
        "relative py-3 rounded-lg -mx-1 px-1",
        hasDetails && "cursor-pointer active:bg-muted/30 transition-colors"
      )}
      onClick={() => hasDetails && setOpen(!open)}
      role={hasDetails ? "button" : undefined}
      tabIndex={hasDetails ? 0 : undefined}
      onKeyDown={hasDetails ? (e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); } : undefined}
    >
      <div className="flex gap-3">
        {/* Time column */}
        <div className="flex flex-col items-center shrink-0 w-14 text-xs">
          <span className="font-medium">{item.startTime}</span>
          <span className="text-muted-foreground">{item.endTime}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn("font-medium text-sm", !open && "truncate")} title={item.title}>{item.title}</p>
            <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">מהמורה</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.groupName}
            {item.subGroupName && <span className="ms-1 text-primary">· {item.subGroupName}</span>}
            {item.teacherName && <span className="ms-1">· {item.teacherName}</span>}
          </p>

          {!open && item.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!open && (
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <AddToCalendarButton type="teacher-lesson" id={item.id} compact />
            </div>
          )}
          {hasDetails && (
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              open && "rotate-180"
            )} />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="mt-3 ms-[68px] space-y-3">
          {item.notes && (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              <FeedTextWithLinks text={item.notes} />
            </div>
          )}

          {item.zoomLink && (
            <Button
              size="lg"
              render={<a href={item.zoomLink} target="_blank" rel="noopener noreferrer" />}
              className="w-full text-base font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Video className="h-5 w-5" />
              הצטרפות לזום
            </Button>
          )}

          <div className="flex items-center gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <AddToCalendarButton type="teacher-lesson" id={item.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function PlaydateRow({ item }: { item: PlaydateItem }) {
  const today = isToday(item.dateTime);
  const spotsLeft = item.maxCapacity - item.participantCount;

  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center gap-2">
        <PartyPopper
          className={cn(
            "h-4 w-4 shrink-0",
            today ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            מפגש אצל {item.hostName ?? "מארח"}
          </p>
          <p className="text-xs text-muted-foreground">{item.groupName}</p>
        </div>
        <StatusBadge variant={item.status === "OPEN" ? "success" : "warning"}>
          {item.status === "OPEN"
            ? `פתוח (${spotsLeft} מקומות)`
            : "מלא"}
        </StatusBadge>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground ms-6">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>
            {formatDateRelative(item.dateTime)} · {formatTime(item.dateTime)}
            {item.endTime && ` - ${item.endTime}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{item.address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {item.participantCount}/{item.maxCapacity} ילדים
            {item.participantNames.length > 0 &&
              ` (${item.participantNames.join(", ")})`}
          </span>
        </div>
      </div>

      <div className="ms-6">
        <AddToCalendarButton type="playdate" id={item.id} />
      </div>

      {item.notes && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 ms-6">
          {item.notes}
        </p>
      )}
    </div>
  );
}

export function DailyFeed({ date }: { date?: string }) {
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPastLessons, setShowPastLessons] = useState(false);

  const dateStr = date || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/dashboard/feed?date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [dateStr]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/dashboard/feed?date=${dateStr}`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [dateStr]);

  // Re-fetch when tab becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetch(`/api/dashboard/feed?date=${dateStr}`)
          .then((r) => r.json())
          .then((d) => setData(d))
          .catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [dateStr]);

  function handleDeleteEvent(id: string) {
    if (!data) return;
    setData({
      ...data,
      personalEvents: data.personalEvents.filter((e) => e.id !== id),
    });
  }

  function handleUpdateEvent(updated: { id: string; title: string; startTime: string | null; endTime: string | null; notes: string | null; emoji: string | null }) {
    if (!data) return;
    setData({
      ...data,
      personalEvents: data.personalEvents.map((e) =>
        e.id === updated.id ? { ...e, ...updated } : e
      ),
    });
  }

  function handleDeleteLesson(id: string) {
    if (!data) return;
    setData({
      ...data,
      lessons: data.lessons.filter((l) => l.id !== id),
    });
  }

  function handleUpdateLesson(updated: Lesson) {
    if (!data) return;
    setData({
      ...data,
      lessons: data.lessons.map((l) => (l.id === updated.id ? updated : l)),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4" role="status" aria-busy="true">
        <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">טוען...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">שגיאה בטעינת הנתונים.</p>
          <button
            onClick={loadFeed}
            className="text-sm text-primary mt-2 hover:underline"
          >
            נסה שוב
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={BookOpen}
        title="עוד לא הוספת ילדים."
        description={'לחץ על "ילדים" בתפריט כדי להוסיף.'}
      />
    );
  }

  const upcomingLessons = data.lessons.filter((l) => !l.isPast);
  const pastLessons = data.lessons.filter((l) => l.isPast);
  const upcomingTeacherLessons = (data.teacherLessons ?? []).filter((l) => !l.isPast);
  const pastTeacherLessons = (data.teacherLessons ?? []).filter((l) => l.isPast);
  const hasUpcomingLessons = upcomingLessons.length > 0 || upcomingTeacherLessons.length > 0;
  const hasPastLessons = pastLessons.length > 0 || pastTeacherLessons.length > 0;
  const hasLessons = data.lessons.length > 0;
  const hasTeacherLessons = (data.teacherLessons?.length ?? 0) > 0;
  const hasAnyLessons = hasLessons || hasTeacherLessons;
  const hasPlaydates = data.playdates.length > 0;
  const hasPersonalEvents = (data.personalEvents?.length ?? 0) > 0;
  const todayPlaydates = data.playdates.filter((pd) => isToday(pd.dateTime));
  const upcomingPlaydates = data.playdates.filter(
    (pd) => !isToday(pd.dateTime)
  );

  return (
    <div className="space-y-4">
      {/* Personal events */}
      {hasPersonalEvents && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">אירועים</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {data.personalEvents.map((event, i) => (
                <div
                  key={event.id}
                  className={cn(
                    i < data.personalEvents.length - 1 &&
                      "border-b border-dashed"
                  )}
                >
                  <PersonalEventRow
                    event={event}
                    onDelete={handleDeleteEvent}
                    onUpdate={handleUpdateEvent}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's lessons */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">שיעורים היום</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {hasUpcomingLessons ? (
            <div className="space-y-0">
              {upcomingTeacherLessons.map((item, i) => (
                <div
                  key={`tl-${item.id}`}
                  className={cn(
                    (i < upcomingTeacherLessons.length - 1 || upcomingLessons.length > 0) &&
                      "border-b border-dashed"
                  )}
                >
                  <TeacherLessonRow item={item} />
                </div>
              ))}
              {upcomingLessons.map((item, i) => (
                <LessonRow
                  key={item.id}
                  item={item}
                  isLast={i === upcomingLessons.length - 1}
                  onDelete={handleDeleteLesson}
                  onUpdate={handleUpdateLesson}
                />
              ))}
            </div>
          ) : !hasPastLessons ? (
            <p className="text-sm text-muted-foreground py-2">
              אין שיעורים היום.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              כל השיעורים של היום הסתיימו.
            </p>
          )}

          {/* Past lessons - collapsible */}
          {hasPastLessons && (
            <div className={cn(hasUpcomingLessons && "mt-3 pt-3 border-t border-border/40")}>
              <button
                type="button"
                onClick={() => setShowPastLessons(!showPastLessons)}
                className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <span>שיעורים שהסתיימו ({pastTeacherLessons.length + pastLessons.length})</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showPastLessons && "rotate-180")} />
              </button>
              {showPastLessons && (
                <div className="space-y-0 opacity-60 mt-1">
                  {pastTeacherLessons.map((item, i) => (
                    <div
                      key={`tl-past-${item.id}`}
                      className={cn(
                        (i < pastTeacherLessons.length - 1 || pastLessons.length > 0) &&
                          "border-b border-dashed"
                      )}
                    >
                      <TeacherLessonRow item={item} />
                    </div>
                  ))}
                  {pastLessons.map((item, i) => (
                    <LessonRow
                      key={item.id}
                      item={item}
                      isLast={i === pastLessons.length - 1}
                      onDelete={handleDeleteLesson}
                      onUpdate={handleUpdateLesson}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's playdates */}
      {todayPlaydates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">מפגשים היום</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {todayPlaydates.map((pd, i) => (
              <div
                key={pd.id}
                className={cn(
                  i < todayPlaydates.length - 1 && "border-b border-dashed"
                )}
              >
                <PlaydateRow item={pd} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming playdates */}
      {upcomingPlaydates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">מפגשים קרובים</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingPlaydates.map((pd, i) => (
              <div
                key={pd.id}
                className={cn(
                  i < upcomingPlaydates.length - 1 && "border-b border-dashed"
                )}
              >
                <PlaydateRow item={pd} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state if nothing */}
      {!hasPlaydates && !hasAnyLessons && !hasPersonalEvents && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-sm">אין אירועים מתוכננים.</p>
            <p className="text-xs mt-1">
              הוסף שיעורים או הצטרף למפגשים כדי לראות אותם כאן.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
