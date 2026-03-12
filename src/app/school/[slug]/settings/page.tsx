"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";

export default function SchoolSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [school, setSchool] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/schools`)
      .then((r) => r.json())
      .then((schools) => {
        const s = schools.find((s: { slug: string }) => s.slug === slug);
        if (s) {
          setSchool(s);
          setName(s.name);
          setDescription(s.description ?? "");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("שגיאה בטעינת הנתונים");
        setLoading(false);
      });
  }, [slug]);

  async function save() {
    if (!school || !name.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/schools/${school.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });

    if (res.ok) {
      const updated = await res.json();
      // If slug changed, redirect
      if (updated.slug !== slug) {
        router.push(`/school/${updated.slug}/settings`);
      }
    } else {
      const data = await res.json();
      setError(data.error || "שגיאה בשמירה");
    }
    setSaving(false);
  }

  if (loading) return <LoadingState />;
  if (!school) return <p className="text-sm text-muted-foreground">בית ספר לא נמצא</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">הגדרות בית ספר</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label htmlFor="settings-name" className="text-sm font-medium">שם</label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="settings-desc" className="text-sm font-medium">תיאור</label>
            <Input
              id="settings-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="תיאור קצר (אופציונלי)"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
