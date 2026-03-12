import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { HelpContent } from "@/components/help-content";

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isTeacher =
    session.user.role === "TEACHER" || session.user.role === "SUPERADMIN";

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">מדריך שימוש</h1>
        <Link
          href="/dashboard"
          className="text-sm text-primary flex items-center gap-1"
        >
          חזרה
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      <HelpContent
        showTeacher={isTeacher}
        showAdmin={session.user.role === "SUPERADMIN"}
      />
    </div>
  );
}
