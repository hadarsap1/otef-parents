import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/playdates/[id]/join - join a child to a playdate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { childId } = body;

  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  // Verify the child belongs to the current user (direct or co-parent)
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Use a transaction to prevent race conditions on capacity
  try {
    await prisma.$transaction(async (tx) => {
      const playdate = await tx.playdate.findUnique({
        where: { id },
        include: { participants: true },
      });

      if (!playdate || playdate.status === "CANCELLED") {
        throw new Error("NOT_FOUND");
      }

      if (playdate.status === "FULL" || playdate.participants.length >= playdate.maxCapacity) {
        throw new Error("FULL");
      }

      const alreadyJoined = playdate.participants.some(
        (p) => p.childId === childId
      );
      if (alreadyJoined) {
        throw new Error("ALREADY_JOINED");
      }

      await tx.playdateParticipant.create({
        data: { childId, playdateId: id },
      });

      const newCount = playdate.participants.length + 1;
      if (newCount >= playdate.maxCapacity) {
        await tx.playdate.update({
          where: { id },
          data: { status: "FULL" },
        });
      }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Playdate not found or cancelled" }, { status: 404 });
    }
    if (msg === "FULL") {
      return NextResponse.json({ error: "Playdate is full" }, { status: 400 });
    }
    if (msg === "ALREADY_JOINED") {
      return NextResponse.json({ error: "Child already joined" }, { status: 400 });
    }
    throw e;
  }
}

// DELETE /api/playdates/[id]/join - remove a child from a playdate
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  // Verify the child belongs to the current user (direct or co-parent)
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const participant = await prisma.playdateParticipant.findUnique({
    where: { childId_playdateId: { childId, playdateId: id } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not joined" }, { status: 404 });
  }

  await prisma.playdateParticipant.delete({
    where: { id: participant.id },
  });

  // If was FULL, reopen
  const playdate = await prisma.playdate.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (playdate && playdate.status === "FULL") {
    await prisma.playdate.update({
      where: { id },
      data: { status: "OPEN" },
    });
  }

  return NextResponse.json({ ok: true });
}
