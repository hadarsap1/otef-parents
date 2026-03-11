"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const COMMON_SUBJECTS = [
  "חשבון",
  "עברית",
  "אנגלית",
  "מדעים",
  "תנ״ך",
  "היסטוריה",
  "גיאוגרפיה",
  "חינוך גופני",
  "אומנות",
  "מוזיקה",
  "מחשבים",
];

interface Child {
  id: string;
  name: string;
}

export function AddLessonDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [zoomUrl, setZoomUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/children")
      .then((r) => r.json())
      .then((data) => {
        setChildren(data);
        if (data.length > 0) setChildId(data[0].id);
      });
  }, []);

  function reset() {
    setSubject("");
    setCustomSubject(false);
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("");
    setEndTime("");
    setZoomUrl("");
  }

  function handleSubjectChange(value: string) {
    if (value === "__custom__") {
      setCustomSubject(true);
      setSubject("");
    } else {
      setCustomSubject(false);
      setSubject(value);
    }
  }

  async function handleSave() {
    if (!childId || !subject || !startTime || !endTime) return;
    setSaving(true);

    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        subject,
        startTime: new Date(`${date}T${startTime}`).toISOString(),
        endTime: new Date(`${date}T${endTime}`).toISOString(),
        zoomUrl: zoomUrl || null,
      }),
    });

    setSaving(false);
    setOpen(false);
    reset();
    onAdded?.();
  }

  if (children.length === 0) return null;

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="h-4 w-4" />
        הוספת שיעור
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>הוספת שיעור</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="lesson-child">ילד/ה</Label>
            <select
              id="lesson-child"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className={selectClass}
              required
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-subject">מקצוע</Label>
            {!customSubject ? (
              <select
                id="lesson-subject"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">בחר מקצוע...</option>
                {COMMON_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">אחר (הקלדה חופשית)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="lesson-subject-custom"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="הקלד שם מקצוע..."
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomSubject(false);
                    setSubject("");
                  }}
                  className="shrink-0"
                >
                  רשימה
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-date">תאריך</Label>
            <Input
              id="lesson-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                label="שעת התחלה"
              />
            </div>
            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                label="שעת סיום"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-zoom">לינק לזום (אופציונלי)</Label>
            <Input
              id="lesson-zoom"
              type="url"
              value={zoomUrl}
              onChange={(e) => setZoomUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              dir="ltr"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving || !subject || !startTime || !endTime}
          >
            {saving ? "שומר..." : "הוספה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
