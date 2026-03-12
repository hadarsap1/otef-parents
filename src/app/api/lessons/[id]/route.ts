import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";

type Params = { params: Promise<{ id: string }> };

// PUT /api/lessons/:id — teacher edits a lesson
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

  const { title, day, startTime, endTime, zoomLink } = await req.json();

  const data: Record<string, unknown> = {};
  if (title?.trim()) data.title = title.trim();
  if (day != null && day >= 0 && day <= 6) data.day = day;
  if (startTime) data.startTime = startTime;
  if (endTime) data.endTime = endTime;
  if (zoomLink !== undefined) data.zoomLink = zoomLink?.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.lesson.update({ where: { id }, data });

  return NextResponse.json(updated);
}

// DELETE /api/lessons/:id — teacher deletes a lesson
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
