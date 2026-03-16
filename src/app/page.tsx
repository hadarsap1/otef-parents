import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  Clock,
  PartyPopper,
  Calendar,
  Users,
  Mail,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="px-4 pt-16 pb-12 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-2xl font-bold">ל</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">לו״ז הארי</h1>
        <p className="mt-2 text-muted-foreground text-lg">
          לוח זמנים למשפחה
        </p>
        <p className="mt-4 mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
          אפליקציה לניהול לוח הזמנים המשפחתי - שיעורים, מפגשים בין ילדים,
          סנכרון ליומן Google וסיכום יומי במייל. הכל במקום אחד, בקלות ובמהירות.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            התחברות עם Google
          </Link>
          <Link
            href="/walkthrough"
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            סיור באפליקציה
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-lg px-4 pb-16 space-y-4">
        <Feature
          icon={Clock}
          title="לוח שיעורים שבועי"
          description="צפייה בשיעורים לפי תאריכים עם קישורי זום, בחירת משבצות זמן וסנכרון ליומן."
        />
        <Feature
          icon={PartyPopper}
          title="מפגשים בין ילדים"
          description="יצירת מפגשים (playdates) בכיתה, הצטרפות למפגשים קיימים וניהול הרשימה."
        />
        <Feature
          icon={Calendar}
          title="סנכרון יומן Google"
          description="הוספת שיעורים, מפגשים ואירועים ליומן Google בלחיצה. האפליקציה רק מוסיפה ומוחקת אירועים שנוצרו דרכה."
        />
        <Feature
          icon={Mail}
          title="סיכום יומי במייל"
          description="קבלו כל בוקר מייל עם סיכום מה קורה היום - שיעורים, מפגשים ואירועים."
        />
        <Feature
          icon={Users}
          title="ניהול ילדים וכיתות"
          description="שייכו את הילדים שלכם לכיתה וראו את כל הפעילויות במקום אחד."
        />
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground space-y-2">
        <p>לו״ז הארי - לוח זמנים למשפחה</p>
        <p>
          <Link href="/help" className="underline hover:text-foreground">
            מדריך שימוש
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-foreground">
            מדיניות פרטיות
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-foreground">
            תנאי שימוש
          </Link>
        </p>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-sm">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
