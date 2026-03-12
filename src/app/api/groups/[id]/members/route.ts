import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id/members — list group members
export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: { child: { select: { id: true, name: true, grade: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

// DELETE /api/groups/:id/members?childId=xxx — remove a child from group
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;
  const childId = req.nextUrl.searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupMember.deleteMany({
    where: { groupId: id, childId },
  });

  return NextResponse.json({ ok: true });
}
