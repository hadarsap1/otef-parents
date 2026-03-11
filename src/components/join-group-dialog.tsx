"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Child {
  id: string;
  name: string;
  grade: string | null;
}

interface JoinGroupDialogProps {
  children: Child[];
}

export function JoinGroupDialog({ children }: JoinGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleOpen() {
    setCode("");
    setSelectedChildId(children.length === 1 ? children[0].id : "");
    setResult(null);
  }

  async function handleJoin() {
    if (!code.trim() || !selectedChildId) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/groups/invite/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), childId: selectedChildId }),
    });

    const data = await res.json();

    if (res.ok) {
      setResult({
        ok: true,
        message: `הילד/ה הצטרף/ה בהצלחה לקבוצה "${data.groupName}"!`,
      });
    } else {
      const messages: Record<string, string> = {
        "Invalid code": "קוד לא תקין",
        "Code already used": "הקוד כבר נוצל",
        "Code has expired": "הקוד פג תוקף",
        "Child not found or not yours": "ילד/ה לא נמצא/ה",
        "Child is already in this group": "הילד/ה כבר בקבוצה זו",
        "childId is required": "יש לבחור ילד/ה",
      };
      setResult({
        ok: false,
        message: messages[data.error] ?? "שגיאה, נסה שנית",
      });
    }

    setLoading(false);
  }

  if (children.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        onClick={handleOpen}
      >
        <UsersRound className="h-4 w-4" />
        הצטרפות לקבוצה
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>הצטרפות לקבוצת מורה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            קיבלת קוד מהמורה? הזן אותו כאן כדי לצרף ילד/ה לקבוצה.
          </p>

          {/* Child selection */}
          {children.length > 1 && (
            <div className="space-y-2">
              <Label>בחירת ילד/ה</Label>
              <div className="grid gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-start transition-colors ${
                      selectedChildId === child.id
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <span>{child.name}</span>
                    {child.grade && (
                      <span className="text-muted-foreground">
                        ({child.grade})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {children.length === 1 && (
            <p className="text-sm">
              מצרפים את <span className="font-medium">{children[0].name}</span>{" "}
              לקבוצה
            </p>
          )}

          {/* Code input */}
          <div className="space-y-2">
            <Label htmlFor="group-code">קוד הזמנה (6 תווים)</Label>
            <Input
              id="group-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="לדוגמה: AB3K7X"
              maxLength={6}
              dir="ltr"
              className="font-mono text-center text-lg tracking-widest"
              disabled={loading}
            />
          </div>

          {result && (
            <p
              className={`text-sm font-medium ${
                result.ok ? "text-green-600" : "text-destructive"
              }`}
            >
              {result.message}
            </p>
          )}

          {!result?.ok && (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={
                loading || code.trim().length < 6 || !selectedChildId
              }
            >
              {loading ? "מצטרף..." : "הצטרפות"}
            </Button>
          )}

          {result?.ok && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              סגירה
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
