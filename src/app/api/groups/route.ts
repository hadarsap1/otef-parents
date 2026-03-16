import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// GET /api/groups - list teacher's groups
export async function GET() {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const groups = await prisma.group.findMany({
    where: teacherFilter(session),
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

// POST /api/groups - create a group
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { name, description } = await req.json();

  const sanitizedName = sanitizeString(name, 200);
  const sanitizedDescription = sanitizeString(description, 2000);

  if (!sanitizedName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
