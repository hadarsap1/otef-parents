import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeacherDashboardTabs } from "@/components/teacher-dashboard-tabs";
import { SchoolSwitcher, CreateSchoolCard } from "@/components/school-switcher";

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [groups, lessons] = await Promise.all([
    prisma.group.findMany({
      where: { teacherId: session.user.id },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lesson.findMany({
      where: { teacherId: session.user.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            members: { select: { child: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">לוח מורה</h1>

      {/* School cards */}
      <SchoolSwitcher schools={session.user.schools ?? []} />
      <CreateSchoolCard />

      <TeacherDashboardTabs
        initialGroups={groups}
        initialLessons={lessons}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
