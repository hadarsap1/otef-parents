import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id — get group details
export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "ADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, teacherId: session.user.id },
    include: {
      members: {
        include: { child: { select: { id: true, name: true, grade: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(group);
}

// PUT /api/groups/:id — update group
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "ADMIN");
  if (error) return error;

  const { id } = await params;
  const { name, description } = await req.json();

  const group = await prisma.group.findFirst({
    where: { id, teacherId: session.user.id },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.group.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/groups/:id — delete group
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "ADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, teacherId: session.user.id },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
