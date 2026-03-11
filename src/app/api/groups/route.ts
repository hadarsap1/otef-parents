import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/groups — list teacher's groups
export async function GET() {
  const { error, session } = await requireRole("TEACHER", "ADMIN");
  if (error) return error;

  const groups = await prisma.group.findMany({
    where: { teacherId: session.user.id },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

// POST /api/groups — create a group
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("TEACHER", "ADMIN");
  if (error) return error;

  const { name, description } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      teacherId: session.user.id,
    },
  });

  return NextResponse.json(group, { status: 201 });
}
