"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, BookOpen, UsersRound, GraduationCap, RotateCcw, Trash2, Pencil, ChevronDown, ChevronUp, UserRound, School, Search } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SchoolMembership {
  role: string;
  school: { id: string; name: string };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  _count: { children: number; childParents: number; lessons: number; ownedGroups: number };
  schoolMemberships: SchoolMembership[];
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
  school: { id: string; name: string } | null;
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

type RoleFilter = "ALL" | "PARENT" | "TEACHER" | "ADMIN" | "SUPERADMIN";

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

  // Tab & search state
  const [activeTab, setActiveTab] = useState<"schools" | "users">("schools");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  // Schools state
  const [schools, setSchools] = useState<{ id: string; name: string; slug: string; _count: { groups: number; members: number } }[]>([]);
  const [editingSchool, setEditingSchool] = useState<string | null>(null);
  const [editSchoolName, setEditSchoolName] = useState("");
  const [deleteSchoolDialog, setDeleteSchoolDialog] = useState<{ id: string; name: string } | null>(null);
  const [deletingSchool, setDeletingSchool] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

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

  // Derived data: group users by school
  const schoolTeachers = useMemo(() => {
    const map = new Map<string, UserRow[]>();
    for (const user of users) {
      for (const membership of user.schoolMemberships) {
        const list = map.get(membership.school.id) || [];
        list.push(user);
        map.set(membership.school.id, list);
      }
    }
    return map;
  }, [users]);

  const schoolGroups = useMemo(() => {
    const map = new Map<string, AdminGroup[]>();
    for (const group of groups) {
      if (group.school) {
        const list = map.get(group.school.id) || [];
        list.push(group);
        map.set(group.school.id, list);
      }
    }
    return map;
  }, [groups]);

  const unaffiliatedUsers = useMemo(() => {
    return users.filter((u) => u.schoolMemberships.length === 0);
  }, [users]);

  const unaffiliatedGroups = useMemo(() => {
    return groups.filter((g) => !g.school);
  }, [groups]);

  // Search filter for schools tab
  const query = searchQuery.toLowerCase();

  const filteredSchools = useMemo(() => {
    if (!query) return schools;
    return schools.filter((school) => {
      if (school.name.toLowerCase().includes(query)) return true;
      const teachers = schoolTeachers.get(school.id) || [];
      if (teachers.some((t) => t.name?.toLowerCase().includes(query) || t.email?.toLowerCase().includes(query))) return true;
      const grps = schoolGroups.get(school.id) || [];
      if (grps.some((g) => g.name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [schools, query, schoolTeachers, schoolGroups]);

  // Search + role filter for users tab
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (query) {
        const matchName = user.name?.toLowerCase().includes(query);
        const matchEmail = user.email?.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, roleFilter, query]);

  function toggleSchool(schoolId: string) {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  }

  function schoolChildCount(schoolId: string) {
    const grps = schoolGroups.get(schoolId) || [];
    return grps.reduce((sum, g) => sum + g._count.members, 0);
  }

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

  async function saveSchoolName(schoolId: string) {
    if (!editSchoolName.trim()) return;
    const res = await fetch(`/api/schools/${schoolId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editSchoolName.trim() }),
    });
    if (res.ok) {
      setSchools((prev) =>
        prev.map((s) =>
          s.id === schoolId ? { ...s, name: editSchoolName.trim() } : s
        )
      );
    }
    setEditingSchool(null);
  }

  async function handleDeleteSchool(schoolId: string) {
    setDeletingSchool(true);
    const res = await fetch(`/api/schools/${schoolId}`, { method: "DELETE" });
    if (res.ok) {
      setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    }
    setDeletingSchool(false);
    setDeleteSchoolDialog(null);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="משתמשים" value={stats.users} />
          <StatCard icon={GraduationCap} label="ילדים" value={stats.children} />
          <StatCard icon={UsersRound} label="כיתות" value={stats.groups} />
          <StatCard icon={BookOpen} label="שיעורים" value={stats.lessons} />
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש משתמש, כיתה או בית ספר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9"
          dir="rtl"
        />
      </div>

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
          variant={activeTab === "users" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("users")}
        >
          <Users className="h-4 w-4" />
          כל המשתמשים
        </Button>
      </div>

      {/* Schools tab */}
      {activeTab === "schools" && (
        <div className="space-y-3">
          {filteredSchools.map((school) => {
            const teachers = schoolTeachers.get(school.id) || [];
            const grps = schoolGroups.get(school.id) || [];
            const childCount = schoolChildCount(school.id);
            const isExpanded = expandedSchools.has(school.id);

            return (
              <Card key={school.id}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    {editingSchool === school.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editSchoolName}
                          onChange={(e) => setEditSchoolName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveSchoolName(school.id);
                            if (e.key === "Escape") setEditingSchool(null);
                          }}
                        />
                        <Button size="sm" className="h-8" onClick={() => saveSchoolName(school.id)}>
                          שמירה
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSchool(school.id)}>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <CardTitle className="text-base">
                          <a
                            href={`/school/${school.slug}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {school.name}
                          </a>
                        </CardTitle>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {grps.length} כיתות · {teachers.length} מורים · {childCount} ילדים
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingSchool(school.id);
                          setEditSchoolName(school.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-destructive/10"
                        onClick={() => setDeleteSchoolDialog({ id: school.id, name: school.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="px-4 pb-3 space-y-3">
                    {/* Teachers section */}
                    {teachers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">מורים</p>
                        <div className="grid gap-1">
                          {teachers.map((teacher) => (
                            <div
                              key={teacher.id}
                              className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7 shrink-0">
                                  <AvatarImage src={teacher.image ?? ""} alt={teacher.name ?? ""} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                    {teacher.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase() ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{teacher.name ?? "-"}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{teacher.email}</p>
                                </div>
                              </div>
                              <select
                                value={teacher.role}
                                onChange={(e) => changeRole(teacher.id, e.target.value)}
                                disabled={updatingId === teacher.id}
                                dir="rtl"
                                aria-label={`תפקיד של ${teacher.name}`}
                                className={`text-xs font-medium px-2 py-1 rounded-full border border-border cursor-pointer ${
                                  ROLE_COLORS[teacher.role] ?? ""
                                }`}
                              >
                                <option value="PARENT">{ROLE_LABELS.PARENT}</option>
                                <option value="TEACHER">{ROLE_LABELS.TEACHER}</option>
                                <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                                <option value="SUPERADMIN">{ROLE_LABELS.SUPERADMIN}</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classes section */}
                    {grps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">כיתות</p>
                        <div className="grid gap-1">
                          {grps.map((group) => (
                            <div key={group.id}>
                              <div className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                                {editingGroup === group.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      value={editGroupName}
                                      onChange={(e) => setEditGroupName(e.target.value)}
                                      className="h-7 text-sm"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveGroupName(group.id);
                                        if (e.key === "Escape") setEditingGroup(null);
                                      }}
                                    />
                                    <Button size="sm" className="h-7 text-xs" onClick={() => saveGroupName(group.id)}>
                                      שמירה
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <UsersRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm">{group.name}</span>
                                    <span className="text-[10px] text-muted-foreground">({group._count.members} ילדים)</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setEditingGroup(group.id);
                                      setEditGroupName(group.name);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7"
                                    onClick={() =>
                                      setExpandedGroup(
                                        expandedGroup === group.id ? null : group.id
                                      )
                                    }
                                  >
                                    {expandedGroup === group.id ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {expandedGroup === group.id && (
                                <div className="pr-6 pb-2">
                                  {group.members.map((member) => {
                                    const isSystem = member.child.parent.email === SYSTEM_EMAIL;
                                    return (
                                      <div
                                        key={member.id}
                                        className="flex items-center justify-between py-1 border-b border-dotted last:border-0"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <UserRound className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <span className="text-xs truncate">{member.child.name}</span>
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
                                          onClick={() => removeMember(group.id, member.child.id)}
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {group.members.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                      אין ילדים בכיתה
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teachers.length === 0 && grps.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        אין מורים או כיתות בבית ספר זה
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Unaffiliated section */}
          {(unaffiliatedUsers.length > 0 || unaffiliatedGroups.length > 0) && (!query || unaffiliatedUsers.some(u => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)) || unaffiliatedGroups.some(g => g.name.toLowerCase().includes(query))) && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSchool("__unaffiliated__")}>
                  {expandedSchools.has("__unaffiliated__") ? (
                    <ChevronUp className="h-4 w-4 text-amber-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  <CardTitle className="text-base text-amber-700">ללא בית ספר</CardTitle>
                  <span className="text-xs text-amber-600">
                    {unaffiliatedUsers.length} משתמשים · {unaffiliatedGroups.length} כיתות
                  </span>
                </div>
              </CardHeader>

              {expandedSchools.has("__unaffiliated__") && (
                <CardContent className="px-4 pb-3 space-y-3">
                  {unaffiliatedUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">משתמשים</p>
                      <div className="grid gap-1">
                        {unaffiliatedUsers
                          .filter((u) => !query || u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query))
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7 shrink-0">
                                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                    {user.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase() ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{user.name ?? "-"}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? ""}`}>
                                {ROLE_LABELS[user.role] ?? user.role}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {unaffiliatedGroups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">כיתות</p>
                      <div className="grid gap-1">
                        {unaffiliatedGroups
                          .filter((g) => !query || g.name.toLowerCase().includes(query))
                          .map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{group.name}</span>
                                <span className="text-[10px] text-muted-foreground">({group._count.members} ילדים)</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingGroup(group.id);
                                  setEditGroupName(group.name);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {filteredSchools.length === 0 && !query && (
            <p className="text-sm text-muted-foreground text-center py-4">
              אין בתי ספר
            </p>
          )}
          {filteredSchools.length === 0 && query && (
            <p className="text-sm text-muted-foreground text-center py-4">
              לא נמצאו תוצאות עבור &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="space-y-3">
          {/* Role filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "PARENT", "TEACHER", "ADMIN", "SUPERADMIN"] as RoleFilter[]).map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRoleFilter(role)}
              >
                {role === "ALL" ? "הכל" : ROLE_LABELS[role]}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                משתמשים ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredUsers.map((user) => (
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
                      {user.name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{user._count.children + user._count.childParents} ילדים</span>
                      <span>·</span>
                      <span>{user._count.ownedGroups} כיתות</span>
                      <span>·</span>
                      <span>{user._count.lessons} שיעורים</span>
                      {user.schoolMemberships.length > 0 && (
                        <>
                          <span>·</span>
                          {user.schoolMemberships.map((m) => (
                            <span
                              key={m.school.id}
                              className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px]"
                            >
                              <School className="h-2.5 w-2.5" />
                              {m.school.name}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      disabled={updatingId === user.id}
                      dir="rtl"
                      aria-label={`תפקיד של ${user.name}`}
                      className={`text-xs font-medium px-3 py-1.5 min-h-[36px] rounded-full border border-border cursor-pointer focus:ring-2 focus:ring-ring focus:ring-offset-1 appearance-auto ${
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
                      aria-label="איפוס נתונים"
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
                      aria-label="מחיקת משתמש"
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
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query ? `לא נמצאו תוצאות עבור "${searchQuery}"` : "אין משתמשים"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
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
                  {confirmDialog?.user.email})? ילדים, שיעורים, כיתות, אירועים
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

      {/* School Delete Dialog */}
      <Dialog
        open={!!deleteSchoolDialog}
        onOpenChange={(open) => !open && setDeleteSchoolDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת בית ספר</DialogTitle>
            <DialogDescription>
              האם למחוק את <strong>{deleteSchoolDialog?.name}</strong> לצמיתות?
              כל הכיתות, החברים והנתונים של בית הספר יימחקו ולא ניתן יהיה לשחזר אותם.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteSchoolDialog(null)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deletingSchool}
              onClick={() => {
                if (deleteSchoolDialog) {
                  handleDeleteSchool(deleteSchoolDialog.id);
                }
              }}
            >
              {deletingSchool ? "מוחק..." : "מחיקה לצמיתות"}
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
