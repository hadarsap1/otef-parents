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

  // Israel current time for past/upcoming split by end time
  const israelNow = new Date().toLocaleString("en-CA", { timeZone: "Asia/Jerusalem", hour12: false });
  const israelDate = israelNow.split(",")[0]; // "YYYY-MM-DD"
  const israelTime = israelNow.split(",")[1]?.trim().slice(0, 5) ?? "00:00"; // "HH:mm"

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

  function isLessonPast(lesson: { date: Date; endTime: string; recurrence: string }) {
    if (lesson.recurrence !== "ONCE") return false;
    const lessonDate = lesson.date.toISOString().split("T")[0];
    if (lessonDate < israelDate) return true;
    if (lessonDate === israelDate && lesson.endTime <= israelTime) return true;
    return false;
  }

  // Fetch recent lessons: today + future ONCE, all recurring, and last 50 past
  // Use a reasonable lookback window to avoid unbounded queries
  const lookbackDate = new Date(israelDate);
  lookbackDate.setDate(lookbackDate.getDate() - 90);
  const allLessons = await prisma.lesson.findMany({
    where: {
      ...teacherFilter,
      OR: [
        { recurrence: { not: "ONCE" } },
        { recurrence: "ONCE", date: { gte: lookbackDate } },
      ],
    },
    include: lessonInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const lessons = allLessons.filter((l) => !isLessonPast(l));
  const pastLessons = allLessons
    .filter((l) => isLessonPast(l))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.endTime.localeCompare(a.endTime))
    .slice(0, 50);

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
