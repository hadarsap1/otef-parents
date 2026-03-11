import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/parent-groups — returns groups the current user's children belong to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: {
      groupMemberships: {
        select: {
          group: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Deduplicate groups
  const groupMap = new Map<string, { id: string; name: string }>();
  for (const child of children) {
    for (const gm of child.groupMemberships) {
      groupMap.set(gm.group.id, gm.group);
    }
  }

  return NextResponse.json(Array.from(groupMap.values()));
}
