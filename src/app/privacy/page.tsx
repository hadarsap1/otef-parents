import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיניות פרטיות - לו״ז הארי",
};

export default function PrivacyPage() {
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
          <h1 className="mt-4 text-3xl font-bold">מדיניות פרטיות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            עדכון אחרון: מרץ 2026
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">מהי האפליקציה</h2>
          <p className="text-muted-foreground leading-relaxed">
            &quot;לו״ז הארי&quot; היא אפליקציה לניהול לוח זמנים משפחתי - שיעורים,
            מפגשים, פליידייטים ואירועים אישיים. האפליקציה מיועדת להורים בקהילת
            עוטף עזה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">מידע שאנחנו אוספים</h2>
          <ul className="list-disc pr-6 space-y-2 text-muted-foreground">
            <li>
              <strong>פרטי חשבון Google:</strong> שם, כתובת אימייל ותמונת פרופיל
              - לצורך התחברות לאפליקציה.
            </li>
            <li>
              <strong>מידע שהמשתמש מזין:</strong> שמות ילדים, שיעורים, מפגשים,
              אירועים אישיים וקישורי זום.
            </li>
            <li>
              <strong>גישה ליומן Google:</strong> האפליקציה מבקשת הרשאה להוסיף
              ולמחוק אירועים ביומן Google שלך, כדי לסנכרן אירועים מהאפליקציה
              ישירות ליומן.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">כיצד אנחנו משתמשים במידע</h2>
          <ul className="list-disc pr-6 space-y-2 text-muted-foreground">
            <li>הצגת לוח הזמנים המשפחתי שלך.</li>
            <li>סנכרון אירועים ליומן Google לפי בקשתך.</li>
            <li>שליחת תזכורות יומיות (אם הופעלו).</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            אנחנו <strong>לא</strong> קוראים את תוכן היומן שלך. האפליקציה רק
            מוסיפה ומוחקת אירועים שנוצרו דרכה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">שיתוף מידע עם צדדים שלישיים</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנחנו לא מוכרים, משתפים או מעבירים מידע אישי לצדדים שלישיים. המידע
            שלך מאוחסן באופן מאובטח ומשמש אך ורק לתפעול האפליקציה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">אחסון ואבטחת מידע</h2>
          <p className="text-muted-foreground leading-relaxed">
            המידע מאוחסן במסד נתונים מאובטח (PostgreSQL) המתארח על שרתי Neon.
            האפליקציה מתארחת על Vercel ומשתמשת בחיבורים מוצפנים (HTTPS).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">שליטה בנתונים שלך</h2>
          <ul className="list-disc pr-6 space-y-2 text-muted-foreground">
            <li>
              <strong>מחיקת חשבון:</strong> ניתן למחוק את כל המידע שלך בכל עת
              דרך הגדרות החשבון באפליקציה (תפריט &rarr; הגדרות חשבון &rarr;
              מחיקת חשבון). המחיקה כוללת את כל הנתונים: ילדים, שיעורים, מפגשים,
              אירועים ונתוני סנכרון.
            </li>
            <li>
              <strong>ניתוק יומן Google:</strong> ניתן לבטל את הרשאת הגישה
              ליומן Google בכל עת דרך הגדרות החשבון באפליקציה, או דרך{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                הגדרות חשבון Google
              </a>
              .
            </li>
            <li>
              <strong>פנייה ידנית:</strong> לחלופין, ניתן לפנות אלינו במייל
              המופיע למטה ונמחק את המידע עבורכם.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            עמידה במדיניות Google API
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            השימוש במידע שמתקבל מ-Google APIs עומד ב-
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , כולל דרישות ה-Limited Use. האפליקציה משתמשת בנתוני Google Calendar
            אך ורק להוספת ומחיקת אירועים שנוצרו דרכה, ואינה מעבירה נתונים
            אלה לצדדים שלישיים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">שינויים במדיניות</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו
            באפליקציה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">יצירת קשר</h2>
          <p className="text-muted-foreground leading-relaxed">
            לשאלות בנושא פרטיות, ניתן לפנות אלינו בכתובת:{" "}
            <a
              href="mailto:hadarsap@gmail.com"
              className="text-primary hover:underline"
            >
              hadarsap@gmail.com
            </a>
          </p>
        </section>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} לו״ז הארי
        </div>
      </div>
    </div>
  );
}
