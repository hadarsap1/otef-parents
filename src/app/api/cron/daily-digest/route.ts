import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyDigest } from "@/lib/email";

export const maxDuration = 60;

// POST /api/cron/daily-digest - send daily digest email to all users
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Current time in Israel timezone
  const now = new Date();
  const israelNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  const currentHH = String(israelNow.getHours()).padStart(2, "0");
  const currentMM = israelNow.getMinutes();
  // Round down to nearest 30-min slot: "07:00" or "07:30"
  const slotMM = currentMM < 30 ? "00" : "30";
  const dateStr = israelNow.toISOString().split("T")[0];
  const dayStart = new Date(dateStr + "T00:00:00.000Z");
  const dayEnd = new Date(dateStr + "T23:59:59.999Z");

  // Build list of HH:mm values in the current 30-min window
  const digestTimes: string[] = [];
  for (let m = Number(slotMM); m < Number(slotMM) + 30; m++) {
    digestTimes.push(`${currentHH}:${String(m).padStart(2, "0")}`);
  }

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      digestEnabled: true,
      digestTime: { in: digestTimes },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email) continue;

    // Get user's children
    const children = await prisma.child.findMany({
      where: {
        OR: [
          { parentId: user.id },
          { childParents: { some: { userId: user.id } } },
        ],
      },
      select: { id: true, name: true },
    });

    const childIds = children.map((c) => c.id);

    // Fetch personal events
    const personalEvents = await prisma.personalEvent.findMany({
      where: {
        userId: user.id,
        date: { gte: dayStart, lte: dayEnd },
      },
      orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
    });

    // Fetch teacher-created lessons for today
    const groupMemberships = childIds.length > 0
      ? await prisma.groupMember.findMany({
          where: { childId: { in: childIds } },
          select: { groupId: true },
        })
      : [];
    const userGroupIds = [...new Set(groupMemberships.map((m) => m.groupId))];

    const digestDow = dayStart.getDay();
    const teacherLessons = userGroupIds.length > 0
      ? await prisma.lesson.findMany({
          where: {
            groupId: { in: userGroupIds },
            OR: [
              { recurrence: "ONCE", date: { gte: dayStart, lte: dayEnd } },
              { recurrence: "DAILY" },
              { recurrence: "WEEKLY" },
            ],
          },
          include: {
            teacher: { select: { name: true } },
            group: { select: { name: true } },
            subGroups: {
              include: {
                members: { select: { childId: true } },
              },
            },
          },
          orderBy: { startTime: "asc" },
        })
      : [];

    // Filter: WEEKLY must match day-of-week, sub-grouped must include child
    const filteredTeacherLessons = teacherLessons
      .filter((lesson) => {
        if (lesson.recurrence === "WEEKLY" && lesson.date.getDay() !== digestDow) return false;
        if (!lesson.hasSubGroups) return true;
        return lesson.subGroups.some((sg) =>
          sg.members.some((m) => childIds.includes(m.childId))
        );
      })
      .map((lesson) => {
        let startTime = lesson.startTime;
        let endTime = lesson.endTime;
        let subGroupName: string | null = null;

        if (lesson.hasSubGroups) {
          const sg = lesson.subGroups.find((sg) =>
            sg.members.some((m) => childIds.includes(m.childId))
          );
          if (sg) {
            startTime = sg.startTime;
            endTime = sg.endTime;
            subGroupName = (sg as { name: string }).name;
          }
        }

        return {
          title: lesson.title,
          groupName: lesson.group?.name ?? "",
          teacherName: lesson.teacher.name,
          startTime,
          endTime,
          zoomLink: lesson.zoomLink,
          subGroupName,
        };
      });

    // Fetch parent-created lessons (ScheduleItems)
    const lessons = childIds.length > 0
      ? await prisma.scheduleItem.findMany({
          where: {
            childId: { in: childIds },
            startTime: { gte: dayStart, lte: dayEnd },
          },
          include: { child: { select: { name: true } } },
          orderBy: { startTime: "asc" },
        })
      : [];

    // Fetch playdates (participating + hosting)
    const participantPlaydates = childIds.length > 0
      ? await prisma.playdateParticipant.findMany({
          where: {
            childId: { in: childIds },
            playdate: {
              status: { in: ["OPEN", "FULL"] },
              dateTime: { gte: dayStart, lte: dayEnd },
            },
          },
          include: {
            playdate: {
              include: {
                host: { select: { name: true } },
                group: { select: { name: true } },
              },
            },
          },
        })
      : [];

    const hostedPlaydates = await prisma.playdate.findMany({
      where: {
        hostId: user.id,
        status: { in: ["OPEN", "FULL"] },
        dateTime: { gte: dayStart, lte: dayEnd },
      },
      include: {
        host: { select: { name: true } },
        group: { select: { name: true } },
      },
    });

    // Deduplicate playdates
    const seenPdIds = new Set<string>();
    const allPlaydates = [];
    for (const pp of participantPlaydates) {
      if (!seenPdIds.has(pp.playdate.id)) {
        seenPdIds.add(pp.playdate.id);
        allPlaydates.push(pp.playdate);
      }
    }
    for (const pd of hostedPlaydates) {
      if (!seenPdIds.has(pd.id)) {
        seenPdIds.add(pd.id);
        allPlaydates.push(pd);
      }
    }

    const ok = await sendDailyDigest(user.email, {
      userName: user.name || "הורה יקר/ה",
      date: dateStr,
      personalEvents: personalEvents.map((e) => ({
        emoji: e.emoji,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        notes: e.notes,
      })),
      teacherLessons: filteredTeacherLessons,
      lessons: lessons.map((l) => ({
        childName: l.child.name,
        subject: l.subject,
        startTime: l.startTime.toISOString().slice(11, 16),
        endTime: l.endTime.toISOString().slice(11, 16),
        zoomUrl: l.zoomUrl,
      })),
      playdates: allPlaydates.map((pd) => ({
        groupName: pd.group.name,
        hostName: pd.host.name ?? "לא ידוע",
        time: pd.dateTime.toISOString().slice(11, 16),
        endTime: pd.endTime,
        address: pd.address ?? null,
      })),
    });

    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ sent, skipped, total: users.length });
}
