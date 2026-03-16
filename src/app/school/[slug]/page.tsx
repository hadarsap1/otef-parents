import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UsersRound, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function SchoolDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      _count: { select: { groups: true, members: true } },
    },
  });

  if (!school) redirect("/dashboard");

  const lessonCount = await prisma.lesson.count({
    where: { group: { schoolId: school.id } },
  });

  const childCount = await prisma.groupMember.count({
    where: { group: { schoolId: school.id } },
  });

  return (
    <div className="space-y-4">
      {school.description && (
        <p className="text-sm text-muted-foreground">{school.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/school/${slug}/groups`}>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{school._count.groups}</p>
                <p className="text-xs text-muted-foreground">כיתות</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/school/${slug}/members`}>
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{school._count.members}</p>
                <p className="text-xs text-muted-foreground">מורים</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{childCount}</p>
              <p className="text-xs text-muted-foreground">ילדים</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lessonCount}</p>
              <p className="text-xs text-muted-foreground">שיעורים</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
