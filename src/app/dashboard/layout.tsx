import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { BottomNav } from "@/components/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <DashboardNav user={session.user} />
      <main className="max-w-lg mx-auto px-4 pb-24 pt-4">{children}</main>
      <BottomNav role={session.user.role} />
    </div>
  );
}
