import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminPanel } from "@/components/admin-panel";
import { CreateSchoolCard } from "@/components/school-switcher";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">ניהול מערכת</h1>
      <CreateSchoolCard />
      <AdminPanel />
    </div>
  );
}
