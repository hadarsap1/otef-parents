import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/lessons/:id/register — parent registers a child
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { childId } = await req.json();

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 }
    );
  }

  // Verify parent owns this child (direct or co-parent)
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

  // Atomic capacity check + registration inside a transaction
  try {
    const registration = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({
        where: { id },
        include: { _count: { select: { registrations: true } } },
      });
      if (!lesson) {
        throw new Error("LESSON_NOT_FOUND");
      }

      if (lesson._count.registrations >= lesson.maxKids) {
        throw new Error("LESSON_FULL");
      }

      // Check if already registered
      const existing = await tx.lessonRegistration.findUnique({
        where: { lessonId_childId: { lessonId: id, childId } },
      });
      if (existing) {
        throw new Error("ALREADY_REGISTERED");
      }

      return tx.lessonRegistration.create({
        data: { lessonId: id, childId },
      });
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "LESSON_NOT_FOUND") {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    if (message === "LESSON_FULL") {
      return NextResponse.json({ error: "Lesson is full" }, { status: 409 });
    }
    if (message === "ALREADY_REGISTERED") {
      return NextResponse.json(
        { error: "Already registered" },
        { status: 409 }
      );
    }
    throw err;
  }
}

// DELETE /api/lessons/:id/register — parent unregisters a child
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { childId } = await req.json();

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 }
    );
  }

  // Verify parent owns this child (direct or co-parent)
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

  await prisma.lessonRegistration.deleteMany({
    where: { lessonId: id, childId },
  });

  return NextResponse.json({ ok: true });
}
