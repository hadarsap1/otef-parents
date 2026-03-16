import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

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

  const sanitizedName = sanitizeString(name, 200);
  const sanitizedGrade = sanitizeString(grade, 50);
  const sanitizedClassName = sanitizeString(className, 50);

  if (!sanitizedName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const child = await prisma.child.create({
      data: {
        name: sanitizedName,
        grade: sanitizedGrade,
        className: sanitizedClassName,
        parentId: session.user.id,
      },
    });

    return NextResponse.json(child, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create child" }, { status: 500 });
  }
}
