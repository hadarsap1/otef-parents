import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lessons — list lessons
// Parents: lessons for groups their children belong to
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
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
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

  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((m) => m.groupId))),
  ];

  const lessons = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      teacher: { select: { name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(lessons);
}

// POST /api/lessons — teacher creates a lesson (groupId required)
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { title, day, startTime, endTime, groupId, zoomLink } =
    await req.json();

  if (!title?.trim() || day == null || !startTime || !endTime || !groupId) {
    return NextResponse.json(
      { error: "title, day, startTime, endTime, groupId are required" },
      { status: 400 }
    );
  }

  if (day < 0 || day > 6) {
    return NextResponse.json({ error: "day must be 0-6" }, { status: 400 });
  }

  // Verify teacher owns the group (SUPERADMIN sees all)
  const group = await prisma.group.findFirst({
    where: { id: groupId, ...teacherFilter(session) },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const lesson = await prisma.lesson.create({
    data: {
      title: title.trim(),
      day,
      startTime,
      endTime,
      teacherId: session.user.id,
      groupId,
      zoomLink: zoomLink?.trim() || null,
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}
