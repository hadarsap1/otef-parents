import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DailyFeedWrapper } from "@/components/daily-feed-wrapper";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        שלום, {session?.user?.name?.split(" ")[0] ?? "הורה"} 👋
      </h1>

      <DailyFeedWrapper />
    </div>
  );
}
