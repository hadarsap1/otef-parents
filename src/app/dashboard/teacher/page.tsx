import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeacherLessons } from "@/components/teacher-lessons";

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const isSuperAdmin = session.user.role === "SUPERADMIN";

  // Get schools the teacher belongs to (SUPERADMIN sees all)
  const schools = isSuperAdmin
    ? await prisma.school.findMany({
        select: {
          id: true,
          name: true,
          groups: {
            select: {
              id: true,
              name: true,
              members: { select: { child: { select: { id: true, name: true } } } },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      })
    : await prisma.school.findMany({
        where: {
          members: { some: { userId: session.user.id } },
        },
        select: {
          id: true,
          name: true,
          groups: {
            where: { teacherId: session.user.id },
            select: {
              id: true,
              name: true,
              members: { select: { child: { select: { id: true, name: true } } } },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

  // Flatten all groups for TeacherLessons (with school context)
  const allGroups = schools.flatMap((s) =>
    s.groups.map((g) => ({
      id: g.id,
      name: g.name,
      schoolName: s.name,
      members: g.members,
    }))
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const lessonInclude = {
    group: {
      select: {
        id: true,
        name: true,
        school: { select: { name: true } },
        members: { select: { child: { select: { id: true, name: true } } } },
      },
    },
    subGroups: {
      include: {
        members: { include: { child: { select: { id: true, name: true } } } },
      },
    },
  } as const;

  const teacherFilter = isSuperAdmin ? {} : { teacherId: session.user.id };

  // Upcoming: one-time future + all recurring
  const lessons = await prisma.lesson.findMany({
    where: {
      ...teacherFilter,
      OR: [
        { recurrence: "ONCE", date: { gte: now } },
        { recurrence: { not: "ONCE" } },
      ],
    },
    include: lessonInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Past: one-time lessons before today
  const pastLessons = await prisma.lesson.findMany({
    where: {
      ...teacherFilter,
      recurrence: "ONCE",
      date: { lt: now },
    },
    include: lessonInclude,
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">לוח מורה</h1>

      <TeacherLessons
        initialLessons={lessons}
        pastLessons={pastLessons}
        groups={allGroups}
        schools={schools.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
