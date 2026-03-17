"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  MapPin,
  Clock,
  Users,
  UserPlus,
  UserMinus,
  XCircle,
  PartyPopper,
  GraduationCap,
} from "lucide-react";
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
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";

interface Child {
  id: string;
  name: string;
}

interface GroupInfo {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  childId: string;
  child: { id: string; name: string };
}

interface Playdate {
  id: string;
  hostId: string;
  address: string;
  dateTime: string;
  endTime: string | null;
  maxCapacity: number;
  status: "OPEN" | "FULL" | "CANCELLED";
  notes: string | null;
  host: { id: string; name: string | null; image: string | null };
  group: GroupInfo;
  participants: Participant[];
}

export default function PlaydatesPage() {
  const { data: session } = useSession();
  const [playdates, setPlaydates] = useState<Playdate[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinDialogPlaydate, setJoinDialogPlaydate] = useState<string | null>(
    null
  );
  const [selectedChildId, setSelectedChildId] = useState("");

  // Cancel confirmation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPlaydateId, setCancellingPlaydateId] = useState<
    string | null
  >(null);

  // Create form state
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("5");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/playdates"),
        fetch("/api/children"),
      ]);
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
      setPlaydates(pData);
      setChildren(cData);
      if (cData.length > 0) setSelectedChildId(cData[0].id);

      // Extract unique groups from playdates
      const groupMap = new Map<string, GroupInfo>();
      for (const pd of pData) {
        if (pd.group) groupMap.set(pd.group.id, pd.group);
      }

      // Also fetch groups from children's memberships
      const gRes = await fetch("/api/parent-groups");
      if (gRes.ok) {
        const gData = await gRes.json();
        for (const g of gData) {
          groupMap.set(g.id, g);
        }
      }

      const allGroups = Array.from(groupMap.values());
      setGroups(allGroups);
      if (allGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(allGroups[0].id);
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 seconds so other parents see updates in real time
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-fetch when tab becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchData]);

  async function handleCreate() {
    if (!selectedGroupId || !address || !date || !startTime || !maxCapacity)
      return;
    setSaving(true);

    const dateTimeStr = `${date}T${startTime}:00`;

    await fetch("/api/playdates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: selectedGroupId,
        address,
        dateTime: new Date(dateTimeStr).toISOString(),
        endTime: endTime || null,
        maxCapacity: Number(maxCapacity),
        notes: notes || null,
      }),
    });

    setSaving(false);
    setCreateOpen(false);
    setAddress("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setMaxCapacity("5");
    setNotes("");
    fetchData();
  }

  async function handleJoin(playdateId: string) {
    if (!selectedChildId) return;

    await fetch(`/api/playdates/${playdateId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selectedChildId }),
    });

    setJoinDialogPlaydate(null);
    fetchData();
  }

  async function handleLeave(playdateId: string, childId: string) {
    await fetch(`/api/playdates/${playdateId}/join?childId=${childId}`, {
      method: "DELETE",
    });
    fetchData();
  }

  function confirmCancel(playdateId: string) {
    setCancellingPlaydateId(playdateId);
    setCancelDialogOpen(true);
  }

  async function handleCancel() {
    if (!cancellingPlaydateId) return;
    await fetch(`/api/playdates/${cancellingPlaydateId}`, { method: "DELETE" });
    setCancelDialogOpen(false);
    setCancellingPlaydateId(null);
    fetchData();
  }

  const userId = session?.user?.id;
  const myChildIds = new Set(children.map((c) => c.id));

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-sm">שגיאה בטעינת המפגשים.</p>
        <button
          onClick={() => { setLoading(true); setError(false); fetchData(); }}
          className="text-sm text-primary mt-2 hover:underline"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">מפגשים</h1>
        {hasGroups && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="h-4 w-4" />
              אירוח חדש
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>פתיחת מפגש אירוח</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="pd-group">כיתה</Label>
                  <select
                    id="pd-group"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className={selectClass}
                    dir="rtl"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pd-address">כתובת</Label>
                  <Input
                    id="pd-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="רחוב, עיר"
                    autoComplete="street-address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>תאריך</Label>
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    label="תאריך מפגש"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>שעת התחלה</Label>
                    <TimePicker
                      value={startTime}
                      onChange={setStartTime}
                      label="שעת התחלה"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שעת סיום</Label>
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      label="שעת סיום"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pd-capacity">מקסימום ילדים</Label>
                  <Input
                    id="pd-capacity"
                    type="number"
                    min={1}
                    max={30}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pd-notes">הערות (אופציונלי)</Label>
                  <Input
                    id="pd-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="למשל: להביא בגד ים"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={
                    saving || !address || !date || !startTime || !selectedGroupId
                  }
                >
                  {saving ? "שומר..." : "פתיחת מפגש"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול מפגש</AlertDialogTitle>
            <AlertDialogDescription>
              האם לבטל את המפגש? הפעולה לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancel}>
              ביטול מפגש
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!hasGroups ? (
        <EmptyState
          icon={GraduationCap}
          title="אין כיתות עדיין"
          description='הצטרפו לכיתה דרך הכרטיסייה "ילדים" כדי ליצור ולראות מפגשים.'
        />
      ) : playdates.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="אין מפגשים פתוחים כרגע"
          description="פתחו מפגש חדש כדי להזמין ילדים מהכיתה."
        />
      ) : (
        <div className="grid gap-3">
          {playdates.map((pd) => {
            const isHost = pd.hostId === userId;
            const spotsLeft = pd.maxCapacity - pd.participants.length;
            const myJoinedChildren = pd.participants.filter((p) =>
              myChildIds.has(p.childId)
            );
            const hasJoined = myJoinedChildren.length > 0;

            return (
              <Card
                key={pd.id}
                className={cn(pd.status === "FULL" && "opacity-75")}
              >
                <CardContent className="py-4 space-y-3">
                  {/* Host, group & status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {isHost ? "אתה מארח/ת" : `מארח: ${pd.host.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {pd.group.name}
                      </p>
                    </div>
                    <StatusBadge
                      variant={pd.status === "OPEN" ? "success" : "warning"}
                    >
                      {pd.status === "OPEN"
                        ? `פתוח (${spotsLeft} מקומות)`
                        : "מלא"}
                    </StatusBadge>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{pd.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>
                        {formatDate(pd.dateTime)} · {formatTime(pd.dateTime)}
                        {pd.endTime && ` - ${pd.endTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>
                        {pd.participants.length}/{pd.maxCapacity} ילדים
                      </span>
                    </div>
                  </div>

                  {pd.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      {pd.notes}
                    </p>
                  )}

                  {/* Participants list */}
                  {pd.participants.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      משתתפים:{" "}
                      {pd.participants.map((p) => p.child.name).join(", ")}
                    </div>
                  )}

                  {/* Calendar button */}
                  {(isHost || hasJoined) && (
                    <AddToCalendarButton type="playdate" id={pd.id} compact />
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {isHost ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => confirmCancel(pd.id)}
                      >
                        <XCircle className="h-4 w-4" />
                        ביטול מפגש
                      </Button>
                    ) : hasJoined ? (
                      myJoinedChildren.map((p) => (
                        <Button
                          key={p.id}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleLeave(pd.id, p.childId)}
                        >
                          <UserMinus className="h-4 w-4" />
                          הסר את {p.child.name}
                        </Button>
                      ))
                    ) : pd.status === "OPEN" && children.length > 0 ? (
                      <Dialog
                        open={joinDialogPlaydate === pd.id}
                        onOpenChange={(open) =>
                          setJoinDialogPlaydate(open ? pd.id : null)
                        }
                      >
                        <DialogTrigger
                          render={<Button size="sm" className="w-full" />}
                        >
                          <UserPlus className="h-4 w-4" />
                          הצטרפות
                        </DialogTrigger>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle>בחר ילד/ה להצטרפות</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <select
                              value={selectedChildId}
                              onChange={(e) =>
                                setSelectedChildId(e.target.value)
                              }
                              className={selectClass}
                              dir="rtl"
                              aria-label="בחר ילד/ה להצטרפות"
                            >
                              {children.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              className="w-full"
                              onClick={() => handleJoin(pd.id)}
                            >
                              הצטרפות
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
