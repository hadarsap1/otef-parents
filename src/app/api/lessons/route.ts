import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lessons — list lessons (parents see all, teachers see own)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isTeacher =
    session.user.role === "TEACHER" || session.user.role === "SUPERADMIN";

  const lessons = await prisma.lesson.findMany({
    where: isTeacher ? teacherFilter(session) : {},
    include: {
      teacher: { select: { name: true } },
      group: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
      registrations: isTeacher
        ? { include: { child: { select: { id: true, name: true } } } }
        : {
            where: {
              child: {
                OR: [
                  { parentId: session.user.id },
                  { childParents: { some: { userId: session.user.id } } },
                ],
              },
            },
            select: { childId: true },
          },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(lessons);
}

// POST /api/lessons — teacher creates a lesson slot
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { title, day, startTime, endTime, maxKids, groupId, zoomLink } =
    await req.json();

  if (
    !title?.trim() ||
    day == null ||
    !startTime ||
    !endTime ||
    !maxKids
  ) {
    return NextResponse.json(
      { error: "title, day, startTime, endTime, maxKids are required" },
      { status: 400 }
    );
  }

  if (day < 0 || day > 6) {
    return NextResponse.json({ error: "day must be 0-6" }, { status: 400 });
  }

  if (maxKids < 1 || maxKids > 50) {
    return NextResponse.json(
      { error: "maxKids must be 1-50" },
      { status: 400 }
    );
  }

  // If groupId provided, verify teacher owns it (SUPERADMIN sees all)
  if (groupId) {
    const group = await prisma.group.findFirst({
      where: { id: groupId, ...teacherFilter(session) },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const lesson = await prisma.lesson.create({
    data: {
      title: title.trim(),
      day,
      startTime,
      endTime,
      maxKids,
      teacherId: session.user.id,
      groupId: groupId || null,
      zoomLink: zoomLink?.trim() || null,
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}
