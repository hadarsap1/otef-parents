"use client";

import { useState, useEffect } from "react";
import { Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
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

export function DigestSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState("08:00");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.digestEnabled !== undefined) setEnabled(data.digestEnabled);
        if (data.digestTime) setTime(data.digestTime);
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestEnabled: enabled, digestTime: time }),
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent w-full text-right">
            <Mail className="h-4 w-4" />
            הגדרות מייל יומי
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>סיכום יומי במייל</DialogTitle>
          <DialogDescription>
            קבלו מייל יומי עם כל השיעורים, האירועים והפלייגדייטים
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            טוען...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="digest-toggle">שליחת סיכום יומי</Label>
              <button
                id="digest-toggle"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-1.5" : "translate-x-6"
                  }`}
                />
              </button>
            </div>

            {enabled && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  שעת שליחה
                </Label>
                <TimePicker
                  value={time}
                  onChange={setTime}
                  label="שעת שליחה"
                  className="rounded-xl h-11"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl h-11 font-medium"
          >
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
