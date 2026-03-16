import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id - get group details
export async function GET(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
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

// PUT /api/groups/:id - update group
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;
  const { name, description } = await req.json();

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name: sanitizeString(name, 200) ?? name.trim() }),
        ...(description !== undefined && { description: sanitizeString(description, 2000) }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

// DELETE /api/groups/:id - delete group
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
