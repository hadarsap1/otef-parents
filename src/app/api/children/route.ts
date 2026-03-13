import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/children - list current user's children
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return children where user is the original parent OR linked via ChildParent
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(children);
}

// POST /api/children - add a child
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, grade, className } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const child = await prisma.child.create({
    data: {
      name: name.trim(),
      grade: grade?.trim() || null,
      className: className?.trim() || null,
      parentId: session.user.id,
    },
  });

  return NextResponse.json(child, { status: 201 });
}
