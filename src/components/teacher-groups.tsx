"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Copy, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | Date;
  _count: { members: number };
}

export function TeacherGroups({ initialGroups }: { initialGroups: Group[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        setCreateOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.code);
      setInviteGroupId(groupId);
      setCopied(false);
    }
  }

  async function copyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEdit(group: Group) {
    setEditGroup(group);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
  }

  async function handleEdit() {
    if (!editGroup || !editName.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/groups/${editGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      if (res.ok) {
        setEditGroup(null);
        router.refresh();
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteGroup) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/groups/${deleteGroup.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteGroup(null);
        router.refresh();
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {groups.length > 0 ? `${groups.length} קבוצות` : ""}
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="h-4 w-4" data-icon="inline-start" />
                קבוצה חדשה
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>יצירת קבוצה חדשה</DialogTitle>
              <DialogDescription>
                צרו קבוצה כדי לנהל שיעורים לקבוצת תלמידים
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="group-name">שם הקבוצה</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: כיתה ג׳ - מתמטיקה"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-desc">תיאור (אופציונלי)</Label>
                <Input
                  id="group-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור קצר של הקבוצה"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? "יוצר..." : "יצירה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="אין קבוצות עדיין"
          description="צרו קבוצה חדשה כדי להתחיל"
        />
      ) : (
        groups.map((group) => (
          <Card key={group.id} size="sm">
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
              <CardAction>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInvite(group.id)}
                  >
                    קוד הזמנה
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-primary/10"
                    onClick={() => openEdit(group)}
                    aria-label="עריכת קבוצה"
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-destructive/10"
                    onClick={() => setDeleteGroup(group)}
                    aria-label="מחיקת קבוצה"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group._count.members} תלמידים</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Invite code dialog */}
      <Dialog
        open={!!inviteCode}
        onOpenChange={(open) => {
          if (!open) {
            setInviteCode(null);
            setInviteGroupId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>קוד הזמנה</DialogTitle>
            <DialogDescription>
              שתפו את הקוד עם ההורים כדי שיוכלו לצרף את ילדיהם לקבוצה
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-widest">
              {inviteCode}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={copyCode}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            הקוד תקף ל-7 ימים
          </p>
        </DialogContent>
      </Dialog>

      {/* Edit group dialog */}
      <Dialog
        open={!!editGroup}
        onOpenChange={(open) => !open && setEditGroup(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת קבוצה</DialogTitle>
            <DialogDescription>
              עדכון פרטי הקבוצה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-name">שם הקבוצה</Label>
              <Input
                id="edit-group-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-desc">תיאור (אופציונלי)</Label>
              <Input
                id="edit-group-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditGroup(null)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editName.trim()}
            >
              {editLoading ? "שומר..." : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete group confirmation dialog */}
      <AlertDialog
        open={!!deleteGroup}
        onOpenChange={(open) => !open && setDeleteGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קבוצה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את הקבוצה <strong>{deleteGroup?.name}</strong>?
              {deleteGroup && deleteGroup._count.members > 0 && (
                <> הקבוצה כוללת {deleteGroup._count.members} תלמידים שיוסרו ממנה.</>
              )}
              {" "}פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "מוחק..." : "מחיקה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
