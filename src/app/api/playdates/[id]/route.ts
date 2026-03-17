import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromGoogleCalendar } from "@/lib/google-calendar";

// DELETE /api/playdates/[id] - cancel a playdate (host only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const playdate = await prisma.playdate.findUnique({ where: { id } });

  if (!playdate || playdate.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete Google Calendar events for all users who synced this playdate
  const calendarSyncs = await prisma.calendarSync.findMany({
    where: { entityType: "playdate", entityId: id },
  });
  await Promise.allSettled(
    calendarSyncs.map((sync) => deleteFromGoogleCalendar(sync.userId, sync.googleEventId))
  );

  await prisma.$transaction([
    prisma.calendarSync.deleteMany({ where: { entityType: "playdate", entityId: id } }),
    prisma.playdate.update({ where: { id }, data: { status: "CANCELLED" } }),
  ]);

  return NextResponse.json({ ok: true });
}
