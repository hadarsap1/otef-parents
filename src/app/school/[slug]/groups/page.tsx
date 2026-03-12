import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersRound } from "lucide-react";

export default async function SchoolGroupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!school) redirect("/dashboard");

  const groups = await prisma.group.findMany({
    where: { schoolId: school.id },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { members: true, lessons: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{groups.length} קבוצות</span>
      </div>

      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UsersRound className="h-3.5 w-3.5" />
                {group._count.members} ילדים
              </span>
              <span>{group._count.lessons} שיעורים</span>
              {group.teacher.name && (
                <span>מורה: {group.teacher.name}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {groups.length === 0 && (
        <EmptyState
          icon={UsersRound}
          title="אין קבוצות עדיין"
          description="ייבא תלמידים או צור קבוצה ידנית כדי להתחיל."
        />
      )}
    </div>
  );
}
