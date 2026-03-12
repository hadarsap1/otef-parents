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
        <Step num={2} text='עברו ללשונית "ילדים" ובחרו את הילד/ה שלכם מהרשימה.' />
        <Step num={3} text="זהו! אתם מחוברים לקבוצה ויכולים לראות מפגשים ושיעורים." />
      </Section>

      {/* Children / Claim */}
      <Section icon={Users} title='ילדים'>
        <p>
          בעמוד <strong>ילדים</strong> אפשר לבחור (לשייך) את הילד/ה שלכם מתוך
          רשימת הילדים המוכנה מראש לפי קבוצה (כיתה/גן).
        </p>
        <Step num={1} text='לחצו על "זה הילד/ה שלי" ליד השם המתאים.' />
        <Step num={2} text="הילד/ה יופיע ברשימת הילדים שלכם." />
        <Step num={3} text="אפשר לשייך יותר מילד אחד אם יש אחים." />
        <p>
          אחרי שהילד/ה משויך/ת, אתם מחוברים אוטומטית לקבוצה שלו
          ותוכלו ליצור ולהצטרף למפגשים.
        </p>
      </Section>

      {/* Playdates */}
      <Section icon={PartyPopper} title='מפגשים'>
        <p>
          בעמוד <strong>מפגשים</strong> אפשר לראות את כל המפגשים הפתוחים בקבוצות
          שלכם, ליצור מפגש חדש או להצטרף למפגש קיים.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">יצירת מפגש:</p>
          <Step num={1} text='לחצו על "אירוח חדש".' />
          <Step num={2} text="בחרו קבוצה, מלאו כתובת, תאריך, שעה ומספר מקומות." />
          <Step num={3} text="המפגש יופיע לכל ההורים בקבוצה." />
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
          בעמוד <strong>שיעורים</strong> מוצג לוח השיעורים השבועי של הקבוצות.
        </p>
        <Step num={1} text="ראו את רשימת השיעורים לפי ימים." />
        <Step num={2} text="השיעורים מופיעים אוטומטית לפי הקבוצות שלכם." />
        <Step num={3} text="קישור לזום (אם קיים) יופיע ליד השיעור." />
        <div className="space-y-1">
          <p className="font-medium text-foreground">הוספת שיעורים ידנית:</p>
          <p>
            קיבלתם פרטי שיעור בוואטסאפ או במייל? אפשר להוסיף אותם בעצמכם.
          </p>
          <Step num={1} text='לחצו על "+ שיעור חדש" בעמוד השיעורים.' />
          <Step num={2} text="הזינו את שם השיעור, היום, השעה וקישור זום (אם יש)." />
          <Step num={3} text="השיעור יופיע בלוח השיעורים, בפיד היומי ואפשר לסנכרן ליומן Google." />
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
          <p>כמורה, יש לכם גישה ללשונית <strong>ניהול</strong> שם תוכלו:</p>
          <Step num={1} text="ליצור ולערוך קבוצות." />
          <Step num={2} text="להוסיף שיעורים עם יום, שעה, קישור זום ותיאור." />
          <Step num={3} text="לערוך ולמחוק שיעורים וקבוצות קיימים." />
          <Step num={4} text="לראות את רשימת הנרשמים לכל שיעור." />
          <p>
            שימו לב: אם יש לכם גם ילדים, כל התכונות של הורים (שיוך ילדים,
            מפגשים) זמינות לכם בנוסף.
          </p>
        </Section>
      )}

      {/* Admin section */}
      {showAdmin && (
        <Section icon={Shield} title='ניהול מערכת (מנהל-על)'>
          <p>כמנהל-על, יש לכם גישה ללשונית <strong>ניהול</strong> עם:</p>
          <Step num={1} text="צפייה בכל בתי הספר, הקבוצות ורשימות הילדים." />
          <Step num={2} text="עריכת שמות קבוצות והסרת ילדים." />
          <Step num={3} text="ניהול משתמשים: שינוי תפקיד (הורה/מורה/מנהל-על), איפוס נתונים ומחיקת משתמשים." />
        </Section>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <h2 className="font-semibold text-sm text-primary">טיפים</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>העמודים מתעדכנים אוטומטית — אין צורך לרענן.</li>
          <li>אפשר לשייך כמה ילדים לאותו חשבון הורה.</li>
          <li>המפגשים הם לפי קבוצה — תראו רק מפגשים של הקבוצות שלכם.</li>
          <li>לחצו על אייקון היומן ליד שיעור/מפגש כדי להוסיף ליומן Google.</li>
          <li>הגדרות סיכום יומי במייל — דרך תפריט הפרופיל בפינה העליונה.</li>
          <li>יש שאלה? פנו למנהל/ת הקבוצה.</li>
        </ul>
      </div>
    </div>
  );
}
