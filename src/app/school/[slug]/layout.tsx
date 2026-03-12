import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard-nav";
import { SchoolNav } from "@/components/school-nav";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { slug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!school) redirect("/dashboard");

  // Check membership (SUPERADMIN bypasses)
  if (session.user.role !== "SUPERADMIN") {
    const membership = await prisma.schoolMember.findUnique({
      where: {
        schoolId_userId: { schoolId: school.id, userId: session.user.id },
      },
    });
    if (!membership) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <DashboardNav user={session.user} />
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-1.5 mb-3">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ראשי
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-xl font-bold truncate">{school.name}</h1>
        </div>
        <SchoolNav slug={school.slug} />
        {children}
      </div>
      <BottomNav role={session.user.role} />
    </div>
  );
}
