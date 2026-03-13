import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/groups/invite/redeem - parent joins a child to a group via invite code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, childId } = await req.json();

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  if (!childId || typeof childId !== "string") {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  // Verify the parent owns this child (check both parentId and ChildParent table)
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!child) {
    return NextResponse.json(
      { error: "Child not found or not yours" },
      { status: 404 }
    );
  }

  const normalizedCode = code.trim().toUpperCase();

  const invite = await prisma.groupInvite.findUnique({
    where: { code: normalizedCode },
    include: { group: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  // Check if child is already in this group
  const alreadyMember = await prisma.groupMember.findUnique({
    where: {
      groupId_childId: { groupId: invite.groupId, childId },
    },
  });

  if (alreadyMember) {
    return NextResponse.json(
      { error: "Child is already in this group" },
      { status: 400 }
    );
  }

  // Add child to group (code is reusable by multiple parents until it expires)
  await prisma.groupMember.create({
    data: {
      groupId: invite.groupId,
      childId,
    },
  });

  return NextResponse.json(
    { ok: true, groupName: invite.group.name },
    { status: 200 }
  );
}
