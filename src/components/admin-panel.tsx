"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, BookOpen, UsersRound, GraduationCap, RotateCcw, Trash2, Pencil, ChevronDown, ChevronUp, UserRound, School } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  _count: { children: number; childParents: number; lessons: number; ownedGroups: number };
}

interface Stats {
  users: number;
  children: number;
  groups: number;
  lessons: number;
}

interface GroupMember {
  id: string;
  child: {
    id: string;
    name: string;
    grade: string | null;
    parent: { id: string; name: string | null; email: string | null };
  };
}

interface AdminGroup {
  id: string;
  name: string;
  teacher: { id: string; name: string | null; email: string | null };
  members: GroupMember[];
  _count: { members: number; playdates: number; lessons: number };
}

const ROLE_LABELS: Record<string, string> = {
  PARENT: "הורה",
  TEACHER: "מורה",
  ADMIN: "מנהל",
  SUPERADMIN: "מנהל-על",
};

const ROLE_COLORS: Record<string, string> = {
  PARENT: "bg-blue-100 text-blue-700",
  TEACHER: "bg-green-100 text-green-700",
  ADMIN: "bg-purple-100 text-purple-700",
  SUPERADMIN: "bg-red-100 text-red-700",
};

const SYSTEM_EMAIL = "system@otef-parents.app";

export function AdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "reset" | "delete";
    user: UserRow;
  } | null>(null);

  // Groups state
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schools" | "users" | "groups">("schools");

  // Schools state
  const [schools, setSchools] = useState<{ id: string; name: string; slug: string; _count: { groups: number; members: number } }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/groups").then((r) => r.json()),
      fetch("/api/schools").then((r) => r.json()),
    ]).then(([usersData, statsData, groupsData, schoolsData]) => {
      setUsers(usersData);
      setStats(statsData);
      setGroups(groupsData);
      setSchools(schoolsData);
      setLoading(false);
    });
  }, []);

  async function changeRole(userId: string, newRole: string) {
    setUpdatingId(userId);
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  }

  async function handleResetData(userId: string) {
    setActionId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "POST" });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, _count: { children: 0, childParents: 0, lessons: 0, ownedGroups: 0 } }
            : u
        )
      );
      const statsData = await fetch("/api/admin/stats").then((r) => r.json());
      setStats(statsData);
    }
    setActionId(null);
    setConfirmDialog(null);
  }

  async function handleDeleteUser(userId: string) {
    setActionId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      const statsData = await fetch("/api/admin/stats").then((r) => r.json());
      setStats(statsData);
    }
    setActionId(null);
    setConfirmDialog(null);
  }

  async function saveGroupName(groupId: string) {
    if (!editGroupName.trim()) return;
    const res = await fetch("/api/admin/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, name: editGroupName.trim() }),
    });
    if (res.ok) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, name: editGroupName.trim() } : g
        )
      );
    }
    setEditingGroup(null);
  }

  async function removeMember(groupId: string, childId: string) {
    setRemovingMember(childId);
    const res = await fetch(
      `/api/admin/groups?groupId=${groupId}&childId=${childId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                members: g.members.filter((m) => m.child.id !== childId),
                _count: { ...g._count, members: g._count.members - 1 },
              }
            : g
        )
      );
    }
    setRemovingMember(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="משתמשים" value={stats.users} />
          <StatCard icon={GraduationCap} label="ילדים" value={stats.children} />
          <StatCard icon={UsersRound} label="קבוצות" value={stats.groups} />
          <StatCard icon={BookOpen} label="שיעורים" value={stats.lessons} />
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "schools" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("schools")}
        >
          <School className="h-4 w-4" />
          בתי ספר
        </Button>
        <Button
          variant={activeTab === "groups" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("groups")}
        >
          <UsersRound className="h-4 w-4" />
          קבוצות
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("users")}
        >
          <Users className="h-4 w-4" />
          משתמשים
        </Button>
      </div>

      {/* Schools tab */}
      {activeTab === "schools" && (
        <div className="space-y-3">
          {schools.map((school) => (
            <Card key={school.id}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <a href={`/school/${school.slug}`} className="hover:underline">
                      {school.name}
                    </a>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {school._count.groups} קבוצות · {school._count.members} מורים
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
          {schools.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              אין בתי ספר
            </p>
          )}
        </div>
      )}

      {/* Groups tab */}
      {activeTab === "groups" && (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  {editingGroup === group.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGroupName(group.id);
                          if (e.key === "Escape") setEditingGroup(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => saveGroupName(group.id)}>
                        שמירה
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingGroup(group.id);
                          setEditGroupName(group.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setExpandedGroup(
                        expandedGroup === group.id ? null : group.id
                      )
                    }
                  >
                    <span className="text-xs text-muted-foreground">
                      {group._count.members} ילדים
                    </span>
                    {expandedGroup === group.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {expandedGroup === group.id && (
                <CardContent className="px-4 pb-3">
                  <div className="grid gap-1">
                    {group.members.map((member) => {
                      const isSystem =
                        member.child.parent.email === SYSTEM_EMAIL;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">
                              {member.child.name}
                            </span>
                            {isSystem ? (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                                לא שויך
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground truncate shrink-0">
                                {member.child.parent.name}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:bg-destructive/10"
                            disabled={removingMember === member.child.id}
                            onClick={() =>
                              removeMember(group.id, member.child.id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                    {group.members.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        אין ילדים בקבוצה
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              אין קבוצות
            </p>
          )}
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">משתמשים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 py-2 border-b border-dashed last:border-0"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{user._count.children + user._count.childParents} ילדים</span>
                    <span>·</span>
                    <span>{user._count.ownedGroups} קבוצות</span>
                    <span>·</span>
                    <span>{user._count.lessons} שיעורים</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    disabled={updatingId === user.id}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                      ROLE_COLORS[user.role] ?? ""
                    }`}
                  >
                    <option value="PARENT">{ROLE_LABELS.PARENT}</option>
                    <option value="TEACHER">{ROLE_LABELS.TEACHER}</option>
                    <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                    <option value="SUPERADMIN">{ROLE_LABELS.SUPERADMIN}</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-amber-100"
                    title="איפוס נתונים"
                    onClick={() =>
                      setConfirmDialog({ type: "reset", user })
                    }
                    disabled={actionId === user.id}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg hover:bg-destructive/10"
                    title="מחיקת משתמש"
                    onClick={() =>
                      setConfirmDialog({ type: "delete", user })
                    }
                    disabled={actionId === user.id}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "delete"
                ? "מחיקת משתמש"
                : "איפוס נתוני משתמש"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "delete" ? (
                <>
                  האם למחוק את <strong>{confirmDialog.user.name}</strong> (
                  {confirmDialog.user.email}) לצמיתות? כל הנתונים שלו יימחקו
                  ולא ניתן יהיה לשחזר אותם.
                </>
              ) : (
                <>
                  האם לאפס את כל הנתונים של{" "}
                  <strong>{confirmDialog?.user.name}</strong> (
                  {confirmDialog?.user.email})? ילדים, שיעורים, קבוצות, אירועים
                  ומפגשים יימחקו. החשבון עצמו יישמר.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setConfirmDialog(null)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={actionId !== null}
              onClick={() => {
                if (!confirmDialog) return;
                if (confirmDialog.type === "delete") {
                  handleDeleteUser(confirmDialog.user.id);
                } else {
                  handleResetData(confirmDialog.user.id);
                }
              }}
            >
              {actionId
                ? "מעבד..."
                : confirmDialog?.type === "delete"
                  ? "מחיקה לצמיתות"
                  : "איפוס נתונים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
