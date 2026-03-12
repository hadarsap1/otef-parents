"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, Video } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

const DAYS_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

interface Lesson {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  zoomLink: string | null;
  teacher: { name: string | null };
  group: { id: string; name: string };
}

/** Group lessons by group, then sort by day+time within each group */
function groupByClass(lessons: Lesson[]) {
  const map = new Map<string, { group: { id: string; name: string }; lessons: Lesson[] }>();
  for (const l of lessons) {
    if (!map.has(l.group.id)) {
      map.set(l.group.id, { group: l.group, lessons: [] });
    }
    map.get(l.group.id)!.lessons.push(l);
  }
  return Array.from(map.values()).map((entry) => ({
    ...entry,
    lessons: entry.lessons.sort(
      (a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime)
    ),
  }));
}

export function ParentLessons({
  initialLessons,
}: {
  initialLessons: Lesson[];
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const grouped = groupByClass(initialLessons);

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="אין שיעורים"
        description="כרגע אין שיעורים מתוכננים לילדים שלך"
      />
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(({ group, lessons }) => {
        const isOpen = openGroups.has(group.id);
        return (
          <Card key={group.id} className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader
              className="bg-gradient-to-l from-primary/5 to-transparent pb-3 cursor-pointer"
              onClick={() => toggleGroup(group.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleGroup(group.id);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {lessons.length} שיעורים
                  </CardDescription>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {isOpen && (
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
                        {lesson.teacher.name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {lesson.teacher.name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {lesson.zoomLink && (
                          <a
                            href={lesson.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                            title="קישור לזום"
                          >
                            <Video className="h-4 w-4 text-primary" />
                          </a>
                        )}
                        <AddToCalendarButton type="lesson" id={lesson.id} compact />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
