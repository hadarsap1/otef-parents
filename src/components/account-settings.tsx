"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash2, Unlink, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountSettingsProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  hasCalendarAccess: boolean;
}

export function AccountSettings({ user, hasCalendarAccess }: AccountSettingsProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDisconnectGoogle() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/account/disconnect-google", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Google Calendar connection */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base">חיבור ליומן Google</CardTitle>
          <CardDescription>
            {hasCalendarAccess
              ? "יומן Google מחובר - אירועים מסונכרנים אוטומטית."
              : "יומן Google לא מחובר. התחברו מחדש כדי לאפשר סנכרון."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCalendarAccess ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                האפליקציה יכולה להוסיף ולמחוק אירועים ביומן Google שלכם. היא
                <strong> לא</strong> קוראת את היומן הקיים.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
              >
                <Unlink className="h-4 w-4" data-icon="inline-start" />
                {disconnecting ? "מנתק..." : "נתק גישה ליומן Google"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              כדי לחבר מחדש, התנתקו והתחברו שוב. תתבקשו לאשר גישה ליומן.
            </p>
          )}
          <div className="mt-3">
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              ניהול הרשאות בחשבון Google
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base">פרטי חשבון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            {user.image && (
              <img
                src={user.image}
                alt={user.name ?? "תמונת פרופיל"}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy links */}
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base">פרטיות ותנאים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="/privacy"
            className="block text-sm text-primary hover:underline"
          >
            מדיניות פרטיות
          </a>
          <a
            href="/terms"
            className="block text-sm text-primary hover:underline"
          >
            תנאי שימוש
          </a>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="shadow-sm border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            מחיקת חשבון
          </CardTitle>
          <CardDescription>
            פעולה זו תמחק את כל המידע שלכם לצמיתות - ילדים, שיעורים, מפגשים,
            ואירועים. לא ניתן לשחזר מידע שנמחק.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" data-icon="inline-start" />
                  מחיקת החשבון שלי
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>מחיקת חשבון</DialogTitle>
                <DialogDescription>
                  פעולה זו בלתי הפיכה. כל המידע שלכם יימחק לצמיתות, כולל ילדים,
                  שיעורים, קבוצות, מפגשים ואירועים.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  הקלידו &quot;מחיקה&quot; לאישור:
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="מחיקה"
                  className="rounded-xl h-11"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteConfirm("");
                  }}
                >
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== "מחיקה"}
                >
                  {deleting ? "מוחק..." : "מחיקה לצמיתות"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
