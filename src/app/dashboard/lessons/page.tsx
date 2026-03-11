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

  const [lessons, children] = await Promise.all([
    prisma.lesson.findMany({
      include: {
        teacher: { select: { name: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
        registrations: {
          where: {
            child: {
              OR: [
                { parentId: session.user.id },
                { childParents: { some: { userId: session.user.id } } },
              ],
            },
          },
          select: { childId: true },
        },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
    prisma.child.findMany({
      where: {
        OR: [
          { parentId: session.user.id },
          { childParents: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <LessonsPageHeader />
      <ParentLessons initialLessons={lessons} children={children} />
    </div>
  );
}
