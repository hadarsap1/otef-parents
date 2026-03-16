import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// POST /api/admin/groups/members - add a child to a group
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const groupId = sanitizeString(body.groupId, 30);
  const childId = sanitizeString(body.childId, 30);

  if (!groupId || !childId) {
    return NextResponse.json({ error: "groupId and childId required" }, { status: 400 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_childId: { groupId, childId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Child already in group" }, { status: 409 });
  }

  try {
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
  } catch {
    return NextResponse.json({ error: "Invalid group or child" }, { status: 400 });
  }
}
