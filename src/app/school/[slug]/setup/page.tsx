"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type SetupStep = "welcome" | "import" | "invite" | "done";

export default function SchoolSetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("welcome");

  if (step === "welcome") {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="py-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">בית הספר נוצר!</h2>
          <p className="text-sm text-muted-foreground">
            עכשיו אפשר לייבא תלמידים ולהזמין מורים.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setStep("import")}>ייבוא תלמידים</Button>
            <Button variant="outline" onClick={() => setStep("invite")}>
              הזמנת מורים
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(`/school/${slug}`)}
            >
              דלג למרכז בית הספר
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "import") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">ייבוא תלמידים</h2>
          <Button variant="outline" size="sm" onClick={() => setStep("invite")}>
            הבא: הזמנת מורים
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          ניתן לייבא מעמוד הייבוא המלא.
        </p>
        <Button onClick={() => router.push(`/school/${slug}/import`)}>
          מעבר לעמוד ייבוא
        </Button>
      </div>
    );
  }

  if (step === "invite") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">הזמנת מורים</h2>
          <Button variant="outline" size="sm" onClick={() => setStep("done")}>
            סיום
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          ניתן להוסיף מורים מעמוד הצוות.
        </p>
        <Button onClick={() => router.push(`/school/${slug}/members`)}>
          מעבר לניהול צוות
        </Button>
      </div>
    );
  }

  // done
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="py-8 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold">הכל מוכן!</h2>
        <p className="text-sm text-muted-foreground">
          בית הספר מוגדר ומוכן לשימוש.
        </p>
        <Button onClick={() => router.push(`/school/${slug}`)}>
          למרכז בית הספר
        </Button>
      </CardContent>
    </Card>
  );
}
