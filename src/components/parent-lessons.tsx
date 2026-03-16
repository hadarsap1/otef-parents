"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, Video, SplitSquareHorizontal, Repeat } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  teacher: { name: string | null };
  group: { id: string; name: string };
  subGroups?: SubGroup[];
}

function formatDateHe(dateVal: string | Date) {
  const d = new Date(dateVal);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[d.getDay()];
  return `יום ${dayName}, ${d.getDate()}/${d.getMonth() + 1}`;
}

export function ParentLessons({
  initialLessons,
  childIds,
}: {
  initialLessons: Lesson[];
  childIds?: string[];
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
                // If sub-grouped, find which sub-group the child is in
                let displayTime = { start: lesson.startTime, end: lesson.endTime };
                let subGroupName: string | null = null;

                if (lesson.hasSubGroups && lesson.subGroups && childIds) {
                  const childSubGroup = lesson.subGroups.find((sg) =>
                    sg.members.some((m) => childIds.includes(m.child.id))
                  );
                  if (childSubGroup) {
                    displayTime = { start: childSubGroup.startTime, end: childSubGroup.endTime };
                    subGroupName = childSubGroup.name;
                  }
                }

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateHe(lesson.date)}
                      </span>
                      <span className="text-sm font-semibold">
                        {displayTime.start}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {displayTime.end}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={lesson.title}>{lesson.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lesson.group.name}
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
                      </p>
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
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
