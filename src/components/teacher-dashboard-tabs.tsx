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
