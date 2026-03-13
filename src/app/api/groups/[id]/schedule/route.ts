import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/schedule - push a lesson to all group members
export async function POST(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;
  const { subject, startTime, endTime, zoomUrl, notes } = await req.json();

  if (!subject || !startTime || !endTime) {
    return NextResponse.json({ error: "subject, startTime, endTime are required" }, { status: 400 });
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
  const items = await prisma.scheduleItem.createMany({
    data: group.members.map((m) => ({
      subject: subject.trim(),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      zoomUrl: zoomUrl?.trim() || null,
      notes: notes?.trim() || null,
      childId: m.childId,
      groupId: id,
    })),
  });

  return NextResponse.json({ created: items.count }, { status: 201 });
}
