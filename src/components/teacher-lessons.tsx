"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Trash2, Video, Pencil, Users, Copy } from "lucide-react";
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

const DAYS_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

interface Group {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  zoomLink: string | null;
  groupId: string;
  group: { id: string; name: string; members?: { child: { id: string; name: string } }[] };
}

/** Group lessons by groupId */
function groupByGroup(lessons: Lesson[]) {
  const map = new Map<string, Lesson[]>();
  for (const l of lessons) {
    if (!map.has(l.groupId)) map.set(l.groupId, []);
    map.get(l.groupId)!.push(l);
  }
  return Array.from(map.entries()).map(([, lessons]) => ({
    group: lessons[0].group,
    lessons: lessons.sort(
      (a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime)
    ),
  }));
}

export function TeacherLessons({
  initialLessons,
  groups,
}: {
  initialLessons: Lesson[];
  groups: Group[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(0);
  const [zoomLink, setZoomLink] = useState("");
  const [slots, setSlots] = useState([
    { groupId: groups[0]?.id ?? "", startTime: "13:00", endTime: "13:30" },
  ]);

  function updateSlot(index: number, field: string, value: string) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addSlot() {
    const last = slots[slots.length - 1];
    // Pick next available group that isn't already used
    const usedGroupIds = new Set(slots.map((s) => s.groupId));
    const nextGroup = groups.find((g) => !usedGroupIds.has(g.id));
    setSlots((prev) => [
      ...prev,
      {
        groupId: nextGroup?.id ?? groups[0]?.id ?? "",
        startTime: last.startTime,
        endTime: last.endTime,
      },
    ]);
  }

  function removeSlot(index: number) {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editZoomLink, setEditZoomLink] = useState("");

  const grouped = groupByGroup(initialLessons);

  async function handleCreate() {
    const validSlots = slots.filter((s) => s.groupId);
    if (!title.trim() || validSlots.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        validSlots.map((slot) =>
          fetch("/api/lessons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              groupId: slot.groupId,
              zoomLink: zoomLink.trim() || null,
            }),
          })
        )
      );
      if (results.some((r) => r.ok)) {
        setTitle("");
        setDay(0);
        setZoomLink("");
        setSlots([
          { groupId: groups[0]?.id ?? "", startTime: "13:00", endTime: "13:30" },
        ]);
        setCreateOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function openEdit(lesson: Lesson) {
    setEditSlot(lesson);
    setEditTitle(lesson.title);
    setEditStartTime(lesson.startTime);
    setEditEndTime(lesson.endTime);
    setEditZoomLink(lesson.zoomLink ?? "");
  }

  async function handleEdit() {
    if (!editSlot) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${editSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          startTime: editStartTime,
          endTime: editEndTime,
          zoomLink: editZoomLink.trim() || null,
        }),
      });
      if (res.ok) {
        setEditSlot(null);
        router.refresh();
      }
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                הוסיפו שיעור לקבוצה. כל הילדים בקבוצה יראו אותו אוטומטית.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
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
              <div className="space-y-1.5">
                <Label htmlFor="lesson-day">יום</Label>
                <select
                  id="lesson-day"
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {DAYS_HE.map((d, i) => (
                    <option key={i} value={i}>
                      יום {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group + time slots */}
              <div className="space-y-2">
                {slots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        {slots.length > 1 ? `קבוצה ${idx + 1}` : "קבוצה"}
                      </Label>
                      {slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg hover:bg-destructive/10 h-6 w-6"
                          onClick={() => removeSlot(idx)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <select
                      value={slot.groupId}
                      onChange={(e) => updateSlot(idx, "groupId", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {groups.length === 0 && (
                        <option value="">אין קבוצות - צרו קבוצה קודם</option>
                      )}
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <TimePicker
                        value={slot.startTime}
                        onChange={(v) => updateSlot(idx, "startTime", v)}
                        label="התחלה"
                        className="rounded-xl h-10"
                      />
                      <TimePicker
                        value={slot.endTime}
                        onChange={(v) => updateSlot(idx, "endTime", v)}
                        label="סיום"
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>
                ))}

                {groups.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-xs"
                    onClick={addSlot}
                  >
                    <Copy className="h-3.5 w-3.5" data-icon="inline-start" />
                    הוסיפו קבוצה נוספת בשעה אחרת
                  </Button>
                )}
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
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim() || !slots.some((s) => s.groupId)}
                className="rounded-xl h-11 font-medium"
              >
                {loading
                  ? "יוצר..."
                  : slots.length > 1
                    ? `יצירת ${slots.length} שיעורים`
                    : "יצירת שיעור"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="אין שיעורים עדיין"
          description='לחצו "שיעור חדש" כדי להתחיל'
        />
      ) : (
        grouped.map(({ group, lessons }) => (
          <Card key={group.id} className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent pb-3">
              <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
              <CardDescription className="text-sm">
                {lessons.length} שיעורים
                {group.members && group.members.length > 0 && (
                  <span className="ms-1">
                    · <Users className="h-3.5 w-3.5 inline-block" /> {group.members.length} ילדים
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                      <span className="text-xs font-medium text-muted-foreground">
                        יום {DAYS_HE[lesson.day]}
                      </span>
                      <span className="text-sm font-semibold">
                        {lesson.startTime}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {lesson.endTime}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lesson.title}</p>
                      {lesson.zoomLink && (
                        <a
                          href={lesson.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
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
                        className="rounded-lg hover:bg-primary/10"
                        onClick={() => openEdit(lesson)}
                        aria-label="עריכת שיעור"
                      >
                        <Pencil className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-lg hover:bg-destructive/10"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        aria-label="מחיקת שיעור"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit lesson dialog */}
      <Dialog
        open={!!editSlot}
        onOpenChange={(open) => !open && setEditSlot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת שיעור</DialogTitle>
            <DialogDescription>
              {editSlot?.group.name} - יום {editSlot ? DAYS_HE[editSlot.day] : ""}
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
          </div>
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
              {loading ? "שומר..." : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
