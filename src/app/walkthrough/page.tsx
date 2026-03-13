"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  Users,
  Home,
  PartyPopper,
  Clock,
  Calendar,
  UserPlus,
  Search,
  CalendarPlus,
  HandHeart,
  GraduationCap,
  Plus,
  Settings,
  Mail,
  UsersRound,
  BookOpen,
  MapPin,
  Video,
  ArrowLeft,
  Upload,
  ListChecks,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Slide type                                                         */
/* ------------------------------------------------------------------ */
interface Slide {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  subtitle?: string;
  bullets: { icon?: React.ElementType; text: string }[];
  visual?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Mini phone mock component                                          */
/* ------------------------------------------------------------------ */
function PhoneMock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-52 rounded-3xl border-2 border-border/80 bg-card shadow-lg overflow-hidden">
      {/* notch */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1.5 w-16 rounded-full bg-border/60" />
      </div>
      <div className="px-3 pb-4 text-[11px] leading-snug text-muted-foreground space-y-2">
        {children}
      </div>
    </div>
  );
}

function MiniNav({ active }: { active: string }) {
  const tabs = [
    { id: "home", label: "ראשי", icon: Home },
    { id: "children", label: "ילדים", icon: Users },
    { id: "lessons", label: "שיעורים", icon: Clock },
    { id: "playdates", label: "מפגשים", icon: PartyPopper },
  ];
  return (
    <div className="flex justify-around border-t border-border/60 pt-1.5 mt-2">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`flex flex-col items-center gap-0.5 ${active === t.id ? "text-primary font-bold" : "text-muted-foreground/60"}`}
        >
          <t.icon className="h-3 w-3" />
          <span className="text-[8px]">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniCard({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background"}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Parent slides                                                      */
/* ------------------------------------------------------------------ */
const parentSlides: Slide[] = [
  {
    icon: LogIn,
    iconBg: "bg-blue-100 text-blue-600",
    title: "התחברות",
    subtitle: "מתחילים תוך שניות",
    bullets: [
      { icon: LogIn, text: "לחצו על ״התחברות עם Google״" },
      { text: "בחרו את חשבון Google שלכם" },
      { text: "זה הכל! נכנסתם לאפליקציה" },
    ],
    visual: (
      <PhoneMock>
        <div className="text-center space-y-2 py-2">
          <div className="text-base font-bold text-foreground">לו״ז הארי</div>
          <div className="text-[10px] text-muted-foreground">לוח זמנים למשפחה</div>
          <div className="mx-auto mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white">
            <svg className="h-3 w-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor"/></svg>
            התחברות עם Google
          </div>
        </div>
      </PhoneMock>
    ),
  },
  {
    icon: Users,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "שיוך ילדים",
    subtitle: "בחרו את הילד/ה שלכם מהרשימה",
    bullets: [
      { icon: Users, text: "עברו ללשונית ״ילדים״ בתפריט התחתון" },
      { icon: Search, text: "חפשו את שם הילד/ה ברשימה לפי קבוצה" },
      { text: "לחצו ״זה הילד/ה שלי״ - וזהו!" },
      { text: "יש אחים? אפשר לשייך כמה ילדים" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">ילדים</div>
          <MiniCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-primary" />
                <span className="text-foreground font-medium">כיתה א׳</span>
              </div>
            </div>
          </MiniCard>
          <MiniCard highlight>
            <div className="flex items-center justify-between">
              <span>נועה כהן</span>
              <span className="text-[8px] text-primary font-bold">זה הילד/ה שלי</span>
            </div>
          </MiniCard>
          <MiniCard>
            <div className="flex items-center justify-between">
              <span>יובל לוי</span>
              <span className="text-[8px] text-muted-foreground">זה הילד/ה שלי</span>
            </div>
          </MiniCard>
        </div>
        <MiniNav active="children" />
      </PhoneMock>
    ),
  },
  {
    icon: Home,
    iconBg: "bg-violet-100 text-violet-600",
    title: "העמוד הראשי",
    subtitle: "כל מה שקורה היום - במבט אחד",
    bullets: [
      { icon: Clock, text: "שיעורים של היום עם שעות וקישורי זום" },
      { icon: PartyPopper, text: "מפגשים קרובים" },
      { icon: CalendarPlus, text: "אירועים אישיים שהוספתם" },
      { text: "הכל מסודר לפי תאריך" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="text-foreground font-medium text-xs">שלום, הדר 👋</div>
          <MiniCard>
            <div className="flex items-center gap-1 text-foreground font-medium">
              <Clock className="h-2.5 w-2.5 text-primary" />
              מתמטיקה · 09:00
            </div>
            <div className="text-[9px] mt-0.5 flex items-center gap-0.5">
              <Video className="h-2 w-2" /> קישור זום
            </div>
          </MiniCard>
          <MiniCard highlight>
            <div className="flex items-center gap-1 text-foreground font-medium">
              <PartyPopper className="h-2.5 w-2.5 text-orange-500" />
              פליידייט · 16:00
            </div>
            <div className="text-[9px] mt-0.5 flex items-center gap-0.5">
              <MapPin className="h-2 w-2" /> רח׳ הדקל 5
            </div>
          </MiniCard>
        </div>
        <MiniNav active="home" />
      </PhoneMock>
    ),
  },
  {
    icon: PartyPopper,
    iconBg: "bg-orange-100 text-orange-600",
    title: "מפגשים (פליידייטים)",
    subtitle: "יצירה והצטרפות למפגשים",
    bullets: [
      { icon: Plus, text: "לחצו ״אירוח חדש״ ליצירת מפגש" },
      { text: "בחרו קבוצה, כתובת, תאריך ומספר מקומות" },
      { icon: HandHeart, text: "הצטרפו למפגשים קיימים בלחיצה" },
      { text: "ביטול השתתפות אפשרי בכל עת" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground text-xs">מפגשים</span>
            <span className="text-[8px] bg-primary text-white rounded px-1.5 py-0.5">+ אירוח חדש</span>
          </div>
          <MiniCard highlight>
            <div className="text-foreground font-medium">פליידייט - כיתה א׳</div>
            <div className="text-[9px] space-y-0.5 mt-1">
              <div className="flex items-center gap-0.5"><MapPin className="h-2 w-2" /> רח׳ הדקל 5</div>
              <div>📅 יום שלישי 16:00-18:00</div>
              <div className="flex justify-between mt-1">
                <span className="bg-green-100 text-green-700 text-[8px] px-1 rounded">פתוח · 3 מקומות</span>
                <span className="text-primary font-bold text-[8px]">הצטרפות</span>
              </div>
            </div>
          </MiniCard>
          <MiniCard>
            <div className="text-foreground font-medium">פליידייט - גן דבורה</div>
            <div className="text-[9px] mt-1">
              <span className="bg-red-100 text-red-700 text-[8px] px-1 rounded">מלא</span>
            </div>
          </MiniCard>
        </div>
        <MiniNav active="playdates" />
      </PhoneMock>
    ),
  },
  {
    icon: Clock,
    iconBg: "bg-sky-100 text-sky-600",
    title: "שיעורים",
    subtitle: "לוח שיעורים שבועי לפי קבוצה",
    bullets: [
      { text: "ראו את כל השיעורים לפי ימים בשבוע" },
      { text: "השיעורים מופיעים אוטומטית לפי הקבוצות שלכם" },
      { icon: Video, text: "קישור זום יופיע ליד שיעורים אונליין" },
      { icon: Calendar, text: "הוסיפו שיעור ליומן Google בלחיצה" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">שיעורים</div>
          <div className="text-[9px] font-medium text-foreground">יום ראשון</div>
          <MiniCard>
            <div className="flex justify-between">
              <span className="text-foreground font-medium">מתמטיקה</span>
              <span className="text-[9px]">09:00-09:45</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] flex items-center gap-0.5"><Video className="h-2 w-2" /> זום</span>
              <span className="text-[8px] flex items-center gap-0.5"><Calendar className="h-2 w-2" /> ליומן</span>
            </div>
          </MiniCard>
          <MiniCard highlight>
            <div className="flex justify-between">
              <span className="text-foreground font-medium">אנגלית</span>
              <span className="text-[9px]">10:00-10:45</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted-foreground">כיתה א׳</span>
              <span className="text-[8px] flex items-center gap-0.5"><Calendar className="h-2 w-2" /> ליומן</span>
            </div>
          </MiniCard>
        </div>
        <MiniNav active="lessons" />
      </PhoneMock>
    ),
  },
  {
    icon: Plus,
    iconBg: "bg-amber-100 text-amber-600",
    title: "הוספת שיעורים ידנית",
    subtitle: "קיבלתם פרטים בוואטסאפ? הוסיפו בקלות",
    bullets: [
      { icon: Clock, text: "בעמוד ״שיעורים״ לחצו על ״+ שיעור חדש״" },
      { text: "הזינו את שם השיעור, היום והשעה" },
      { icon: Video, text: "הדביקו קישור זום שקיבלתם בהודעה" },
      { text: "השיעור יופיע בלוח השיעורים ובפיד היומי" },
      { icon: Calendar, text: "אפשר גם לסנכרן ליומן Google" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">שיעור חדש</div>
          <MiniCard highlight>
            <div className="text-[9px] text-center text-muted-foreground mb-1">
              📱 קיבלתם בוואטסאפ:
            </div>
            <div className="text-[8px] bg-green-50 border border-green-200 rounded p-1.5 text-foreground leading-relaxed">
              &quot;שיעור יוגה יום שלישי 17:00<br/>
              זום: https://zoom.us/j/123...&quot;
            </div>
          </MiniCard>
          <div className="space-y-1">
            <div className="rounded border border-border/60 px-2 py-1 text-[9px]">
              <span className="text-muted-foreground">נושא:</span> יוגה
            </div>
            <div className="flex gap-1">
              <div className="flex-1 rounded border border-border/60 px-2 py-1 text-[9px]">שלישי</div>
              <div className="flex-1 rounded border border-border/60 px-2 py-1 text-[9px]">17:00</div>
            </div>
            <div className="rounded border border-border/60 px-2 py-1 text-[9px] flex items-center gap-1">
              <Video className="h-2.5 w-2.5 text-muted-foreground" />
              zoom.us/j/123...
            </div>
          </div>
          <div className="text-center text-[9px] bg-primary text-white rounded py-1.5 font-medium">שמירה</div>
        </div>
      </PhoneMock>
    ),
  },
  {
    icon: Calendar,
    iconBg: "bg-indigo-100 text-indigo-600",
    title: "סנכרון יומן ומייל",
    subtitle: "לא לפספס שום דבר",
    bullets: [
      { icon: Calendar, text: "כפתור ״ליומן״ ליד כל שיעור/מפגש/אירוע" },
      { text: "האירוע מתווסף ישירות ליומן Google" },
      { icon: Mail, text: "הפעילו סיכום יומי במייל מהגדרות הפרופיל" },
      { text: "כל בוקר תקבלו מייל עם סיכום היום" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-2 py-1">
          <MiniCard highlight>
            <div className="text-center space-y-1">
              <Calendar className="h-5 w-5 mx-auto text-primary" />
              <div className="text-foreground font-medium text-[10px]">נוסף ליומן!</div>
              <div className="text-[9px]">מתמטיקה · יום ראשון 09:00</div>
            </div>
          </MiniCard>
          <MiniCard>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <div>
                <div className="text-foreground font-medium text-[10px]">סיכום יומי במייל</div>
                <div className="text-[9px]">כל בוקר ב-07:00</div>
              </div>
              <div className="mr-auto h-3 w-6 rounded-full bg-primary" />
            </div>
          </MiniCard>
        </div>
      </PhoneMock>
    ),
  },
  {
    icon: UserPlus,
    iconBg: "bg-pink-100 text-pink-600",
    title: "שיתוף עם הורה נוסף",
    subtitle: "שני הורים, אותם ילדים",
    bullets: [
      { text: "בעמוד ילדים, לחצו ״שיתוף עם הורה נוסף״" },
      { text: "קוד בן 6 תווים ייווצר (בתוקף ל-24 שעות)" },
      { text: "שלחו את הקוד להורה השני" },
      { text: "ההורה מזין את הקוד - ורואה את אותם ילדים" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-2 py-1">
          <div className="text-center">
            <UserPlus className="h-5 w-5 mx-auto text-pink-500 mb-1" />
            <div className="text-foreground font-medium text-[10px]">שיתוף עם הורה נוסף</div>
          </div>
          <MiniCard highlight>
            <div className="text-center space-y-1">
              <div className="text-[9px]">הקוד שלכם:</div>
              <div className="text-lg font-mono font-bold text-primary tracking-widest">A7K9X2</div>
              <div className="text-[8px] text-muted-foreground">בתוקף ל-24 שעות</div>
            </div>
          </MiniCard>
          <div className="text-center text-[9px]">שלחו את הקוד בוואטסאפ 💬</div>
        </div>
      </PhoneMock>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Teacher slides                                                     */
/* ------------------------------------------------------------------ */
const teacherSlides: Slide[] = [
  {
    icon: UsersRound,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "ניהול קבוצות",
    subtitle: "יצירה וניהול של כיתות וגנים",
    bullets: [
      { icon: UsersRound, text: "עברו ללשונית ״ניהול״ בתפריט התחתון" },
      { icon: Plus, text: "צרו קבוצה חדשה (כיתה/גן)" },
      { text: "הוסיפו ילדים לקבוצה" },
      { text: "שלחו קוד הצטרפות להורים" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">ניהול</div>
          <div className="flex gap-1">
            <span className="text-[9px] bg-primary text-white rounded px-2 py-0.5">קבוצות</span>
            <span className="text-[9px] bg-muted rounded px-2 py-0.5">שיעורים</span>
          </div>
          <MiniCard highlight>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-foreground font-medium">כיתה א׳</div>
                <div className="text-[9px]">12 ילדים</div>
              </div>
              <Settings className="h-3 w-3 text-muted-foreground" />
            </div>
          </MiniCard>
          <MiniCard>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-foreground font-medium">גן דבורה</div>
                <div className="text-[9px]">8 ילדים</div>
              </div>
              <Settings className="h-3 w-3 text-muted-foreground" />
            </div>
          </MiniCard>
          <div className="text-center text-[8px] bg-primary/10 text-primary rounded py-1 font-medium">+ קבוצה חדשה</div>
        </div>
      </PhoneMock>
    ),
  },
  {
    icon: Upload,
    iconBg: "bg-amber-100 text-amber-600",
    title: "הוספת תלמידים",
    subtitle: "הוסיפו תלמידים ידנית או ייבאו רשימה",
    bullets: [
      { icon: UserPlus, text: "הוספה ידנית - בכרטיס הקבוצה, לחצו ״הוספת ילד״" },
      { icon: Upload, text: "ייבוא רשימה - הדביקו שמות, רשימה מקובצת לפי כיתות, או CSV" },
      { icon: ListChecks, text: "תצוגה מקדימה לבדיקה לפני אישור סופי" },
      { text: "לאחר הייבוא, ההורים יצטרפו עם קוד הזמנה" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">ייבוא תלמידים</div>
          <div className="flex gap-1 mb-1">
            <span className="text-[9px] bg-primary text-white rounded px-2 py-0.5">רשימה</span>
            <span className="text-[9px] bg-muted rounded px-2 py-0.5">לפי כיתה</span>
            <span className="text-[9px] bg-muted rounded px-2 py-0.5">CSV</span>
          </div>
          <div className="rounded border border-dashed border-border/60 px-2 py-2 text-[9px] text-muted-foreground text-center">
            הדביקו רשימת שמות כאן...
          </div>
          <div className="space-y-0.5">
            <MiniCard highlight>
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-2.5 w-2.5 text-primary" />
                <span className="text-foreground font-medium">דנה כהן</span>
                <span className="text-[8px] text-muted-foreground mr-auto">כיתה א׳</span>
              </div>
            </MiniCard>
            <MiniCard>
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-2.5 w-2.5 text-primary" />
                <span className="text-foreground font-medium">יוסי לוי</span>
                <span className="text-[8px] text-muted-foreground mr-auto">כיתה א׳</span>
              </div>
            </MiniCard>
          </div>
          <div className="text-center text-[9px] bg-primary text-white rounded py-1.5 font-medium">אישור ייבוא</div>
        </div>
      </PhoneMock>
    ),
  },
  {
    icon: BookOpen,
    iconBg: "bg-sky-100 text-sky-600",
    title: "יצירת שיעורים",
    subtitle: "הגדירו לוח שיעורים שבועי",
    bullets: [
      { text: "עברו ללשונית ״שיעורים״ בעמוד הניהול" },
      { icon: Plus, text: "לחצו ״שיעור חדש״" },
      { text: "בחרו קבוצה, נושא, יום, שעה" },
      { icon: Video, text: "הוסיפו קישור זום (אופציונלי)" },
      { text: "השיעורים יופיעו אוטומטית להורים בקבוצה" },
    ],
    visual: (
      <PhoneMock>
        <div className="space-y-1.5">
          <div className="font-bold text-foreground text-xs">שיעור חדש</div>
          <div className="space-y-1">
            <div className="rounded border border-border/60 px-2 py-1 text-[9px]">
              <span className="text-muted-foreground">קבוצה:</span> כיתה א׳
            </div>
            <div className="rounded border border-border/60 px-2 py-1 text-[9px]">
              <span className="text-muted-foreground">נושא:</span> מתמטיקה
            </div>
            <div className="rounded border border-border/60 px-2 py-1 text-[9px]">
              <span className="text-muted-foreground">יום:</span> ראשון
            </div>
            <div className="flex gap-1">
              <div className="flex-1 rounded border border-border/60 px-2 py-1 text-[9px]">09:00</div>
              <div className="flex-1 rounded border border-border/60 px-2 py-1 text-[9px]">09:45</div>
            </div>
            <div className="rounded border border-border/60 px-2 py-1 text-[9px] flex items-center gap-1">
              <Video className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-muted-foreground">קישור זום...</span>
            </div>
          </div>
          <div className="text-center text-[9px] bg-primary text-white rounded py-1.5 font-medium">שמירה</div>
        </div>
      </PhoneMock>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Walkthrough page                                                   */
/* ------------------------------------------------------------------ */
type Track = "parents" | "teachers";

export default function WalkthroughPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [step, setStep] = useState(0);

  const slides = track === "teachers" ? teacherSlides : parentSlides;
  const current = slides[step];
  const isLast = step === slides.length - 1;

  // Track selection screen
  if (!track) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-3xl font-bold">לו״ז הארי</h1>
            <p className="text-muted-foreground mt-1">סיור מודרך באפליקציה</p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-14 text-base gap-3"
              size="lg"
              onClick={() => { setTrack("parents"); setStep(0); }}
            >
              <Users className="h-5 w-5" />
              אני הורה
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base gap-3"
              size="lg"
              onClick={() => { setTrack("teachers"); setStep(0); }}
            >
              <GraduationCap className="h-5 w-5" />
              אני מורה
            </Button>
          </div>

          <a
            href="/login"
            className="inline-block text-sm text-muted-foreground hover:underline"
          >
            &larr; חזרה להתחברות
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => { setTrack(null); setStep(0); }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {track === "teachers" ? "מורים" : "הורים"}
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-border hover:bg-primary/30"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-12 text-left">
          {step + 1}/{slides.length}
        </span>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
        {/* Icon + Title */}
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${current.iconBg}`}>
          <current.icon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold mt-3">{current.title}</h2>
        {current.subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
        )}

        {/* Phone visual */}
        {current.visual && (
          <div className="mt-5">
            {current.visual}
          </div>
        )}

        {/* Bullets */}
        <div className="mt-5 w-full space-y-2.5">
          {current.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                {b.icon ? <b.icon className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="text-sm leading-relaxed">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t px-4 py-4 flex gap-3 max-w-lg mx-auto w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          <ChevronRight className="h-4 w-4" />
          הקודם
        </Button>
        {isLast ? (
          <a href="/login" className="flex-1">
            <Button className="w-full">
              להתחברות
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </a>
        ) : (
          <Button
            className="flex-1"
            onClick={() => setStep(step + 1)}
          >
            הבא
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
