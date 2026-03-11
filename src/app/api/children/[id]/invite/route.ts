import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  // 6 uppercase alphanumeric characters (no ambiguous chars like 0/O, 1/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/children/[id]/invite — generate a 6-char invite code (valid 24h)
// Only the OWNER (parentId or ChildParent with OWNER role) can create invites
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: childId } = await params;

  // Check that user is the OWNER of this child (original parentId or ChildParent OWNER)
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: session.user.id },
        {
          childParents: {
            some: { userId: session.user.id, role: "OWNER" },
          },
        },
      ],
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Generate a unique code (retry on collision, extremely unlikely)
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const conflict = await prisma.childInvite.findUnique({ where: { code } });
    if (!conflict) break;
    code = generateCode();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const invite = await prisma.childInvite.create({
    data: {
      code,
      childId,
      createdByUserId: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt }, { status: 201 });
}
