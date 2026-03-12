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

  // Fetch teacher-created group lessons
  const lessons = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      teacher: { select: { name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  // Fetch parent-added personal lessons (ScheduleItems)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
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
      <ParentLessons initialLessons={lessons} />
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
