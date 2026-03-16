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

// POST /api/admin/groups/members - add a child to a group
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, childId } = await req.json();
  if (!groupId || !childId) {
    return NextResponse.json({ error: "groupId and childId required" }, { status: 400 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_childId: { groupId, childId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Child already in group" }, { status: 409 });
  }

  const member = await prisma.groupMember.create({
    data: { groupId, childId },
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
  });

  return NextResponse.json(member, { status: 201 });
}
