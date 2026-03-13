"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2, Clock, Pencil } from "lucide-react";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const QUICK_EVENTS = [
  { emoji: "🎬", title: "סרט" },
  { emoji: "🎂", title: "יום הולדת" },
  { emoji: "🏊", title: "בריכה" },
  { emoji: "🛝", title: "פארק" },
  { emoji: "👨‍👩‍👧‍👦", title: "מפגש משפחתי" },
  { emoji: "🎮", title: "זמן משחק" },
  { emoji: "📚", title: "ספרייה" },
  { emoji: "🍕", title: "ארוחה בחוץ" },
  { emoji: "🏥", title: "רופא" },
  { emoji: "✂️", title: "ספר" },
];

interface PersonalEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  emoji: string | null;
}

export function AddEventDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  function selectQuickEvent(item: { emoji: string; title: string }) {
    setEmoji(item.emoji);
    setTitle(item.title);
  }

  function reset() {
    setTitle("");
    setEmoji("");
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("");
    setEndTime("");
    setNotes("");
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          notes: notes.trim() || null,
          emoji: emoji || null,
        }),
      });
      if (res.ok) {
        reset();
        setOpen(false);
        onAdded?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="rounded-xl font-medium">
            <Plus className="h-4 w-4" data-icon="inline-start" />
            אירוע
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>אירוע חדש</DialogTitle>
          <DialogDescription>
            הוסיפו אירוע אישי כמו סרט, יום הולדת או כל דבר אחר
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EVENTS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => selectQuickEvent(item)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  title === item.title && emoji === item.emoji
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                {item.emoji} {item.title}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-title">שם האירוע</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: סרט ערב"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label>תאריך</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              label="תאריך אירוע"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>שעה (אופציונלי)</Label>
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                label="שעת התחלה"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>עד</Label>
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                label="שעת סיום"
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-notes">הערות (אופציונלי)</Label>
            <Input
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              className="rounded-xl h-11"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="rounded-xl h-11 font-medium"
          >
            {loading ? "שומר..." : "הוספה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PersonalEventRow({
  event,
  onDelete,
  onUpdate,
}: {
  event: PersonalEvent;
  onDelete: (id: string) => void;
  onUpdate?: (updated: PersonalEvent) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [emoji, setEmoji] = useState(event.emoji || "");
  const [startTime, setStartTime] = useState(event.startTime || "");
  const [endTime, setEndTime] = useState(event.endTime || "");
  const [notes, setNotes] = useState(event.notes || "");

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    onDelete(event.id);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startTime: startTime || null,
          endTime: endTime || null,
          notes: notes.trim() || null,
          emoji: emoji || null,
        }),
      });
      if (res.ok) {
        const updated = {
          ...event,
          title: title.trim(),
          startTime: startTime || null,
          endTime: endTime || null,
          notes: notes.trim() || null,
          emoji: emoji || null,
        };
        onUpdate?.(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="py-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EVENTS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => { setEmoji(item.emoji); setTitle(item.title); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                title === item.title && emoji === item.emoji
                  ? "bg-primary/10 border-primary/30 text-primary font-medium"
                  : "border-border/60 hover:bg-muted/50"
              }`}
            >
              {item.emoji} {item.title}
            </button>
          ))}
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="שם האירוע"
          className="rounded-xl h-10"
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הערות"
          className="rounded-xl h-10"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-xl"
          >
            {saving ? "שומר..." : "שמירה"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTitle(event.title);
              setEmoji(event.emoji || "");
              setStartTime(event.startTime || "");
              setEndTime(event.endTime || "");
              setNotes(event.notes || "");
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
      className="flex items-center gap-3 py-3 cursor-pointer active:bg-muted/50 transition-colors rounded-lg -mx-1 px-1"
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditing(true); }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-lg shrink-0">
        {event.emoji || "📌"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{event.title}</p>
        {(event.startTime || event.notes) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {event.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.startTime}
                {event.endTime && `-${event.endTime}`}
              </span>
            )}
            {event.notes && (
              <span className="truncate">{event.notes}</span>
            )}
          </div>
        )}
      </div>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <AddToCalendarButton type="personal" id={event.id} compact />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-lg hover:bg-muted"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditing(true); }}
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-lg hover:bg-destructive/10"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(); }}
        disabled={deleting}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
