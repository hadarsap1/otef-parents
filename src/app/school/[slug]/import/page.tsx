"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseImport, type ImportFormat, type ImportChild } from "@/lib/import-parsers";

type Step = "input" | "preview" | "done";

export default function SchoolImportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ImportFormat>("simple");
  const [defaultGroup, setDefaultGroup] = useState("");
  const [children, setChildren] = useState<ImportChild[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [result, setResult] = useState<{ groupsCreated: number; childrenCreated: number } | null>(null);

  useEffect(() => {
    fetch(`/api/schools`)
      .then((r) => r.json())
      .then((schools) => {
        const school = schools.find((s: { slug: string }) => s.slug === slug);
        if (school) setSchoolId(school.id);
      })
      .catch(() => {});
  }, [slug]);

  function handleParse() {
    const parsed = parseImport(text, format, defaultGroup);
    setChildren(parsed);
    setStep("preview");
  }

  async function handleImport() {
    if (!schoolId) return;
    setImporting(true);
    setImportError("");

    const res = await fetch(`/api/schools/${schoolId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ children }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setStep("done");
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError(data.error || "שגיאה בייבוא");
    }
    setImporting(false);
  }

  if (step === "done" && result) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <p className="text-lg font-bold">הייבוא הושלם!</p>
          <p className="text-sm text-muted-foreground">
            {result.groupsCreated} כיתות · {result.childrenCreated} ילדים
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setStep("input");
                setText("");
                setChildren([]);
                setResult(null);
              }}
            >
              ייבוא נוסף
            </Button>
            <Button onClick={() => window.location.href = `/school/${slug}/groups`}>
              לכיתות
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    // Group children by group name for display
    const grouped = children.reduce(
      (acc, c) => {
        if (!acc[c.group]) acc[c.group] = [];
        acc[c.group].push(c);
        return acc;
      },
      {} as Record<string, ImportChild[]>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">תצוגה מקדימה</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("input")}>
              חזרה
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importing || !schoolId}>
              {importing ? "מייבא..." : `ייבוא ${children.length} ילדים`}
            </Button>
          </div>
        </div>

        {importError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{importError}</p>
        )}

        {Object.entries(grouped).map(([groupName, kids]) => (
          <Card key={groupName}>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">{groupName} ({kids.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid gap-1 text-sm">
                {kids.map((kid, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span>{kid.name}</span>
                    {kid.grade && (
                      <span className="text-xs text-muted-foreground">({kid.grade})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ייבוא ילדים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label htmlFor="import-format" className="text-sm font-medium">פורמט</label>
            <select
              id="import-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ImportFormat)}
              className="w-full mt-1 text-sm rounded-xl border border-input bg-background px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="simple">רשימה פשוטה (שם בכל שורה)</option>
              <option value="grouped">מקובץ (שם כיתה: ואחריו שמות)</option>
              <option value="csv">CSV (עמודות: שם, כיתה, כיתה)</option>
            </select>
          </div>

          {format === "simple" && (
            <div>
              <label htmlFor="import-group-name" className="text-sm font-medium">שם כיתה</label>
              <Input
                id="import-group-name"
                value={defaultGroup}
                onChange={(e) => setDefaultGroup(e.target.value)}
                placeholder="שם הכיתה לכל הילדים"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <label htmlFor="import-data" className="text-sm font-medium">נתונים</label>
            <textarea
              id="import-data"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full mt-1 text-sm rounded-xl border border-input bg-background px-3 py-2 min-h-[200px] ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder={
                format === "simple"
                  ? "שם ילד\nשם ילד\nשם ילד"
                  : format === "grouped"
                    ? "שם כיתה:\nשם ילד\nשם ילד\n\nשם כיתה אחר:\nשם ילד"
                    : "שם,כיתה,כיתה\nדני,גן שחף,גן\nנועה,כיתה א,א׳"
              }
              dir="rtl"
            />
          </div>

          <Button
            onClick={handleParse}
            disabled={!text.trim() || (format === "simple" && !defaultGroup.trim())}
            className="w-full"
          >
            תצוגה מקדימה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
