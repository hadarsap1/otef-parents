import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/children/invite/redeem - link current user to ALL children of the inviter
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase();

  // Look up the invite
  const invite = await prisma.childInvite.findUnique({
    where: { code: normalizedCode },
    include: { child: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "Code already used" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  // Prevent the owner from redeeming their own invite
  if (invite.createdByUserId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot redeem your own invite" },
      { status: 400 }
    );
  }

  // Find ALL children belonging to the inviter (not just the one on the invite)
  const allChildren = await prisma.child.findMany({
    where: { parentId: invite.createdByUserId },
    select: { id: true, name: true },
  });

  // Filter out children already linked to this user
  const existingLinks = await prisma.childParent.findMany({
    where: {
      userId: session.user.id,
      childId: { in: allChildren.map((c) => c.id) },
    },
    select: { childId: true },
  });

  const linkedIds = new Set(existingLinks.map((l) => l.childId));
  const childrenToLink = allChildren.filter((c) => !linkedIds.has(c.id));

  if (childrenToLink.length === 0) {
    return NextResponse.json(
      { error: "Already linked to all children" },
      { status: 400 }
    );
  }

  // Link ALL children and mark the invite as used - in a transaction
  await prisma.$transaction([
    ...childrenToLink.map((child) =>
      prisma.childParent.create({
        data: {
          childId: child.id,
          userId: session.user.id,
          role: "LINKED",
        },
      })
    ),
    prisma.childInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedByUserId: session.user.id,
      },
    }),
  ]);

  const names = childrenToLink.map((c) => c.name).join(", ");

  return NextResponse.json(
    { ok: true, childName: names, count: childrenToLink.length },
    { status: 200 }
  );
}
