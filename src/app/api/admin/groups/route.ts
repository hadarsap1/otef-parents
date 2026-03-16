import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "SUPERADMIN") return null;
  return user;
}

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

// PUT /api/admin/groups - update group name
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, name, schoolId } = await req.json();
  if (!groupId) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 });
  }

  const data: { name?: string; schoolId?: string | null } = {};
  if (name?.trim()) data.name = name.trim();
  if (schoolId !== undefined) data.schoolId = schoolId;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data,
    include: { school: { select: { id: true, name: true } } },
  });

  return NextResponse.json(group);
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
