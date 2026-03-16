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

  // Verify the target slot belongs to this lesson (outside the transaction is fine —
  // we only need maxCapacity metadata, not the live count).
  const slot = await prisma.lessonGroup.findFirst({
    where: { id: lessonGroupId, lessonId: id },
  });
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Wrap the delete + capacity-check + create in a single transaction so that
  // no two concurrent requests can both pass the capacity guard or observe a
  // stale member count.
  let member: Awaited<ReturnType<typeof prisma.lessonGroupMember.create>>;
  try {
    member = await prisma.$transaction(async (tx) => {
      // 1. Remove the child from any other slot in this lesson first so that
      //    the freed seat is visible to the count query that follows.
      await tx.lessonGroupMember.deleteMany({
        where: {
          childId,
          lessonGroup: { lessonId: id },
        },
      });

      // 2. Re-check capacity with the live count AFTER the delete so that the
      //    child's own old seat does not count against the limit.
      if (slot.maxCapacity !== null) {
        const currentCount = await tx.lessonGroupMember.count({
          where: { lessonGroupId },
        });
        if (currentCount >= slot.maxCapacity) {
          throw new Error("SLOT_FULL");
        }
      }

      // 3. Create the new membership.
      return tx.lessonGroupMember.create({
        data: { lessonGroupId, childId },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return NextResponse.json({ error: "Slot is full" }, { status: 400 });
    }
    throw err;
  }

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
