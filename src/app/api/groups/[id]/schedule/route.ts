import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString, isValidUrl } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/schedule - push a lesson to all group members
export async function POST(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;
  const { subject, startTime, endTime, zoomUrl, notes } = await req.json();

  const sanitizedSubject = sanitizeString(subject, 200);
  const sanitizedStartTime = sanitizeString(startTime, 20);
  const sanitizedEndTime = sanitizeString(endTime, 20);
  const sanitizedNotes = sanitizeString(notes, 2000);

  if (!sanitizedSubject || !sanitizedStartTime || !sanitizedEndTime) {
    return NextResponse.json({ error: "subject, startTime, endTime are required" }, { status: 400 });
  }

  const sanitizedZoomUrl = sanitizeString(zoomUrl, 500);
  if (sanitizedZoomUrl && !isValidUrl(sanitizedZoomUrl)) {
    return NextResponse.json({ error: "Invalid Zoom URL" }, { status: 400 });
  }

  // Verify teacher owns this group (SUPERADMIN sees all)
  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
    include: { members: { select: { childId: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (group.members.length === 0) {
    return NextResponse.json({ error: "No members in group" }, { status: 400 });
  }

  // Create a ScheduleItem for each child in the group
  try {
    const items = await prisma.scheduleItem.createMany({
      data: group.members.map((m) => ({
        subject: sanitizedSubject,
        startTime: new Date(sanitizedStartTime),
        endTime: new Date(sanitizedEndTime),
        zoomUrl: sanitizedZoomUrl,
        notes: sanitizedNotes,
        childId: m.childId,
        groupId: id,
      })),
    });

    return NextResponse.json({ created: items.count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create schedule items" }, { status: 500 });
  }
}
