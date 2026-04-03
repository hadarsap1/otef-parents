import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "תנאי שימוש - Clearday",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; חזרה לדף הבית
          </Link>
          <h1 className="mt-4 text-3xl font-bold">תנאי שימוש</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            עדכון אחרון: מרץ 2026
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">הסכמה לתנאים</h2>
          <p className="text-muted-foreground leading-relaxed">
            בעצם השימוש באפליקציית &quot;Clearday&quot; (להלן:
            &quot;האפליקציה&quot;), אתם מסכימים לתנאי שימוש אלה. אם אינכם
            מסכימים לתנאים, אנא הימנעו משימוש באפליקציה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">תיאור השירות</h2>
          <p className="text-muted-foreground leading-relaxed">
            &quot;Clearday&quot; היא אפליקציה לניהול לוח זמנים משפחתי - שיעורים,
            מפגשים, פליידייטים ואירועים אישיים. האפליקציה מאפשרת סנכרון אירועים
            ליומן Google ושיתוף לוח זמנים בין הורים ומורים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">חשבון משתמש</h2>
          <ul className="list-disc pr-6 space-y-2 text-muted-foreground">
            <li>ההתחברות מתבצעת באמצעות חשבון Google שלכם.</li>
            <li>אתם אחראים לשמור על אבטחת חשבון Google שלכם.</li>
            <li>
              ניתן למחוק את החשבון בכל עת דרך הגדרות החשבון באפליקציה, או
              בפנייה אלינו במייל.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">גישה ליומן Google</h2>
          <p className="text-muted-foreground leading-relaxed">
            האפליקציה מבקשת הרשאה להוסיף ולמחוק אירועים ביומן Google שלכם.
            האפליקציה <strong>לא</strong> קוראת את תוכן היומן הקיים שלכם, ואינה
            משנה אירועים שלא נוצרו דרכה. ניתן לבטל את ההרשאה בכל עת דרך
            הגדרות החשבון באפליקציה או דרך{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              הגדרות חשבון Google
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">שימוש מותר</h2>
          <ul className="list-disc pr-6 space-y-2 text-muted-foreground">
            <li>השתמשו באפליקציה למטרות אישיות ומשפחתיות בלבד.</li>
            <li>אל תזינו מידע שאינו שלכם או של משפחתכם ללא הסכמה.</li>
            <li>אל תנסו לגשת למידע של משתמשים אחרים שלא שותף איתכם.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">הגבלת אחריות</h2>
          <p className="text-muted-foreground leading-relaxed">
            האפליקציה מסופקת &quot;כמות שהיא&quot; (as-is), ללא אחריות מכל סוג
            שהוא. אנחנו משתדלים לשמור על זמינות ודיוק השירות, אך אין אנו
            אחראים לנזק שעלול להיגרם משימוש באפליקציה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">שינויים בתנאים</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו שומרים לעצמנו את הזכות לעדכן תנאים אלה. שינויים מהותיים
            יפורסמו באפליקציה. המשך שימוש לאחר עדכון מהווה הסכמה לתנאים
            המעודכנים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">יצירת קשר</h2>
          <p className="text-muted-foreground leading-relaxed">
            לשאלות בנושא תנאי השימוש, ניתן לפנות אלינו בכתובת:{" "}
            <a
              href="mailto:hadarsap@gmail.com"
              className="text-primary hover:underline"
            >
              hadarsap@gmail.com
            </a>
          </p>
        </section>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Clearday
        </div>
      </div>
    </div>
  );
}
