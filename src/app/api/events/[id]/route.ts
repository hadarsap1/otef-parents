import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";
import { sanitizeString } from "@/lib/validation";

// PUT /api/events/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const event = await prisma.personalEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.personalEvent.update({
      where: { id },
      data: {
        ...(body.title && { title: sanitizeString(body.title, 200) ?? body.title.trim() }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.startTime !== undefined && { startTime: sanitizeString(body.startTime, 20) }),
        ...(body.endTime !== undefined && { endTime: sanitizeString(body.endTime, 20) }),
        ...(body.notes !== undefined && { notes: sanitizeString(body.notes, 2000) }),
        ...(body.emoji !== undefined && { emoji: sanitizeString(body.emoji, 10) }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/events/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.personalEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete Google Calendar event for this user
  const sync = await prisma.calendarSync.findUnique({
    where: { userId_entityType_entityId: { userId: session.user.id, entityType: "personal", entityId: id } },
  });
  if (sync) {
    await deleteFromGoogleCalendar(session.user.id, sync.googleEventId);
    await prisma.calendarSync.delete({ where: { id: sync.id } });
  }

  await prisma.personalEvent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
