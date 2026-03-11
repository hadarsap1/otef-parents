"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Users, Trash2, Video, Pencil } from "lucide-react";
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
  maxKids: number;
  zoomLink: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  _count: { registrations: number };
  registrations: { child: { id: string; name: string } }[];
}

/** Group lessons by title+day so we can show them as one block with slots */
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
    slots: slots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
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
  const [deleteAllSlots, setDeleteAllSlots] = useState<Lesson[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [day, setDay] = useState(0);
  const [numGroups, setNumGroups] = useState(5);
  const [firstStart, setFirstStart] = useState("13:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [maxKids, setMaxKids] = useState(6);
  const [zoomLink, setZoomLink] = useState("");

  const grouped = groupLessons(initialLessons);

  async function handleCreate() {
    if (!title.trim() || numGroups < 1) return;
    setLoading(true);
    try {
      // Create multiple slots
      const [startH, startM] = firstStart.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;

      for (let i = 0; i < numGroups; i++) {
        const sh = Math.floor(currentMinutes / 60);
        const sm = currentMinutes % 60;
        const endMinutes = currentMinutes + slotDuration;
        const eh = Math.floor(endMinutes / 60);
        const em = endMinutes % 60;

        const startTime = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
        const endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

        await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            day,
            startTime,
            endTime,
            maxKids,
            zoomLink: zoomLink.trim() || null,
          }),
        });

        currentMinutes = endMinutes;
      }

      setTitle("");
      setDay(0);
      setNumGroups(5);
      setFirstStart("13:00");
      setSlotDuration(30);
      setMaxKids(6);
      setZoomLink("");
      setCreateOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSlot(lessonId: string) {
    const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function handleDeleteAll(slots: Lesson[]) {
    setLoading(true);
    try {
      await Promise.all(
        slots.map((s) =>
          fetch(`/api/lessons/${s.id}`, { method: "DELETE" })
        )
      );
      setDeleteAllSlots(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Edit state
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editMaxKids, setEditMaxKids] = useState(6);
  const [editZoomLink, setEditZoomLink] = useState("");

  function openEdit(slot: Lesson) {
    setEditSlot(slot);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setEditMaxKids(slot.maxKids);
    setEditZoomLink(slot.zoomLink ?? "");
  }

  async function handleEdit() {
    if (!editSlot) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${editSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: editStartTime,
          endTime: editEndTime,
          maxKids: editMaxKids,
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
          {grouped.length > 0 ? `${grouped.length} שיעורים` : ""}
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
              <DialogTitle>יצירת שיעור חדש</DialogTitle>
              <DialogDescription>
                הגדירו שם, יום, מספר קבוצות ושעת התחלה. המערכת תיצור את הקבוצות
                אוטומטית.
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>שעת התחלה</Label>
                  <TimePicker
                    value={firstStart}
                    onChange={setFirstStart}
                    label="שעת התחלה"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-groups">מספר קבוצות</Label>
                  <Input
                    id="lesson-groups"
                    type="number"
                    min={1}
                    max={10}
                    value={numGroups}
                    onChange={(e) => setNumGroups(Number(e.target.value))}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-duration">דקות לקבוצה</Label>
                  <Input
                    id="lesson-duration"
                    type="number"
                    min={10}
                    max={120}
                    step={5}
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lesson-max">מקסימום ילדים בקבוצה</Label>
                  <Input
                    id="lesson-max"
                    type="number"
                    min={1}
                    max={30}
                    value={maxKids}
                    onChange={(e) => setMaxKids(Number(e.target.value))}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-zoom">
                  <Video className="h-3.5 w-3.5 inline-block ml-1" />
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

              {/* Preview */}
              {title.trim() && numGroups > 0 && (
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-sm space-y-1.5">
                  <p className="font-semibold text-primary">תצוגה מקדימה</p>
                  {Array.from({ length: numGroups }, (_, i) => {
                    const [sh, sm] = firstStart.split(":").map(Number);
                    const start = sh * 60 + sm + i * slotDuration;
                    const h = Math.floor(start / 60);
                    const m = start % 60;
                    return (
                      <p key={i} className="text-muted-foreground">
                        קבוצה {i + 1} — {String(h).padStart(2, "0")}:
                        {String(m).padStart(2, "0")} (עד {maxKids} ילדים)
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="rounded-xl h-11 font-medium"
              >
                {loading ? "יוצר..." : `יצירת ${numGroups} קבוצות`}
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
        grouped.map(({ title, day, slots }) => (
          <Card key={`${title}-${day}`} className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent pb-3">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <CardDescription className="text-sm">
                יום {DAYS_HE[day]} · {slots.length} קבוצות · עד{" "}
                {slots[0].maxKids} ילדים בקבוצה
              </CardDescription>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive text-xs rounded-lg"
                  onClick={() => setDeleteAllSlots(slots)}
                >
                  מחיקת הכל
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {slots.map((slot, idx) => {
                  const isFull =
                    slot._count.registrations >= slot.maxKids;
                  const fillPercent = Math.round(
                    (slot._count.registrations / slot.maxKids) * 100
                  );
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        isFull
                          ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                          : ""
                      }`}
                    >
                      {/* Numbered circle */}
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm ${
                            isFull ? "bg-emerald-500" : "bg-primary"
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
                              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
                                מלא
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull
                                  ? "bg-emerald-500"
                                  : fillPercent > 60
                                    ? "bg-amber-400"
                                    : "bg-primary/60"
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Registered children list */}
                        {slot.registrations.length > 0 && (
                          <div className="space-y-1 pt-0.5">
                            {slot.registrations.map((r, rIdx) => (
                              <div
                                key={r.child.id}
                                className="text-sm flex items-center gap-2"
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-semibold">
                                  {rIdx + 1}
                                </span>
                                <span className="font-medium">{r.child.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg hover:bg-primary/10"
                          onClick={() => openEdit(slot)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg hover:bg-destructive/10"
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete All confirmation dialog */}
      <Dialog
        open={!!deleteAllSlots}
        onOpenChange={(open) => !open && setDeleteAllSlots(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת כל הקבוצות</DialogTitle>
            <DialogDescription>
              האם למחוק את כל {deleteAllSlots?.length} הקבוצות של שיעור זה?
              {deleteAllSlots?.some((s) => s._count.registrations > 0) && (
                <span className="block mt-1 text-destructive font-medium">
                  שימו לב: יש ילדים רשומים בחלק מהקבוצות.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteAllSlots(null)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={loading}
              onClick={() => deleteAllSlots && handleDeleteAll(deleteAllSlots)}
            >
              {loading ? "מוחק..." : "מחיקת הכל"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit slot dialog */}
      <Dialog
        open={!!editSlot}
        onOpenChange={(open) => !open && setEditSlot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת קבוצה</DialogTitle>
            <DialogDescription>
              {editSlot?.title} — {editSlot?.startTime}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label htmlFor="edit-max">מקסימום ילדים</Label>
              <Input
                id="edit-max"
                type="number"
                min={1}
                max={30}
                value={editMaxKids}
                onChange={(e) => setEditMaxKids(Number(e.target.value))}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-zoom">
                <Video className="h-3.5 w-3.5 inline-block ml-1" />
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
