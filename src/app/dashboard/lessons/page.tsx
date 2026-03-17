import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParentLessons } from "@/components/parent-lessons";
import { PersonalLessons } from "@/components/personal-lessons";
import { LessonsPageHeader } from "@/components/lessons-page-header";

export default async function LessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Find children and their group memberships
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: {
      id: true,
      name: true,
      groupMemberships: { select: { groupId: true } },
    },
  });

  const childIds = children.map((c) => c.id);
  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.groupId))),
  ];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const lessonInclude = {
    teacher: { select: { name: true } },
    group: { select: { id: true, name: true } },
    subGroups: {
      include: {
        members: { include: { child: { select: { id: true, name: true } } } },
      },
    },
  } as const;

  // Fetch teacher-created group lessons (upcoming only)
  const lessons = await prisma.lesson.findMany({
    where: {
      groupId: { in: groupIds },
      OR: [
        { recurrence: "ONCE", date: { gte: now } },
        { recurrence: { not: "ONCE" } },
      ],
    },
    include: lessonInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Past lessons
  const pastLessons = await prisma.lesson.findMany({
    where: {
      groupId: { in: groupIds },
      recurrence: "ONCE",
      date: { lt: now },
    },
    include: lessonInclude,
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 50,
  });

  function filterSubGroups(lessonList: typeof lessons) {
    return lessonList.filter((lesson) => {
      if (!lesson.hasSubGroups) return true;
      if (lesson.subGroupMode === "TIMESLOTS") return true;
      return lesson.subGroups.some((sg) =>
        sg.members.some((m) => childIds.includes(m.childId))
      );
    });
  }

  const filtered = filterSubGroups(lessons);
  const filteredPast = filterSubGroups(pastLessons);

  // Fetch parent-added personal lessons (ScheduleItems)
  const scheduleItems = await prisma.scheduleItem.findMany({
    where: {
      childId: { in: childIds },
      endTime: { gte: now },
    },
    include: { child: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-4">
      <LessonsPageHeader />
      <ParentLessons
        initialLessons={filtered}
        pastLessons={filteredPast}
        childIds={childIds}
        children={children.map((c) => ({ id: c.id, name: c.name }))}
      />
      <PersonalLessons
        items={scheduleItems.map((s) => ({
          id: s.id,
          subject: s.subject,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          zoomUrl: s.zoomUrl,
          notes: s.notes,
          child: s.child,
        }))}
      />
    </div>
  );
}
