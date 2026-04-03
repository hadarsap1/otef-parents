import type { Metadata } from "next";
import Link from "next/link";
import { HelpContent } from "@/components/help-content";

export const metadata: Metadata = {
  title: "מדריך שימוש - Clearday",
};

export default function PublicHelpPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; חזרה להתחברות
          </Link>
          <h1 className="mt-4 text-3xl font-bold">מדריך שימוש</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clearday - לוח זמנים למשפחה
          </p>
        </div>

        <HelpContent />

        <div className="border-t pt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            התחברות לאפליקציה
          </Link>
        </div>
      </div>
    </div>
  );
}
