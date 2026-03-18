import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString, isValidUrl } from "@/lib/validation";

// GET /api/lessons - list lessons
// Parents: upcoming lessons for groups their children belong to (filtered by sub-group membership)
// Teachers: own lessons
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isTeacher =
    session.user.role === "TEACHER" || session.user.role === "SUPERADMIN";

  if (isTeacher) {
    const lessons = await prisma.lesson.findMany({
      where: teacherFilter(session),
      include: {
        teacher: { select: { name: true } },
        group: {
          select: {
            id: true,
            name: true,
            members: { select: { child: { select: { id: true, name: true } } } },
          },
        },
        subGroups: {
          include: {
            members: { include: { child: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(lessons);
  }

  // Parent: find lessons for groups their children belong to
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true, groupMemberships: { select: { groupId: true } } },
  });

  const childIds = children.map((c) => c.id);
  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.groupId))),
  ];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Fetch one-time future lessons + all recurring lessons
  const lessons = await prisma.lesson.findMany({
    where: {
      groupId: { in: groupIds },
      OR: [
        { recurrence: "ONCE", date: { gte: now } },
        { recurrence: { not: "ONCE" } },
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
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Filter: TIMESLOTS lessons are always visible (parents self-select).
  // MANUAL sub-grouped lessons are only shown if at least one child is in a sub-group.
  const filtered = lessons.filter((lesson) => {
    if (!lesson.hasSubGroups) return true;
    if (lesson.subGroupMode === "TIMESLOTS") return true;
    return lesson.subGroups.some((sg) =>
      sg.members.some((m) => childIds.includes(m.childId))
    );
  });

  return NextResponse.json(filtered);
}

// POST /api/lessons - teacher creates a lesson (groupId optional)
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { title, date, startTime, endTime, groupId, groupIds, schoolId, zoomLink, notes, recurrence, subGroupMode, subGroups, isEnrichment } =
    await req.json();

  const sanitizedTitle = sanitizeString(title, 200);
  const sanitizedStartTime = sanitizeString(startTime, 20);
  const sanitizedEndTime = sanitizeString(endTime, 20);
  const sanitizedZoomLink = sanitizeString(zoomLink, 500);
  const sanitizedNotes = sanitizeString(notes, 2000);
  const sanitizedGroupId = sanitizeString(groupId, 30);

  if (!sanitizedTitle || !date || !sanitizedStartTime || !sanitizedEndTime) {
    return NextResponse.json(
      { error: "title, date, startTime, endTime are required" },
      { status: 400 }
    );
  }

  if (sanitizedZoomLink && !isValidUrl(sanitizedZoomLink)) {
    return NextResponse.json({ error: "Invalid Zoom link" }, { status: 400 });
  }

  const validRecurrence = ["ONCE", "DAILY", "WEEKLY"].includes(recurrence) ? recurrence : "ONCE";

  // Support multi-group: groupIds array takes precedence over single groupId
  const resolvedGroupIds: string[] = [];
  if (Array.isArray(groupIds) && groupIds.length > 0) {
    for (const gid of groupIds.slice(0, 50)) {
      const sanitized = sanitizeString(gid, 30);
      if (sanitized) resolvedGroupIds.push(sanitized);
    }
  } else if (sanitizedGroupId) {
    resolvedGroupIds.push(sanitizedGroupId);
  }

  // Verify teacher owns all specified groups
  for (const gid of resolvedGroupIds) {
    const group = await prisma.group.findFirst({
      where: { id: gid, ...teacherFilter(session) },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const cappedSubGroups = Array.isArray(subGroups) ? subGroups.slice(0, 20) : subGroups;
  const hasSubGroupsFlag = Array.isArray(cappedSubGroups) && cappedSubGroups.length > 0;

  // Resolve schoolId for school-wide lessons
  const sanitizedSchoolId = sanitizeString(schoolId, 30);

  // Create one lesson per group, or one school-wide lesson if none selected
  const targetGroups = resolvedGroupIds.length > 0 ? resolvedGroupIds : [null];

  try {
    const lessons = [];
    for (const gid of targetGroups) {
      const lesson = await prisma.lesson.create({
        data: {
          title: sanitizedTitle,
          date: new Date(date),
          startTime: sanitizedStartTime,
          endTime: sanitizedEndTime,
          recurrence: validRecurrence,
          teacherId: session.user.id,
          groupId: gid,
          schoolId: gid ? null : sanitizedSchoolId,
          zoomLink: sanitizedZoomLink,
          notes: sanitizedNotes,
          isEnrichment: isEnrichment === true,
          hasSubGroups: hasSubGroupsFlag,
          subGroupMode: hasSubGroupsFlag && ["MANUAL", "TIMESLOTS"].includes(subGroupMode) ? subGroupMode : "MANUAL",
          ...(hasSubGroupsFlag && {
            subGroups: {
              create: cappedSubGroups.map((sg: { name: string; startTime: string; endTime: string; maxCapacity?: number; childIds?: string[] }) => ({
                name: sanitizeString(sg.name, 200) ?? sg.name,
                startTime: sanitizeString(sg.startTime, 20) ?? sg.startTime,
                endTime: sanitizeString(sg.endTime, 20) ?? sg.endTime,
                maxCapacity: sg.maxCapacity ?? null,
                ...(sg.childIds?.length && {
                  members: {
                    create: sg.childIds.map((childId: string) => ({ childId: sanitizeString(childId, 30) ?? childId })),
                  },
                }),
              })),
            },
          }),
        },
        include: {
          subGroups: {
            include: {
              members: { include: { child: { select: { id: true, name: true } } } },
            },
          },
        },
      });
      lessons.push(lesson);
    }

    // Return single lesson for backward compat, or array if multi-group
    return NextResponse.json(lessons.length === 1 ? lessons[0] : lessons, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
  }
}
