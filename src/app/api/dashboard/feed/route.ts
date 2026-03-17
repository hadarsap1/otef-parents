import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/feed?date=2026-03-09
// Returns unified feed: lessons + playdates for the current user's children
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const israelNow = new Date().toLocaleString("en-CA", { timeZone: "Asia/Jerusalem", hour12: false });
  const israelDate = israelNow.split(",")[0]; // "YYYY-MM-DD"
  const israelTime = israelNow.split(",")[1]?.trim().slice(0, 5) ?? "00:00"; // "HH:mm"
  const dateStr = searchParams.get("date") || israelDate;
  const isViewingToday = dateStr === israelDate;

  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  // Get user's children (including linked via ChildParent)
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true, name: true, grade: true },
  });

  const childIds = children.map((c) => c.id);

  // Get group IDs for the user's children
  const groupMemberships = await prisma.groupMember.findMany({
    where: { childId: { in: childIds } },
    select: { groupId: true },
  });
  const groupIds = [...new Set(groupMemberships.map((m) => m.groupId))];

  // Fetch teacher-created lessons for today (one-time on this date + recurring)
  const todayDow = dayStart.getDay(); // 0=Sun..6=Sat
  const teacherLessons = groupIds.length > 0
    ? await prisma.lesson.findMany({
        where: {
          groupId: { in: groupIds },
          OR: [
            { recurrence: "ONCE", date: { gte: dayStart, lte: dayEnd } },
            { recurrence: "DAILY" },
            { recurrence: "WEEKLY" },
          ],
        },
        include: {
          teacher: { select: { name: true } },
          group: { select: { id: true, name: true } },
          subGroups: {
            include: {
              members: { include: { child: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { startTime: "asc" },
      })
    : [];

  // Filter: WEEKLY must match day-of-week, sub-grouped must include child
  const filteredTeacherLessons = teacherLessons
    .filter((lesson) => {
      // WEEKLY: only show on matching day of week
      if (lesson.recurrence === "WEEKLY" && lesson.date.getDay() !== todayDow) return false;
      // Sub-group filter
      if (!lesson.hasSubGroups) return true;
      return lesson.subGroups.some((sg) =>
        sg.members.some((m) => childIds.includes(m.childId))
      );
    })
    .map((lesson) => {
      let displayStartTime = lesson.startTime;
      let displayEndTime = lesson.endTime;
      let subGroupName: string | null = null;

      if (lesson.hasSubGroups) {
        const childSg = lesson.subGroups.find((sg) =>
          sg.members.some((m) => childIds.includes(m.childId))
        );
        if (childSg) {
          displayStartTime = childSg.startTime;
          displayEndTime = childSg.endTime;
          subGroupName = childSg.name;
        }
      }

      return {
        type: "teacher-lesson" as const,
        id: lesson.id,
        title: lesson.title,
        groupName: lesson.group?.name ?? "",
        teacherName: lesson.teacher.name,
        startTime: displayStartTime,
        endTime: displayEndTime,
        zoomLink: lesson.zoomLink,
        notes: lesson.notes,
        recurrence: lesson.recurrence,
        subGroupName,
        isPast: isViewingToday && displayEndTime <= israelTime,
      };
    });

  // Fetch personal events for today
  const personalEvents = await prisma.personalEvent.findMany({
    where: {
      userId: session.user.id,
      date: { gte: dayStart, lte: dayEnd },
    },
    orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
  });

  // Fetch lessons for today
  const lessons = await prisma.scheduleItem.findMany({
    where: {
      childId: { in: childIds },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    include: { child: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  // Fetch playdates the user's children are participating in (today and future)
  const playdateParticipants = await prisma.playdateParticipant.findMany({
    where: {
      childId: { in: childIds },
      playdate: {
        status: { in: ["OPEN", "FULL"] },
        dateTime: { gte: dayStart },
      },
    },
    include: {
      child: { select: { id: true, name: true } },
      playdate: {
        include: {
          host: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
          participants: {
            include: { child: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  // Also fetch playdates the user is hosting (today and future)
  const hostedPlaydates = await prisma.playdate.findMany({
    where: {
      hostId: session.user.id,
      status: { in: ["OPEN", "FULL"] },
      dateTime: { gte: dayStart },
    },
    include: {
      host: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
      participants: {
        include: { child: { select: { id: true, name: true } } },
      },
    },
  });

  // Deduplicate playdates (in case user hosts and also joined with a child)
  const seenPlaydateIds = new Set<string>();
  const allPlaydates = [];

  for (const pp of playdateParticipants) {
    if (!seenPlaydateIds.has(pp.playdate.id)) {
      seenPlaydateIds.add(pp.playdate.id);
      allPlaydates.push(pp.playdate);
    }
  }
  for (const pd of hostedPlaydates) {
    if (!seenPlaydateIds.has(pd.id)) {
      seenPlaydateIds.add(pd.id);
      allPlaydates.push(pd);
    }
  }

  return NextResponse.json({
    children,
    teacherLessons: filteredTeacherLessons,
    personalEvents: personalEvents.map((e) => ({
      type: "personal" as const,
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      startTime: e.startTime,
      endTime: e.endTime,
      notes: e.notes,
      emoji: e.emoji,
    })),
    lessons: lessons.map((l) => ({
      type: "lesson" as const,
      id: l.id,
      childName: l.child.name,
      childId: l.child.id,
      subject: l.subject,
      startTime: l.startTime.toISOString(),
      endTime: l.endTime.toISOString(),
      zoomUrl: l.zoomUrl,
      notes: l.notes,
      isPast: isViewingToday && l.endTime < new Date(),
    })),
    playdates: allPlaydates
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      .map((pd) => ({
        type: "playdate" as const,
        id: pd.id,
        hostName: pd.host.name,
        hostId: pd.hostId,
        groupName: pd.group.name,
        address: pd.address,
        dateTime: pd.dateTime.toISOString(),
        endTime: pd.endTime,
        maxCapacity: pd.maxCapacity,
        status: pd.status,
        notes: pd.notes,
        participantCount: pd.participants.length,
        participantNames: pd.participants.map((p) => p.child.name),
      })),
  });
}
