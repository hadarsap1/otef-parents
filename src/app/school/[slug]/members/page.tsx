"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, Users } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "בעלים",
  ADMIN: "מנהל",
  TEACHER: "מורה",
};

export default function SchoolMembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<Member | null>(null);

  useEffect(() => {
    fetch(`/api/schools`)
      .then((r) => r.json())
      .then((schools) => {
        const school = schools.find((s: { slug: string }) => s.slug === slug);
        if (school) {
          const id = school.id;
          setSchoolId(id);
          return fetch(`/api/schools/${id}/members`).then((r) => r.json());
        }
        setError("בית ספר לא נמצא");
        return [];
      })
      .then((data) => {
        if (data) setMembers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("שגיאה בטעינת הנתונים");
        setLoading(false);
      });
  }, [slug]);

  async function addMember() {
    if (!email.trim() || !schoolId) return;
    setAdding(true);
    setError("");

    const res = await fetch(`/api/schools/${schoolId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: "TEACHER" }),
    });

    if (res.ok) {
      const member = await res.json();
      setMembers((prev) => [...prev, member]);
      setEmail("");
    } else {
      const data = await res.json();
      setError(data.error || "שגיאה");
    }
    setAdding(false);
  }

  async function removeMember(userId: string) {
    if (!schoolId) return;
    const res = await fetch(`/api/schools/${schoolId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    }
    setRemoveConfirm(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">הוספת מורה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="אימייל של המורה"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              dir="ltr"
              className="text-sm"
              aria-label="אימייל של המורה"
            />
            <Button size="sm" onClick={addMember} disabled={adding || !schoolId}>
              <Plus className="h-4 w-4" />
              הוספה
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">חברי צוות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <div className="py-6 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                עדיין אין מורים. הוסיפו את הצוות הראשון למעלה.
              </p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2 border-b border-dashed last:border-0"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={member.user.image ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {member.user.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {member.role !== "OWNER" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-destructive/10"
                    onClick={() => setRemoveConfirm(member)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog
        open={!!removeConfirm}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הסרת מורה</DialogTitle>
            <DialogDescription>
              האם להסיר את <strong>{removeConfirm?.user.name}</strong> ({removeConfirm?.user.email}) מבית הספר?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setRemoveConfirm(null)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => removeConfirm && removeMember(removeConfirm.user.id)}
            >
              הסרה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
