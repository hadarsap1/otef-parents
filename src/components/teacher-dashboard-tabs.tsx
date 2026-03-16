"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeacherGroups } from "@/components/teacher-groups";
import { TeacherLessons } from "@/components/teacher-lessons";

interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | Date;
  _count: { members: number };
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
  groupId: string;
  group: { id: string; name: string; members?: { child: { id: string; name: string } }[] };
  subGroups?: SubGroup[];
}

export function TeacherDashboardTabs({
  initialGroups,
  initialLessons,
  groups,
}: {
  initialGroups: Group[];
  initialLessons: Lesson[];
  groups: { id: string; name: string }[];
}) {
  return (
    <Tabs defaultValue="lessons">
      <TabsList className="w-full">
        <TabsTrigger value="lessons">שיעורים</TabsTrigger>
        <TabsTrigger value="groups">קבוצות</TabsTrigger>
      </TabsList>
      <TabsContent value="lessons">
        <TeacherLessons initialLessons={initialLessons} groups={groups} />
      </TabsContent>
      <TabsContent value="groups">
        <TeacherGroups initialGroups={initialGroups} />
      </TabsContent>
    </Tabs>
  );
}
