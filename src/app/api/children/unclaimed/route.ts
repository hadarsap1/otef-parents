import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SYSTEM_EMAIL = "system@otef-parents.app";

// GET /api/children/unclaimed - returns children owned by system user, grouped by group
// School-scoped: parents only see unclaimed children from schools they're associated with
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_EMAIL },
  });

  if (!systemUser) {
    return NextResponse.json([]);
  }

  // Find which schools this parent is associated with (via their children's groups)
  const parentSchoolIds = await prisma.group.findMany({
    where: {
      members: { some: { child: { OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ] } } },
      schoolId: { not: null },
    },
    select: { schoolId: true },
    distinct: ["schoolId"],
  });

  const schoolIds = parentSchoolIds
    .map((g) => g.schoolId)
    .filter((id): id is string => id !== null);

  // If parent has no school associations, return empty - they need to join via invite code first
  if (schoolIds.length === 0) {
    return NextResponse.json([]);
  }

  const children = await prisma.child.findMany({
    where: {
      parentId: systemUser.id,
      groupMemberships: {
        some: {
          group: { schoolId: { in: schoolIds } },
        },
      },
    },
    include: {
      groupMemberships: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Group children by their group
  const grouped: Record<string, { groupId: string; groupName: string; children: { id: string; name: string; grade: string | null }[] }> = {};

  for (const child of children) {
    for (const gm of child.groupMemberships) {
      if (!grouped[gm.group.id]) {
        grouped[gm.group.id] = {
          groupId: gm.group.id,
          groupName: gm.group.name,
          children: [],
        };
      }
      grouped[gm.group.id].children.push({
        id: child.id,
        name: child.name,
        grade: child.grade,
      });
    }
  }

  return NextResponse.json(Object.values(grouped));
}

// POST /api/children/unclaimed - claim a child (transfer from system user to current user)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  const systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_EMAIL },
  });

  if (!systemUser) {
    return NextResponse.json({ error: "System user not found" }, { status: 500 });
  }

  // Verify the child belongs to system user (is unclaimed)
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: systemUser.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found or already claimed" }, { status: 404 });
  }

  // Check if this user already claimed this child
  const alreadyClaimed = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (alreadyClaimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  // Transfer ownership
  const updated = await prisma.child.update({
    where: { id: childId },
    data: { parentId: session.user.id },
  });

  return NextResponse.json(updated);
}
