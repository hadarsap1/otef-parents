"use client";

import Link from "next/link";
import { School, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SchoolInfo {
  schoolId: string;
  slug: string;
  name: string;
  role: string;
}

export function SchoolSwitcher({ schools }: { schools: SchoolInfo[] }) {
  if (schools.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">בתי ספר</h2>
      <div className="grid gap-2">
        {schools.map((school) => (
          <Link key={school.schoolId} href={`/school/${school.slug}`}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <School className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{school.name}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full shrink-0">
                  {school.role === "OWNER" ? "בעלים" : school.role === "ADMIN" ? "מנהל" : "מורה"}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CreateSchoolCard() {
  return (
    <Link href="/school/new">
      <Card className="hover:border-primary/30 transition-colors cursor-pointer border-dashed">
        <CardContent className="flex items-center gap-3 py-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">יצירת בית ספר חדש</p>
        </CardContent>
      </Card>
    </Link>
  );
}
