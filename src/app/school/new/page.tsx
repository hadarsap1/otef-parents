"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const slug = slugify(name);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError("");

    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });

    if (res.ok) {
      const school = await res.json();
      router.push(`/school/${school.slug}/setup`);
    } else {
      const data = await res.json();
      setError(data.error || "שגיאה ביצירה");
    }
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/teacher"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="חזרה"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <CardTitle className="text-xl text-center">יצירת בית ספר חדש</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="school-name" className="text-sm font-medium">שם בית הספר</label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: בית ספר אשכול"
              className="mt-1"
            />
            {slug && (
              <div className="bg-muted/50 rounded-lg px-3 py-2 mt-1.5">
                <p className="text-xs text-muted-foreground mb-0.5">כתובת קבועה:</p>
                <p className="text-sm font-medium" dir="ltr">/school/{slug}</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="school-desc" className="text-sm font-medium">תיאור (אופציונלי)</label>
            <Input
              id="school-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של בית הספר"
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full"
          >
            {creating ? "יוצר..." : "יצירה"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            ביטול
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
