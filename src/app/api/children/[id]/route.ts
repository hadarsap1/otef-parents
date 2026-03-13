import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: check if user has any access to a child (owner or linked)
async function getChildAccess(childId: string, userId: string) {
  return prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: userId },
        { childParents: { some: { userId } } },
      ],
    },
    include: {
      childParents: { where: { userId } },
    },
  });
}

// PUT /api/children/[id] - update a child (owner or linked parent)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, grade, className } = body;

  const existing = await getChildAccess(id, session.user.id);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const child = await prisma.child.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(grade !== undefined && { grade: grade?.trim() || null }),
      ...(className !== undefined && { className: className?.trim() || null }),
    },
  });

  return NextResponse.json(child);
}

// DELETE /api/children/[id] - delete a child (only the OWNER can delete)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only the original parentId (the OWNER) may delete
  const existing = await prisma.child.findFirst({
    where: {
      id,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id, role: "OWNER" } } },
      ],
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.child.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
