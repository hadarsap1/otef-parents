"use client";

import { useState } from "react";
import { CalendarDays, Video, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

interface ScheduleItemData {
  id: string;
  subject: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  zoomUrl: string | null;
  notes: string | null;
  child: { id: string; name: string };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function PersonalLessons({ items }: { items: ScheduleItemData[] }) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const visibleItems = items.filter((i) => !deletedIds.has(i.id));

  if (visibleItems.length === 0) {
    return null;
  }

  async function handleDelete(id: string) {
    setDeletedIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <Card className="shadow-sm border-border/60 overflow-hidden">
      <CardHeader className="bg-gradient-to-l from-primary/5 to-transparent pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg font-semibold">
              שיעורים שנוספו ידנית
            </CardTitle>
            <CardDescription className="text-sm">
              {visibleItems.length} שיעורים
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatDate(item.startTime)}
                </span>
                <span className="text-sm font-semibold">
                  {formatTime(item.startTime)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatTime(item.endTime)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.subject}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.child.name}
                </p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.zoomUrl && (
                  <a
                    href={item.zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                    title="קישור לזום"
                  >
                    <Video className="h-4 w-4 text-primary" />
                  </a>
                )}
                <AddToCalendarButton type="lesson" id={item.id} compact />
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                  title="מחיקה"
                  aria-label="מחיקת שיעור"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שיעור</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את השיעור? הפעולה לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
