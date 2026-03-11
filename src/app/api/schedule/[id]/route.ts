import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/schedule/[id] — update a schedule item
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

  // Verify ownership through child
  const existing = await prisma.scheduleItem.findUnique({
    where: { id },
    include: { child: true },
  });

  // Allow access if user is direct parent or co-parent via ChildParent
  const hasAccess =
    existing &&
    (existing.child.parentId === session.user.id ||
      (await prisma.childParent.findUnique({
        where: {
          childId_userId: {
            childId: existing.childId,
            userId: session.user.id,
          },
        },
      })) !== null);

  if (!hasAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.scheduleItem.update({
    where: { id },
    data: {
      ...(body.subject && { subject: body.subject.trim() }),
      ...(body.startTime && { startTime: new Date(body.startTime) }),
      ...(body.endTime && { endTime: new Date(body.endTime) }),
      ...(body.zoomUrl !== undefined && {
        zoomUrl: body.zoomUrl?.trim() || null,
      }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
    },
  });

  return NextResponse.json(item);
}

// DELETE /api/schedule/[id] — delete a schedule item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.scheduleItem.findUnique({
    where: { id },
    include: { child: true },
  });

  // Allow access if user is direct parent or co-parent via ChildParent
  const hasAccess =
    existing &&
    (existing.child.parentId === session.user.id ||
      (await prisma.childParent.findUnique({
        where: {
          childId_userId: {
            childId: existing.childId,
            userId: session.user.id,
          },
        },
      })) !== null);

  if (!hasAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scheduleItem.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
