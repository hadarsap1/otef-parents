import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";
import { sanitizeString, isValidUrl } from "@/lib/validation";

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

  if (zoomLink !== undefined && zoomLink !== null && zoomLink !== "") {
    const sanitizedZoomLink = sanitizeString(zoomLink, 500);
    if (sanitizedZoomLink && !isValidUrl(sanitizedZoomLink)) {
      return NextResponse.json({ error: "Invalid Zoom link" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (title?.trim()) data.title = sanitizeString(title, 200) ?? title.trim();
  if (date) data.date = new Date(date);
  if (startTime) data.startTime = sanitizeString(startTime, 20) ?? startTime;
  if (endTime) data.endTime = sanitizeString(endTime, 20) ?? endTime;
  if (zoomLink !== undefined) data.zoomLink = sanitizeString(zoomLink, 500);
  if (notes !== undefined) data.notes = sanitizeString(notes, 2000);
  if (recurrence && ["ONCE", "DAILY", "WEEKLY"].includes(recurrence)) data.recurrence = recurrence;

  // Handle sub-groups: delete all existing and recreate
  if (subGroups !== undefined) {
    const cappedSubGroups = Array.isArray(subGroups) ? subGroups.slice(0, 20) : subGroups;
    const hasSubGroups = Array.isArray(cappedSubGroups) && cappedSubGroups.length > 0;
    data.hasSubGroups = hasSubGroups;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        // Delete existing sub-groups (cascade deletes members)
        await tx.lessonGroup.deleteMany({ where: { lessonId: id } });

        // Update lesson
        const updatedLesson = await tx.lesson.update({ where: { id }, data });

        // Create new sub-groups
        if (hasSubGroups) {
          for (const sg of cappedSubGroups) {
            await tx.lessonGroup.create({
              data: {
                lessonId: id,
                name: sanitizeString(sg.name, 200) ?? sg.name,
                startTime: sanitizeString(sg.startTime, 20) ?? sg.startTime,
                endTime: sanitizeString(sg.endTime, 20) ?? sg.endTime,
                maxCapacity: sg.maxCapacity ?? null,
                ...(sg.childIds?.length && {
                  members: {
                    create: sg.childIds.map((childId: string) => ({ childId: sanitizeString(childId, 30) ?? childId })),
                  },
                }),
              },
            });
          }
        }

        return updatedLesson;
      });

      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.lesson.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }
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

  // Delete Google Calendar events for all users who synced this lesson
  const calendarSyncs = await prisma.calendarSync.findMany({
    where: { entityType: "teacher-lesson", entityId: id },
  });
  for (const sync of calendarSyncs) {
    await deleteFromGoogleCalendar(sync.userId, sync.googleEventId);
  }
  await prisma.calendarSync.deleteMany({
    where: { entityType: "teacher-lesson", entityId: id },
  });

  await prisma.lesson.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
