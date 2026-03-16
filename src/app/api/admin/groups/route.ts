import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// GET /api/admin/groups - returns all groups with members
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      school: { select: { id: true, name: true } },
      members: {
        include: {
          child: {
            select: {
              id: true,
              name: true,
              grade: true,
              parent: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { child: { name: "asc" } },
      },
      _count: { select: { members: true, playdates: true, lessons: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}

// PUT /api/admin/groups - update group name or school
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const groupId = sanitizeString(body.groupId, 30);
  if (!groupId) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 });
  }

  const data: { name?: string; schoolId?: string | null } = {};
  const name = sanitizeString(body.name, 200);
  if (name) data.name = name;
  if (body.schoolId !== undefined) {
    data.schoolId = sanitizeString(body.schoolId, 30) || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data,
      include: { school: { select: { id: true, name: true } } },
    });
    return NextResponse.json(group);
  } catch {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
}

// DELETE /api/admin/groups - remove a child from a group
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const childId = searchParams.get("childId");

  if (!groupId || !childId) {
    return NextResponse.json({ error: "groupId and childId required" }, { status: 400 });
  }

  await prisma.groupMember.deleteMany({
    where: { groupId, childId },
  });

  return NextResponse.json({ ok: true });
}
