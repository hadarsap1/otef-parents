import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";
import { sanitizeString, isValidUrl } from "@/lib/validation";

// PUT /api/schedule/[id] - update a schedule item
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

  // Verify ownership through child
  const existing = await prisma.scheduleItem.findUnique({
    where: { id },
    include: { child: true },
  });

  // Allow access if user is direct parent or co-parent via ChildParent
  const hasAccess =
    existing &&
    (existing.child.parentId === session.user.id ||
      (await prisma.childParent.findUnique({
        where: {
          childId_userId: {
            childId: existing.childId,
            userId: session.user.id,
          },
        },
      })) !== null);

  if (!hasAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.zoomUrl !== undefined && body.zoomUrl !== null && body.zoomUrl !== "") {
    const sanitizedZoomUrl = sanitizeString(body.zoomUrl, 500);
    if (sanitizedZoomUrl && !isValidUrl(sanitizedZoomUrl)) {
      return NextResponse.json({ error: "Invalid Zoom URL" }, { status: 400 });
    }
  }

  try {
    const item = await prisma.scheduleItem.update({
      where: { id },
      data: {
        ...(body.subject && { subject: sanitizeString(body.subject, 200) ?? body.subject.trim() }),
        ...(body.startTime && { startTime: new Date(body.startTime) }),
        ...(body.endTime && { endTime: new Date(body.endTime) }),
        ...(body.zoomUrl !== undefined && {
          zoomUrl: sanitizeString(body.zoomUrl, 500),
        }),
        ...(body.notes !== undefined && { notes: sanitizeString(body.notes, 2000) }),
      },
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update schedule item" }, { status: 500 });
  }
}

// DELETE /api/schedule/[id] - delete a schedule item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.scheduleItem.findUnique({
    where: { id },
    include: { child: true },
  });

  // Allow access if user is direct parent or co-parent via ChildParent
  const hasAccess =
    existing &&
    (existing.child.parentId === session.user.id ||
      (await prisma.childParent.findUnique({
        where: {
          childId_userId: {
            childId: existing.childId,
            userId: session.user.id,
          },
        },
      })) !== null);

  if (!hasAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete Google Calendar events for all users who synced this schedule item
  const calendarSyncs = await prisma.calendarSync.findMany({
    where: { entityType: "lesson", entityId: id },
  });
  await Promise.allSettled(
    calendarSyncs.map((sync) => deleteFromGoogleCalendar(sync.userId, sync.googleEventId))
  );

  await prisma.$transaction([
    prisma.calendarSync.deleteMany({ where: { entityType: "lesson", entityId: id } }),
    prisma.scheduleItem.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
