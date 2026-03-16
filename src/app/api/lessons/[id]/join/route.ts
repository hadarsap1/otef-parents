import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/lessons/:id/join — parent joins a timeslot
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { childId, lessonGroupId } = await req.json();

  if (!childId || !lessonGroupId) {
    return NextResponse.json({ error: "childId and lessonGroupId required" }, { status: 400 });
  }

  // Verify the lesson is TIMESLOTS mode
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      subGroups: { include: { _count: { select: { members: true } } } },
    },
  });

  if (!lesson || !lesson.hasSubGroups || lesson.subGroupMode !== "TIMESLOTS") {
    return NextResponse.json({ error: "Not a timeslot lesson" }, { status: 400 });
  }

  // Verify child belongs to this parent
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

  // Find the target slot
  const slot = lesson.subGroups.find((sg) => sg.id === lessonGroupId);
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Check capacity
  if (slot.maxCapacity && slot._count.members >= slot.maxCapacity) {
    return NextResponse.json({ error: "Slot is full" }, { status: 400 });
  }

  // Remove child from any other slot in this lesson first
  await prisma.lessonGroupMember.deleteMany({
    where: {
      childId,
      lessonGroup: { lessonId: id },
    },
  });

  // Add to the selected slot
  const member = await prisma.lessonGroupMember.create({
    data: { lessonGroupId, childId },
  });

  return NextResponse.json(member, { status: 201 });
}

// DELETE /api/lessons/:id/join — parent leaves a timeslot
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { childId } = await req.json();

  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Verify child belongs to this parent
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

  await prisma.lessonGroupMember.deleteMany({
    where: {
      childId,
      lessonGroup: { lessonId: id },
    },
  });

  return NextResponse.json({ ok: true });
}
