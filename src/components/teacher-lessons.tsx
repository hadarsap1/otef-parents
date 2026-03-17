"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Trash2, Video, Pencil, Users, Copy, SplitSquareHorizontal, Repeat, CalendarDays, AlertTriangle, Loader2 as Loader, Sparkles, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SchoolOption {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  schoolName?: string;
  members?: { child: { id: string; name: string } }[];
}

interface SubGroup {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxCapacity: number | null;
  members: { child: { id: string; name: string } }[];
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
  groupId: string | null;
  group: { id: string; name: string; school?: { name: string } | null; members?: { child: { id: string; name: string } }[] } | null;
  subGroups?: SubGroup[];
}

function formatDateHe(dateVal: string | Date) {
  const d = new Date(dateVal);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[d.getDay()];
  return `יום ${dayName}, ${d.getDate()}/${d.getMonth() + 1}`;
}

function isPast(dateVal: string | Date) {
  const d = new Date(dateVal);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

const RECURRENCE_OPTIONS = [
  { value: "ONCE", label: "חד פעמי", icon: CalendarDays },
  { value: "WEEKLY", label: "שבועי", icon: Repeat },
  { value: "DAILY", label: "יומי", icon: Repeat },
] as const;

export function TeacherLessons({
  initialLessons,
  pastLessons = [],
  groups,
  schools = [],
}: {
  initialLessons: Lesson[];
  pastLessons?: Lesson[];
  groups: Group[];
  schools?: SchoolOption[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("13:30");
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [isEnrichment, setIsEnrichment] = useState(false);
  const [zoomLink, setZoomLink] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("ONCE");
  const [hasSubGroups, setHasSubGroups] = useState(false);
  const [subGroupMode, setSubGroupMode] = useState<"MANUAL" | "TIMESLOTS">("TIMESLOTS");
  const [subGroups, setSubGroups] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    maxCapacity: string;
    childIds: string[];
  }[]>([]);
  // Timeslot generator state
  const [slotRangeStart, setSlotRangeStart] = useState("13:00");
  const [slotRangeEnd, setSlotRangeEnd] = useState("16:00");
  const [slotInterval, setSlotInterval] = useState("30");
  const [slotCapacity, setSlotCapacity] = useState("1");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editZoomLink, setEditZoomLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRecurrence, setEditRecurrence] = useState("ONCE");

  // Sort lessons by date
  const sorted = [...initialLessons].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime)
  );

  function resetCreateForm() {
    setTitle("");
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setStartTime("13:00");
    setEndTime("13:30");
    setSchoolId(schools[0]?.id ?? "");
    setGroupIds([]);
    setIsEnrichment(false);
    setZoomLink("");
    setNotes("");
    setRecurrence("ONCE");
    setHasSubGroups(false);
    setSubGroupMode("TIMESLOTS");
    setSubGroups([]);
    setSlotRangeStart("13:00");
    setSlotRangeEnd("16:00");
    setSlotInterval("30");
    setSlotCapacity("1");
    setCreateError(null);
  }

  function addSubGroup() {
    setSubGroups((prev) => [
      ...prev,
      { name: `קבוצה ${prev.length + 1}`, startTime, endTime, maxCapacity: "", childIds: [] },
    ]);
  }

  function updateSubGroup(idx: number, field: string, value: unknown) {
    setSubGroups((prev) =>
      prev.map((sg, i) => (i === idx ? { ...sg, [field]: value } : sg))
    );
  }

  function removeSubGroup(idx: number) {
    setSubGroups((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleChildInSubGroup(sgIdx: number, childId: string) {
    setSubGroups((prev) =>
      prev.map((sg, i) => {
        if (i !== sgIdx) return sg;
        const ids = sg.childIds.includes(childId)
          ? sg.childIds.filter((id) => id !== childId)
          : [...sg.childIds, childId];
        return { ...sg, childIds: ids };
      })
    );
  }

  const [slotError, setSlotError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  function generateTimeslots() {
    const intervalMin = Number(slotInterval) || 30;
    const cap = slotCapacity;
    const [startH, startM] = slotRangeStart.split(":").map(Number);
    const [endH, endM] = slotRangeEnd.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) {
      setSlotError("שעת סיום חייבת להיות אחרי שעת התחלה");
      return;
    }
    if (intervalMin > endTotal - startTotal) {
      setSlotError("משך המשבצת גדול מטווח השעות");
      return;
    }
    if (intervalMin < 5) {
      setSlotError("משך משבצת מינימלי הוא 5 דקות");
      return;
    }

    setSlotError(null);
    const slots: typeof subGroups = [];
    let current = startTotal;
    let idx = 1;
    while (current + intervalMin <= endTotal) {
      const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
      const slotEnd = `${String(Math.floor((current + intervalMin) / 60)).padStart(2, "0")}:${String((current + intervalMin) % 60).padStart(2, "0")}`;
      slots.push({
        name: `משבצת ${idx}`,
        startTime: slotStart,
        endTime: slotEnd,
        maxCapacity: cap,
        childIds: [],
      });
      current += intervalMin;
      idx++;
    }
    setSubGroups(slots);
  }

  // Filter groups by selected school
  const selectedSchool = schools.find((s) => s.id === schoolId);
  const filteredGroups = schoolId
    ? groups.filter((g) => g.schoolName === selectedSchool?.name)
    : groups;

  // Get roster for first selected group (for manual sub-group assignment)
  const firstGroupId = groupIds[0] ?? "";
  const selectedGroup = groups.find((g) => g.id === firstGroupId);
  const roster = selectedGroup?.members?.map((m) => m.child) ?? [];

  // Find assigned children across all sub-groups
  const assignedChildIds = new Set(subGroups.flatMap((sg) => sg.childIds));
  const unassignedChildren = roster.filter((c) => !assignedChildIds.has(c.id));

  async function handleCreate() {
    if (!title.trim() || !date) return;
    setLoading(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        date,
        startTime,
        endTime,
        groupIds: groupIds.length > 0 ? groupIds : undefined,
        recurrence,
        isEnrichment,
        zoomLink: zoomLink.trim() || null,
        notes: notes.trim() || null,
      };
      if (hasSubGroups && subGroups.length > 0) {
        body.subGroupMode = subGroupMode;
        body.subGroups = subGroups.map((sg) => ({
          name: sg.name,
          startTime: sg.startTime,
          endTime: sg.endTime,
          maxCapacity: sg.maxCapacity ? Number(sg.maxCapacity) : null,
          childIds: sg.childIds,
        }));
      }
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetCreateForm();
        setCreateOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setCreateError(data?.error || "שגיאה ביצירת השיעור. נסו שוב.");
      }
    } catch {
      setCreateError("שגיאת רשת. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  }

  function openEdit(lesson: Lesson) {
    setEditSlot(lesson);
    setEditTitle(lesson.title);
    setEditDate(new Date(lesson.date).toISOString().split("T")[0]);
    setEditStartTime(lesson.startTime);
    setEditEndTime(lesson.endTime);
    setEditZoomLink(lesson.zoomLink ?? "");
    setEditNotes(lesson.notes ?? "");
    setEditRecurrence(lesson.recurrence ?? "ONCE");
    setEditError(null);
  }

  async function handleEdit() {
    if (!editSlot) return;
    setLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/lessons/${editSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          date: editDate,
          startTime: editStartTime,
          endTime: editEndTime,
          recurrence: editRecurrence,
          zoomLink: editZoomLink.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setEditSlot(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setEditError(data?.error || "שגיאה בעדכון השיעור. נסו שוב.");
      }
    } catch {
      setEditError("שגיאת רשת. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          {initialLessons.length > 0 ? `${initialLessons.length} שיעורים` : ""}
        </p>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
          <DialogTrigger
            render={
              <Button size="sm" className="rounded-xl shadow-sm font-medium">
                <Plus className="h-4 w-4" data-icon="inline-start" />
                שיעור חדש
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>שיעור חדש</DialogTitle>
              <DialogDescription>
                יצירת שיעור לתאריך מסוים. כל הילדים בכיתה יראו אותו.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[calc(100svh-180px)] overflow-y-auto -mx-1 px-1">
              <div className="space-y-1.5">
                <Label htmlFor="lesson-title">שם השיעור</Label>
                <Input
                  id="lesson-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: מודעות פונולוגית"
                  className="rounded-xl h-11"
                />
              </div>

              {/* School selector */}
              {schools.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-school">בית ספר</Label>
                  <select
                    id="lesson-school"
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value);
                      setGroupIds([]); // reset classes when school changes
                    }}
                    dir="rtl"
                    className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class selector — multi-select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>כיתות</Label>
                  {filteredGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (groupIds.length === filteredGroups.length) {
                          setGroupIds([]);
                        } else {
                          setGroupIds(filteredGroups.map((g) => g.id));
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {groupIds.length === filteredGroups.length ? "נקה הכל" : "בחר הכל"}
                    </button>
                  )}
                </div>
                {filteredGroups.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredGroups.map((g) => {
                      const selected = groupIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setGroupIds((prev) =>
                              selected
                                ? prev.filter((id) => id !== g.id)
                                : [...prev, g.id]
                            );
                          }}
                          className={cn(
                            "text-sm px-3 py-1.5 rounded-xl border transition-colors min-h-[44px] flex items-center gap-1.5",
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                ) : schoolId ? (
                  <p className="text-xs text-muted-foreground">אין כיתות בבית הספר הנבחר</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>תאריך{recurrence === "WEEKLY" ? " (יום בשבוע נקבע לפי תאריך)" : ""}</Label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  label="תאריך"
                  className="rounded-xl"
                />
              </div>

              {/* Recurrence selector */}
              <div className="space-y-1.5">
                <Label id="recurrence-label">תדירות</Label>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="recurrence-label">
                  {RECURRENCE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={recurrence === value}
                      aria-label={`תדירות: ${label}`}
                      onClick={() => setRecurrence(value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-colors min-h-[44px]",
                        recurrence === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  label="התחלה"
                  className="rounded-xl h-10"
                />
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  label="סיום"
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-zoom">
                  <Video className="h-3.5 w-3.5 inline-block me-1" />
                  קישור לזום (אופציונלי)
                </Label>
                <Input
                  id="lesson-zoom"
                  type="url"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="rounded-xl h-11"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-notes">הערות (אופציונלי)</Label>
                <Input
                  id="lesson-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות לשיעור..."
                  className="rounded-xl h-11"
                />
              </div>

              {/* Enrichment toggle */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnrichment}
                  aria-label="שיעור העשרה"
                  onClick={() => setIsEnrichment(!isEnrichment)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    isEnrichment ? "bg-amber-500" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      isEnrichment ? "-translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setIsEnrichment(!isEnrichment)}>
                  <Sparkles className="h-3.5 w-3.5 inline-block me-1 text-amber-500" />
                  העשרה (לא חובה)
                </Label>
              </div>

              {/* Sub-groups toggle */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasSubGroups}
                  aria-label="חלוקה לקבוצות"
                  onClick={() => {
                    setHasSubGroups(!hasSubGroups);
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    hasSubGroups ? "bg-primary" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      hasSubGroups ? "-translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setHasSubGroups(!hasSubGroups)}>
                  <SplitSquareHorizontal className="h-3.5 w-3.5 inline-block me-1" />
                  חלוקה לקבוצות
                </Label>
              </div>

              {/* Sub-group builder */}
              {hasSubGroups && (
                <div className="space-y-3 border border-border/60 rounded-xl p-3">
                  {/* Mode selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={subGroupMode === "TIMESLOTS"}
                      aria-label="מצב: משבצות זמן — ההורים בוחרים משבצת"
                      onClick={() => {
                        if (subGroupMode === "TIMESLOTS") return;
                        setSubGroupMode("TIMESLOTS");
                        setSubGroups([]);
                        setSlotError(null);
                      }}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm text-center transition-colors min-h-[44px]",
                        subGroupMode === "TIMESLOTS"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Clock className="h-3.5 w-3.5 inline-block me-1" />
                      משבצות זמן
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={subGroupMode === "MANUAL"}
                      aria-label="מצב: שיבוץ ידני — המורה משבץ ילדים"
                      onClick={() => {
                        if (subGroupMode === "MANUAL") return;
                        if (groupIds.length === 0) return;
                        setSubGroupMode("MANUAL");
                        setSubGroups([]);
                        addSubGroup();
                      }}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm text-center transition-colors min-h-[44px]",
                        subGroupMode === "MANUAL"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50",
                        groupIds.length === 0 && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={groupIds.length === 0}
                      title={groupIds.length === 0 ? "יש לבחור כיתה כדי לשבץ ילדים ידנית" : undefined}
                    >
                      <Users className="h-3.5 w-3.5 inline-block me-1" />
                      שיבוץ ידני
                    </button>
                  </div>
                  {subGroupMode === "MANUAL" && groupIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">יש לבחור כיתה כדי לשבץ ילדים ידנית</p>
                  )}

                  {/* TIMESLOTS mode */}
                  {subGroupMode === "TIMESLOTS" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        הגדירו טווח שעות ומשך כל משבצת. ההורים יבחרו בעצמם משבצת זמן.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <TimePicker value={slotRangeStart} onChange={setSlotRangeStart} label="מ-" className="rounded-xl h-9" />
                        <TimePicker value={slotRangeEnd} onChange={setSlotRangeEnd} label="עד" className="rounded-xl h-9" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">משך משבצת (דקות)</Label>
                          <Input
                            type="number"
                            min="5"
                            step="5"
                            value={slotInterval}
                            onChange={(e) => setSlotInterval(e.target.value)}
                            className="rounded-xl h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">מקסימום ילדים למשבצת</Label>
                          <Input
                            type="number"
                            min="1"
                            value={slotCapacity}
                            onChange={(e) => setSlotCapacity(e.target.value)}
                            className="rounded-xl h-9 text-sm"
                          />
                        </div>
                      </div>
                      {slotError && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {slotError}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl"
                        onClick={generateTimeslots}
                      >
                        יצירת משבצות
                      </Button>
                      {recurrence !== "ONCE" && (
                        <p className="text-xs text-muted-foreground">
                          המשבצות יהיו זהות כל {recurrence === "WEEKLY" ? "שבוע" : "יום"}.
                        </p>
                      )}

                      {/* Preview generated slots */}
                      {subGroups.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{subGroups.length} משבצות נוצרו:</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {subGroups.map((sg, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-lg border border-border/40 px-2.5 py-1.5 text-xs">
                                <span className="font-medium" dir="ltr">{sg.startTime}-{sg.endTime}</span>
                                <span className="text-muted-foreground">עד {sg.maxCapacity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MANUAL mode */}
                  {subGroupMode === "MANUAL" && groupIds.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        שבצו ילדים לקבוצות ידנית. ילדים שלא שובצו לא יראו את השיעור.
                      </p>
                      {roster.length > 0 && (
                        <p className="text-xs font-medium">
                          {assignedChildIds.size}/{roster.length} משובצים
                        </p>
                      )}
                      {subGroups.map((sg, idx) => (
                        <div key={idx} className="rounded-xl border border-border/40 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={sg.name}
                              onChange={(e) => updateSubGroup(idx, "name", e.target.value)}
                              placeholder="שם קבוצה"
                              aria-label={`שם קבוצת משנה ${idx + 1}`}
                              className="rounded-xl h-9 text-sm flex-1"
                            />
                            {subGroups.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-lg hover:bg-destructive/10 h-9 w-9"
                                onClick={() => removeSubGroup(idx)}
                                aria-label={`הסרת קבוצה ${sg.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <TimePicker value={sg.startTime} onChange={(v) => updateSubGroup(idx, "startTime", v)} label="התחלה" className="rounded-xl h-9" />
                            <TimePicker value={sg.endTime} onChange={(v) => updateSubGroup(idx, "endTime", v)} label="סיום" className="rounded-xl h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">ילדים בקבוצה</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {roster.map((child) => {
                                const isInThisGroup = sg.childIds.includes(child.id);
                                const isInOtherGroup = !isInThisGroup && assignedChildIds.has(child.id);
                                return (
                                  <button
                                    key={child.id}
                                    type="button"
                                    disabled={isInOtherGroup}
                                    aria-pressed={isInThisGroup}
                                    aria-label={`${child.name}${isInOtherGroup ? " (משובץ בקבוצה אחרת)" : ""}`}
                                    onClick={() => toggleChildInSubGroup(idx, child.id)}
                                    className={cn(
                                      "text-sm px-3 py-1.5 rounded-lg border transition-colors min-h-[44px]",
                                      isInThisGroup
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : isInOtherGroup
                                          ? "opacity-40 cursor-not-allowed border-border"
                                          : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    {child.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}

                      {unassignedChildren.length > 0 && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-600" role="alert">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            {unassignedChildren.length} ילדים לא משובצים: {unassignedChildren.map((c) => c.name).join(", ")}
                          </span>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-xs"
                        onClick={addSubGroup}
                      >
                        <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
                        הוסיפו קבוצה נוספת
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {createError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2" role="alert">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {createError}
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="rounded-xl h-11 font-medium"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                {loading ? "יוצר..." : "יצירת שיעור"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="אין שיעורים עדיין"
          description='לחצו "שיעור חדש" כדי להתחיל'
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((lesson) => (
            <Card
              key={lesson.id}
              className={cn(
                "shadow-sm border-border/60 overflow-hidden",
                isPast(lesson.date) && lesson.recurrence === "ONCE" && "opacity-50"
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDateHe(lesson.date)}
                  </span>
                  <span className="text-sm font-semibold">
                    {lesson.startTime}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lesson.endTime}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={lesson.title}>{lesson.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lesson.group?.name ?? "ללא כיתה"}
                    {lesson.recurrence !== "ONCE" && (
                      <span className="ms-1.5 inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                        <Repeat className="h-3 w-3" />
                        {lesson.recurrence === "WEEKLY" ? "שבועי" : "יומי"}
                      </span>
                    )}
                    {lesson.isEnrichment && (
                      <span className="ms-1.5 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3 w-3" />
                        העשרה
                      </span>
                    )}
                    {lesson.hasSubGroups && (
                      <span className="ms-1.5 inline-flex items-center gap-0.5 text-primary">
                        <SplitSquareHorizontal className="h-3 w-3" />
                        {lesson.subGroupMode === "TIMESLOTS"
                          ? `${lesson.subGroups?.length} משבצות`
                          : `${lesson.subGroups?.length} קבוצות`}
                      </span>
                    )}
                  </p>
                  {lesson.zoomLink && (
                    <a
                      href={lesson.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Video className="h-3 w-3" />
                      זום
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-primary/10 h-9 w-9"
                    onClick={() => openEdit(lesson)}
                    aria-label={`עריכת שיעור ${lesson.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-destructive/10 h-9 w-9"
                    onClick={() => setDeleteConfirmId(lesson.id)}
                    aria-label={`מחיקת שיעור ${lesson.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Past lessons section */}
      {pastLessons.length > 0 && (
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full justify-between text-muted-foreground hover:text-foreground border-border/40"
            onClick={() => setShowPast(!showPast)}
          >
            <span className="text-sm">שיעורים שעברו ({pastLessons.length})</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showPast && "rotate-180")} />
          </Button>
          {showPast && (
            <div className="space-y-2 mt-2 opacity-60">
              {pastLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="shadow-sm border-border/60 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateHe(lesson.date)}
                      </span>
                      <span className="text-sm font-semibold">
                        {lesson.startTime}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lesson.endTime}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={lesson.title}>{lesson.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lesson.group?.name ?? "ללא כיתה"}
                        {lesson.isEnrichment && (
                          <span className="ms-1.5 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                            <Sparkles className="h-3 w-3" />
                            העשרה
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-lg hover:bg-destructive/10 h-9 w-9"
                      onClick={() => setDeleteConfirmId(lesson.id)}
                      aria-label={`מחיקת שיעור ${lesson.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת שיעור</DialogTitle>
            <DialogDescription>
              {(() => {
                const lesson = sorted.find((l) => l.id === deleteConfirmId) ?? pastLessons.find((l) => l.id === deleteConfirmId);
                if (!lesson) return "האם למחוק את השיעור? לא ניתן לבטל פעולה זו.";
                return `האם למחוק את "${lesson.title}" (${formatDateHe(lesson.date)})${lesson.hasSubGroups ? ` עם ${lesson.subGroups?.length ?? 0} ${lesson.subGroupMode === "TIMESLOTS" ? "משבצות" : "קבוצות"}` : ""}? לא ניתן לבטל פעולה זו.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteConfirmId(null)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => deleteConfirmId && handleDeleteLesson(deleteConfirmId)}
              disabled={loading}
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              {loading ? "מוחק..." : "מחיקה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit lesson dialog */}
      <Dialog
        open={!!editSlot}
        onOpenChange={(open) => !open && setEditSlot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת שיעור</DialogTitle>
            <DialogDescription>
              {editSlot?.group?.name ?? "ללא כיתה"} - {editSlot ? formatDateHe(editSlot.date) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">שם השיעור</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>תאריך</Label>
              <DatePicker
                value={editDate}
                onChange={setEditDate}
                label="תאריך"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label id="edit-recurrence-label">תדירות</Label>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="edit-recurrence-label">
                {RECURRENCE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={editRecurrence === value}
                    aria-label={`תדירות: ${label}`}
                    onClick={() => setEditRecurrence(value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-colors min-h-[44px]",
                      editRecurrence === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>שעת התחלה</Label>
                <TimePicker
                  value={editStartTime}
                  onChange={setEditStartTime}
                  label="שעת התחלה"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>שעת סיום</Label>
                <TimePicker
                  value={editEndTime}
                  onChange={setEditEndTime}
                  label="שעת סיום"
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-zoom">
                <Video className="h-3.5 w-3.5 inline-block me-1" />
                קישור לזום (אופציונלי)
              </Label>
              <Input
                id="edit-zoom"
                type="url"
                value={editZoomLink}
                onChange={(e) => setEditZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="rounded-xl h-11"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">הערות (אופציונלי)</Label>
              <Input
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          {editError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {editError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditSlot(null)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleEdit}
              disabled={loading}
              className="rounded-xl h-11 font-medium"
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              {loading ? "שומר..." : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
