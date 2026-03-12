import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParentLessons } from "@/components/parent-lessons";
import { LessonsPageHeader } from "@/components/lessons-page-header";

export default async function LessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Find lessons via children's group memberships
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true, groupMemberships: { select: { groupId: true } } },
  });

  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.groupId))),
  ];

  const lessons = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      teacher: { select: { name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="space-y-4">
      <LessonsPageHeader />
      <ParentLessons initialLessons={lessons} />
    </div>
  );
}
