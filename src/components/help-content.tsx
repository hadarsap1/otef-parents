import {
  Users,
  Home,
  PartyPopper,
  Clock,
  UsersRound,
  Shield,
  LogIn,
  Calendar,
  Mail,
} from "lucide-react";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <h2 className="font-semibold text-base">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0 mt-0.5">
        {num}
      </span>
      <span>{text}</span>
    </div>
  );
}

export function HelpContent({
  showTeacher,
  showAdmin,
}: {
  showTeacher?: boolean;
  showAdmin?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        ברוכים הבאים! כאן תמצאו הסבר קצר על כל מה שאפשר לעשות באפליקציה.
      </p>

      {/* Getting started */}
      <Section icon={LogIn} title="התחלה מהירה">
        <Step num={1} text='היכנסו עם חשבון Google דרך מסך הכניסה.' />
        <Step num={2} text='הזינו קוד הזמנה שקיבלתם מהמורה כדי להצטרף לכיתה בבית הספר.' />
        <Step num={3} text='עברו ללשונית "ילדים" ובחרו את הילד/ה שלכם מהרשימה.' />
        <Step num={4} text="זהו! אתם מחוברים לכיתה ויכולים לראות מפגשים ושיעורים." />
      </Section>

      {/* Children / Claim */}
      <Section icon={Users} title='ילדים'>
        <p>
          בעמוד <strong>ילדים</strong> אפשר לבחור (לשייך) את הילד/ה שלכם מתוך
          רשימת הילדים המוכנה מראש לפי כיתה (כיתה/גן).
          הרשימה מציגה רק ילדים מבתי הספר שאתם שייכים אליהם.
        </p>
        <Step num={1} text='לחצו על "זה הילד/ה שלי" ליד השם המתאים.' />
        <Step num={2} text="הילד/ה יופיע ברשימת הילדים שלכם." />
        <Step num={3} text="אפשר לשייך יותר מילד אחד אם יש אחים." />
        <p>
          אחרי שהילד/ה משויך/ת, אתם מחוברים אוטומטית לכיתה שלו
          ותוכלו ליצור ולהצטרף למפגשים.
        </p>
      </Section>

      {/* Playdates */}
      <Section icon={PartyPopper} title='מפגשים'>
        <p>
          בעמוד <strong>מפגשים</strong> אפשר לראות את כל המפגשים הפתוחים בכיתות
          שלכם, ליצור מפגש חדש או להצטרף למפגש קיים.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">יצירת מפגש:</p>
          <Step num={1} text='לחצו על "אירוח חדש".' />
          <Step num={2} text="בחרו כיתה, מלאו כתובת, תאריך, שעה ומספר מקומות." />
          <Step num={3} text="המפגש יופיע לכל ההורים בכיתה." />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">הצטרפות למפגש:</p>
          <Step num={1} text='לחצו "הצטרפות" על מפגש פתוח.' />
          <Step num={2} text="בחרו את הילד/ה שתרצו לשלוח." />
          <Step num={3} text="אפשר גם לבטל הצטרפות בכל עת." />
        </div>
        <p>
          מי שיצר את המפגש יכול לבטל אותו. הרשימה מתעדכנת אוטומטית.
        </p>
      </Section>

      {/* Lessons */}
      <Section icon={Clock} title='שיעורים'>
        <p>
          בעמוד <strong>שיעורים</strong> מוצגים כל השיעורים הקרובים לפי תאריך.
        </p>
        <Step num={1} text="ראו את רשימת השיעורים לפי תאריכים." />
        <Step num={2} text="השיעורים מופיעים אוטומטית לפי הכיתות שלכם." />
        <Step num={3} text="קישור לזום (אם קיים) יופיע ליד השיעור." />
        <Step num={4} text="שיעורים עם משבצות זמן — בחרו את המשבצת המתאימה לכם." />
        <div className="space-y-1">
          <p className="font-medium text-foreground">הוספת שיעורים ידנית:</p>
          <p>
            קיבלתם פרטי שיעור בוואטסאפ או במייל? אפשר להוסיף אותם בעצמכם.
          </p>
          <Step num={1} text='לחצו על "+ שיעור חדש" בעמוד השיעורים.' />
          <Step num={2} text="הזינו את שם השיעור, תאריך, שעה וקישור זום (אם יש)." />
          <Step num={3} text="השיעור יופיע ברשימת השיעורים, בפיד היומי ואפשר לסנכרן ליומן Google." />
        </div>
      </Section>

      {/* Daily feed */}
      <Section icon={Home} title='עמוד ראשי'>
        <p>
          העמוד הראשי מציג <strong>פיד יומי</strong> עם כל מה שקורה היום:
          שיעורים, מפגשים קרובים ועדכונים חשובים.
        </p>
      </Section>

      {/* Google Calendar sync */}
      <Section icon={Calendar} title='סנכרון יומן Google'>
        <p>
          אפשר להוסיף שיעורים, מפגשים ואירועים אישיים ישירות ליומן Google שלכם
          בלחיצת כפתור.
        </p>
        <Step num={1} text='ליד כל שיעור/מפגש/אירוע תמצאו כפתור "ליומן" עם אייקון יומן.' />
        <Step num={2} text="לחצו על הכפתור והאירוע ייווסף אוטומטית ליומן Google שלכם." />
        <Step num={3} text='אם מופיעה שגיאה, התנתקו והתחברו מחדש כדי לאפשר גישה ליומן.' />
        <p>
          <strong>טיפ:</strong> כפתור היומן מופיע בעמודי המפגשים, השיעורים,
          האירועים האישיים ובפיד היומי בעמוד הראשי.
        </p>
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <p className="font-medium text-foreground text-xs">מה האפליקציה עושה עם היומן שלכם?</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>
              <strong>מוסיפה</strong> אירועים ליומן רק כשאתם לוחצים על כפתור
              היומן.
            </li>
            <li>
              <strong>מוחקת</strong> אירועים מהיומן רק כשאתם מבטלים סנכרון.
            </li>
            <li>
              האפליקציה <strong>לא קוראת</strong> את תוכן היומן הקיים שלכם.
            </li>
          </ul>
          <p className="text-xs">
            ניתן לנתק את הגישה ליומן בכל עת דרך{" "}
            <a href="/dashboard/settings" className="text-primary hover:underline">
              הגדרות חשבון
            </a>
            .
          </p>
        </div>
      </Section>

      {/* Daily digest email */}
      <Section icon={Mail} title='מייל סיכום יומי'>
        <p>
          אפשר לקבל מייל יומי בבוקר עם סיכום של כל מה שקורה היום: שיעורים,
          מפגשים ואירועים אישיים.
        </p>
        <Step num={1} text='לחצו על תמונת הפרופיל שלכם בפינה העליונה.' />
        <Step num={2} text='בחרו "הגדרות סיכום יומי" מהתפריט.' />
        <Step num={3} text="הפעילו את הסיכום היומי ובחרו את השעה הרצויה." />
        <p>
          המייל יישלח כל בוקר עם כל הפרטים: שעות שיעורים, קישורי זום,
          מפגשים וכתובות, ואירועים אישיים.
        </p>
      </Section>

      {/* Teacher section */}
      {showTeacher && (
        <Section icon={UsersRound} title='ניהול מורה'>
          <p>כמורה, יש לכם גישה ללשונית <strong>ניהול</strong> עם הכלים הבאים:</p>

          <h3 className="font-semibold text-sm mt-3 mb-1">ניהול כיתות</h3>
          <Step num={1} text="יצירת כיתה חדשה עם שם ותיאור." />
          <Step num={2} text="עריכת שם ותיאור של כיתה קיימת." />
          <Step num={3} text="מחיקת כיתה (עם אישור לפני המחיקה)." />

          <h3 className="font-semibold text-sm mt-3 mb-1">הוספת תלמידים</h3>
          <p>
            אפשר להוסיף תלמידים לכיתה בשתי דרכים:
          </p>
          <Step num={4} text="הוספה ידנית - בכרטיס הכיתה, לחצו על ״הוספת ילד״ והזינו שם." />
          <Step num={5} text="ייבוא רשימה - בעמוד בית הספר, לחצו על ״ייבוא תלמידים״. אפשר להדביק רשימת שמות (שם בכל שורה), רשימה מקובצת לפי כיתות, או קובץ CSV." />
          <Step num={6} text="לאחר הייבוא, תראו תצוגה מקדימה לבדיקה לפני אישור סופי." />

          <h3 className="font-semibold text-sm mt-3 mb-1">קוד הזמנה להורים</h3>
          <Step num={7} text='לחצו על "יצירת קוד הזמנה" בכרטיס הכיתה - הקוד תקף ל-7 ימים.' />
          <Step num={8} text="העתיקו את הקוד בלחיצה ושלחו להורים כדי שיצטרפו לכיתה." />

          <h3 className="font-semibold text-sm mt-3 mb-1">ניהול שיעורים</h3>
          <Step num={9} text="בחרו בית ספר, ואז כיתה (אופציונלי)." />
          <Step num={10} text="יצירת שיעור עם כותרת, תאריך, שעה וקישור זום." />
          <Step num={11} text="בחרו תדירות: חד פעמי, שבועי או יומי." />
          <Step num={12} text="חלוקה לקבוצות (אופציונלי): משבצות זמן (ההורים בוחרים) או שיבוץ ידני." />
          <Step num={13} text="עריכת שיעור קיים - שינוי כותרת, תאריך, שעות או קישור זום." />
          <Step num={14} text="מחיקת שיעור (עם אישור)." />

          <p className="mt-2">
            שימו לב: אם יש לכם גם ילדים, כל התכונות של הורים (שיוך ילדים,
            מפגשים) זמינות לכם בנוסף.
          </p>
        </Section>
      )}

      {/* Admin section */}
      {showAdmin && (
        <Section icon={Shield} title='ניהול מערכת (מנהל-על)'>
          <p>כמנהל-על, יש לכם גישה ללשונית <strong>ניהול</strong> עם:</p>
          <Step num={1} text="יצירת בתי ספר חדשים." />
          <Step num={2} text="צפייה בכל בתי הספר, הכיתות ורשימות הילדים." />
          <Step num={3} text="עריכת שמות כיתות והסרת ילדים." />
          <Step num={4} text="ניהול משתמשים: שינוי תפקיד (הורה/מורה/מנהל-על), איפוס נתונים ומחיקת משתמשים." />
        </Section>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <h2 className="font-semibold text-sm text-primary">טיפים</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>העמודים מתעדכנים אוטומטית - אין צורך לרענן.</li>
          <li>אפשר לשייך כמה ילדים לאותו חשבון הורה.</li>
          <li>המפגשים הם לפי כיתה - תראו רק מפגשים של הכיתות שלכם.</li>
          <li>כל בית ספר מנוהל בנפרד - תראו רק מידע מבתי הספר שאתם שייכים אליהם.</li>
          <li>לחצו על אייקון היומן ליד שיעור/מפגש כדי להוסיף ליומן Google.</li>
          <li>הגדרות סיכום יומי במייל - דרך תפריט הפרופיל בפינה העליונה.</li>
          <li>יש שאלה? פנו למנהל/ת הכיתה.</li>
        </ul>
      </div>
    </div>
  );
}
