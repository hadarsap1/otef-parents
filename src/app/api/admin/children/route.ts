import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/admin/children?q=searchTerm&excludeGroupId=xxx&parentId=xxx
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 searches per minute per admin
  if (rateLimit(`admin-children-${admin.id}`, 30)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 100); // cap search length
  const excludeGroupId = searchParams.get("excludeGroupId");
  const parentId = searchParams.get("parentId");

  // If parentId provided, return all children for that parent (primary + linked via childParents)
  if (parentId) {
    const children = await prisma.child.findMany({
      where: {
        OR: [
          { parentId },
          { childParents: { some: { userId: parentId } } },
        ],
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
