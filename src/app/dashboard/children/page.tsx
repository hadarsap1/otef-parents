"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserRound, Share2, KeyRound, UserPlus, Search, ChevronDown } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { JoinGroupDialog } from "@/components/join-group-dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Child {
  id: string;
  name: string;
  grade: string | null;
  className: string | null;
}

interface UnclaimedGroup {
  groupId: string;
  groupName: string;
  children: { id: string; name: string; grade: string | null }[];
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim state
  const [unclaimedGroups, setUnclaimedGroups] = useState<UnclaimedGroup[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimSearch, setClaimSearch] = useState("");
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(new Set());

  // Add/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [saving, setSaving] = useState(false);

  // Share (invite) dialog state — one code for all children
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);

  // Redeem dialog state
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function fetchChildren() {
    const res = await fetch("/api/children");
    const data = await res.json();
    setChildren(data);
    setLoading(false);
  }

  async function fetchUnclaimed() {
    const res = await fetch("/api/children/unclaimed");
    if (res.ok) {
      const data = await res.json();
      setUnclaimedGroups(data);
    }
  }

  async function claimChild(childId: string) {
    setClaimingId(childId);
    const res = await fetch("/api/children/unclaimed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    if (res.ok) {
      await Promise.all([fetchChildren(), fetchUnclaimed()]);
    }
    setClaimingId(null);
  }

  useEffect(() => {
    fetchChildren();
    fetchUnclaimed();
  }, []);

  function openAdd() {
    setEditingChild(null);
    setName("");
    setGrade("");
    setDialogOpen(true);
  }

  function openEdit(child: Child) {
    setEditingChild(child);
    setName(child.name);
    setGrade(child.grade ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    if (editingChild) {
      await fetch(`/api/children/${editingChild.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade }),
      });
    } else {
      await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade }),
      });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchChildren();
  }

  function confirmDelete(id: string) {
    setDeletingChildId(id);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingChildId) return;
    await fetch(`/api/children/${deletingChildId}`, { method: "DELETE" });
    setDeleteDialogOpen(false);
    setDeletingChildId(null);
    fetchChildren();
  }

  // Open share dialog and immediately generate a code (uses first child to create invite)
  async function openShare() {
    if (children.length === 0) return;
    setInviteCode(null);
    setInviteExpiry(null);
    setCopySuccess(false);
    setShareDialogOpen(true);
    await generateCode();
  }

  async function generateCode() {
    if (children.length === 0) return;
    setGeneratingCode(true);
    setCopySuccess(false);
    // Use the first child to generate the invite code — redeem links ALL children
    const res = await fetch(`/api/children/${children[0].id}/invite`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.code);
      const expiry = new Date(data.expiresAt);
      setInviteExpiry(
        expiry.toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
      );
    } else {
      setInviteCode(null);
    }
    setGeneratingCode(false);
  }

  async function copyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function openRedeem() {
    setRedeemCode("");
    setRedeemResult(null);
    setRedeemDialogOpen(true);
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemResult(null);

    const res = await fetch("/api/children/invite/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: redeemCode.trim() }),
    });

    const data = await res.json();

    if (res.ok) {
      setRedeemResult({ ok: true, message: `הצטרפת בהצלחה! ${data.childName}` });
      fetchChildren(); // refresh list to show newly linked children
    } else {
      const messages: Record<string, string> = {
        "Invalid code": "קוד לא תקין",
        "Code already used": "הקוד כבר נוצל",
        "Code has expired": "הקוד פג תוקף",
        "Cannot redeem your own invite": "לא ניתן להשתמש בקוד שיצרת",
        "Already linked to this child": "כבר מקושר/ת לילד/ה זה",
        "Already linked to all children": "כבר מקושר/ת לכל הילדים",
      };
      setRedeemResult({ ok: false, message: messages[data.error] ?? "שגיאה, נסה שנית" });
    }

    setRedeemLoading(false);
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">הילדים שלי</h1>
        <div className="flex gap-2">
          {/* Share all children with co-parent */}
          {children.length > 0 && (
            <Button variant="outline" size="sm" onClick={openShare}>
              <Share2 className="h-4 w-4" />
              שיתוף הורה
            </Button>
          )}

          {/* Join group button */}
          <JoinGroupDialog children={children} />

          {/* Redeem invite code button */}
          <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" />}
              onClick={openRedeem}
            >
              <KeyRound className="h-4 w-4" />
              קוד שיתוף
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>הזנת קוד שיתוף</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  קיבלת קוד מהורה אחר? הזן אותו כאן כדי להתחבר לילד/ה.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="redeem-code">קוד (6 תווים)</Label>
                  <Input
                    id="redeem-code"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    placeholder="לדוגמה: AB3K7X"
                    maxLength={6}
                    dir="ltr"
                    className="font-mono text-center text-lg tracking-widest"
                    disabled={redeemLoading}
                  />
                </div>
                {redeemResult && (
                  <p
                    className={`text-sm font-medium ${
                      redeemResult.ok ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {redeemResult.message}
                  </p>
                )}
                {!redeemResult?.ok && (
                  <Button
                    className="w-full"
                    onClick={handleRedeem}
                    disabled={redeemLoading || redeemCode.trim().length < 6}
                  >
                    {redeemLoading ? "בודק..." : "אישור"}
                  </Button>
                )}
                {redeemResult?.ok && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setRedeemDialogOpen(false)}
                  >
                    סגירה
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add child button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button size="sm" />}
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              הוספה
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  {editingChild ? "עריכת ילד/ה" : "הוספת ילד/ה"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="child-name">שם</Label>
                  <Input
                    id="child-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="שם הילד/ה"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="child-grade">כיתה</Label>
                  <select
                    id="child-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">בחר כיתה</option>
                    <option value="גן שחף">גן שחף</option>
                    <option value="א׳">א׳</option>
                    <option value="ב׳">ב׳</option>
                    <option value="ג׳">ג׳</option>
                    <option value="ד׳">ד׳</option>
                    <option value="ה׳">ה׳</option>
                    <option value="ו׳">ו׳</option>
                  </select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                >
                  {saving ? "שומר..." : "שמירה"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Share (invite) dialog — one code for all children */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>שיתוף עם הורה נוסף</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              שתף את הקוד עם ההורה השני. הקוד מקשר את כל הילדים בבת אחת. בתוקף 24 שעות, שימוש חד-פעמי.
            </p>

            {generatingCode && (
              <div className="text-center text-muted-foreground py-4">מייצר קוד...</div>
            )}

            {!generatingCode && inviteCode && (
              <>
                <button
                  type="button"
                  className="bg-muted rounded-lg py-4 text-center cursor-pointer select-all w-full"
                  onClick={copyCode}
                  aria-label={`העתק קוד ${inviteCode}`}
                >
                  <span className="font-mono text-3xl font-bold tracking-widest" dir="ltr">
                    {inviteCode}
                  </span>
                  {inviteExpiry && (
                    <p className="text-xs text-muted-foreground mt-1">
                      בתוקף עד {inviteExpiry}
                    </p>
                  )}
                </button>
                <Button className="w-full" variant="outline" onClick={copyCode}>
                  {copySuccess ? "הועתק!" : "העתק קוד"}
                </Button>
                <Button
                  className="w-full"
                  variant="ghost"
                  size="sm"
                  onClick={() => generateCode()}
                >
                  צור קוד חדש
                </Button>
              </>
            )}

            {!generatingCode && !inviteCode && (
              <p className="text-sm text-destructive text-center">
                שגיאה ביצירת הקוד. רק בעל/ת החשבון הראשי יכול/ה ליצור קוד.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת ילד/ה</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הילד/ה ואת כל השיעורים המשויכים. לא ניתן לבטל.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* My children list */}
      {children.length === 0 && unclaimedGroups.length === 0 && (
        <EmptyState
          icon={UserRound}
          title="עוד לא הוספת ילדים."
          description={'לחץ על "הוספה" או בחר מהרשימה למטה.'}
        />
      )}

      {children.length > 0 && (
        <div className="grid gap-3">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{child.name}</p>
                  {child.grade && (
                    <p className="text-sm text-muted-foreground">
                      {child.grade}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(child)}
                    aria-label={`ערוך את ${child.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(child.id)}
                    aria-label={`מחק את ${child.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Claim children section */}
      {unclaimedGroups.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">בחירת ילד/ה מהרשימה</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            מצא את הילד/ה שלך ברשימת הכיתה ולחץ לשייך אותו אליך.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם..."
              value={claimSearch}
              onChange={(e) => setClaimSearch(e.target.value)}
              className="pr-9"
            />
          </div>

          {unclaimedGroups.map((group) => {
            const filtered = claimSearch
              ? group.children.filter((c) =>
                  c.name.includes(claimSearch)
                )
              : group.children;
            if (filtered.length === 0) return null;

            // Auto-expand when searching, otherwise use toggle state
            const isOpen = claimSearch ? true : openGroupIds.has(group.groupId);

            return (
              <Card key={group.groupId}>
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-4 py-3 text-right"
                  onClick={() => {
                    setOpenGroupIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.groupId)) {
                        next.delete(group.groupId);
                      } else {
                        next.add(group.groupId);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{group.groupName}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      ({filtered.length})
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <CardContent className="px-4 pb-3 pt-0">
                    <div className="grid gap-1.5">
                      {filtered.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0"
                        >
                          <span className="text-sm">{child.name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={claimingId === child.id}
                            onClick={() => claimChild(child.id)}
                          >
                            {claimingId === child.id ? "משייך..." : "זה הילד/ה שלי"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
