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

// GET /api/admin/children?q=searchTerm&excludeGroupId=xxx&parentId=xxx
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const excludeGroupId = searchParams.get("excludeGroupId");
  const parentId = searchParams.get("parentId");

  // If parentId provided, return all children for that parent
  if (parentId) {
    const children = await prisma.child.findMany({
      where: {
        parentId,
        ...(excludeGroupId
          ? { groupMemberships: { none: { groupId: excludeGroupId } } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        grade: true,
        groupMemberships: {
          select: { group: { select: { id: true, name: true } } },
        },
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(children);
  }

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const children = await prisma.child.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      ...(excludeGroupId
        ? { groupMemberships: { none: { groupId: excludeGroupId } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      grade: true,
      parent: { select: { id: true, name: true, email: true } },
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(children);
}
