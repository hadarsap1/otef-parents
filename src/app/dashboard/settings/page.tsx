import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AccountSettings } from "@/components/account-settings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Check if user has a valid Google refresh token (calendar access)
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { refresh_token: true },
  });

  const hasCalendarAccess = !!account?.refresh_token;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">הגדרות חשבון</h1>
        <Link
          href="/dashboard"
          className="text-sm text-primary flex items-center gap-1"
        >
          <ChevronRight className="h-4 w-4" />
          חזרה
        </Link>
      </div>

      <AccountSettings
        user={session.user}
        hasCalendarAccess={hasCalendarAccess}
      />
    </div>
  );
}
