import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";

type Params = { params: Promise<{ id: string }> };

// PUT /api/lessons/:id - teacher edits a lesson
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, date, startTime, endTime, zoomLink, notes, recurrence, subGroups } = await req.json();

  const data: Record<string, unknown> = {};
  if (title?.trim()) data.title = title.trim();
  if (date) data.date = new Date(date);
  if (startTime) data.startTime = startTime;
  if (endTime) data.endTime = endTime;
  if (zoomLink !== undefined) data.zoomLink = zoomLink?.trim() || null;
  if (notes !== undefined) data.notes = notes?.trim() || null;
  if (recurrence && ["ONCE", "DAILY", "WEEKLY"].includes(recurrence)) data.recurrence = recurrence;

  // Handle sub-groups: delete all existing and recreate
  if (subGroups !== undefined) {
    const hasSubGroups = Array.isArray(subGroups) && subGroups.length > 0;
    data.hasSubGroups = hasSubGroups;

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing sub-groups (cascade deletes members)
      await tx.lessonGroup.deleteMany({ where: { lessonId: id } });

      // Update lesson
      const updatedLesson = await tx.lesson.update({ where: { id }, data });

      // Create new sub-groups
      if (hasSubGroups) {
        for (const sg of subGroups) {
          await tx.lessonGroup.create({
            data: {
              lessonId: id,
              name: sg.name,
              startTime: sg.startTime,
              endTime: sg.endTime,
              maxCapacity: sg.maxCapacity ?? null,
              ...(sg.childIds?.length && {
                members: {
                  create: sg.childIds.map((childId: string) => ({ childId })),
                },
              }),
            },
          });
        }
      }

      return updatedLesson;
    });

    return NextResponse.json(updated);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.lesson.update({ where: { id }, data });

  return NextResponse.json(updated);
}

// DELETE /api/lessons/:id - teacher deletes a lesson
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (lesson.googleEventId) {
    await deleteFromGoogleCalendar(session!.user.id, lesson.googleEventId);
  }

  await prisma.lesson.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
