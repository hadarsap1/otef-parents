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
      groupMemberships: {
        select: { groupId: true, group: { select: { schoolId: true } } },
      },
    },
  });

  const childIds = children.map((c) => c.id);
  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.groupId))),
  ];
  const schoolIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.group.schoolId)).filter(Boolean)),
  ] as string[];

  // Israel current time for past/upcoming split
  const israelNow = new Date().toLocaleString("en-CA", { timeZone: "Asia/Jerusalem", hour12: false });
  const israelDate = israelNow.split(",")[0]; // "YYYY-MM-DD"
  const israelTime = israelNow.split(",")[1]?.trim().slice(0, 5) ?? "00:00"; // "HH:mm"

  const lessonInclude = {
    teacher: { select: { name: true } },
    group: { select: { id: true, name: true } },
    subGroups: {
      include: {
        members: { include: { child: { select: { id: true, name: true } } } },
      },
    },
  } as const;

  // Fetch group lessons + school-wide lessons, split by time in JS
  const allLessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { groupId: { in: groupIds } },
        ...(schoolIds.length > 0 ? [{ schoolId: { in: schoolIds }, groupId: null }] : []),
      ],
    },
    include: { ...lessonInclude, school: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  function isLessonPast(lesson: { date: Date; endTime: string; recurrence: string }) {
    if (lesson.recurrence !== "ONCE") return false;
    const lessonDate = lesson.date.toISOString().split("T")[0];
    if (lessonDate < israelDate) return true;
    if (lessonDate === israelDate) {
      return lesson.endTime ? lesson.endTime <= israelTime : true;
    }
    return false;
  }

  function filterSubGroups(lessonList: typeof allLessons) {
    return lessonList.filter((lesson) => {
      if (!lesson.hasSubGroups) return true;
      if (lesson.subGroupMode === "TIMESLOTS") return true;
      return lesson.subGroups.some((sg) =>
        sg.members.some((m) => childIds.includes(m.childId))
      );
    });
  }

  const validLessons = filterSubGroups(allLessons);
  const filtered = validLessons.filter((l) => !isLessonPast(l));
  const filteredPast = validLessons
    .filter((l) => isLessonPast(l))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.endTime.localeCompare(a.endTime))
    .slice(0, 50);

  // Fetch parent-added personal lessons (ScheduleItems)
  const scheduleItems = await prisma.scheduleItem.findMany({
    where: {
      childId: { in: childIds },
      endTime: { gte: new Date() },
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
