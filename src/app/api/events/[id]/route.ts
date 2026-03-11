import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/events/:id
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

  const event = await prisma.personalEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.personalEvent.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title.trim() }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.startTime !== undefined && { startTime: body.startTime || null }),
      ...(body.endTime !== undefined && { endTime: body.endTime || null }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.emoji !== undefined && { emoji: body.emoji || null }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/events/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.personalEvent.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.personalEvent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
