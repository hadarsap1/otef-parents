import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// GET /api/schedule?childId=xxx&date=2026-03-09
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const dateStr = searchParams.get("date");

  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  // Verify ownership (direct parent or co-parent via ChildParent)
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

  // Build date filter
  let dateFilter = {};
  if (dateStr) {
    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);
    dateFilter = {
      startTime: { gte: dayStart, lte: dayEnd },
    };
  }

  const items = await prisma.scheduleItem.findMany({
    where: { childId, ...dateFilter },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(items);
}

// POST /api/schedule - add a schedule item
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { childId, subject, startTime, endTime, zoomUrl, notes } = body;

  const sanitizedChildId = sanitizeString(childId, 30);
  const sanitizedSubject = sanitizeString(subject, 200);
  const sanitizedStartTime = sanitizeString(startTime, 20);
  const sanitizedEndTime = sanitizeString(endTime, 20);
  const sanitizedZoomUrl = sanitizeString(zoomUrl, 500);
  const sanitizedNotes = sanitizeString(notes, 2000);

  if (!sanitizedChildId || !sanitizedSubject || !sanitizedStartTime || !sanitizedEndTime) {
    return NextResponse.json(
      { error: "childId, subject, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  // Validate zoomUrl if provided
  if (sanitizedZoomUrl) {
    try {
      const parsed = new URL(sanitizedZoomUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json({ error: "Invalid Zoom URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid Zoom URL" }, { status: 400 });
    }
  }

  // Verify ownership (direct parent or co-parent via ChildParent)
  const child = await prisma.child.findFirst({
    where: {
      id: sanitizedChildId,
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  try {
    const item = await prisma.scheduleItem.create({
      data: {
        childId: sanitizedChildId,
        subject: sanitizedSubject,
        startTime: new Date(sanitizedStartTime),
        endTime: new Date(sanitizedEndTime),
        zoomUrl: sanitizedZoomUrl,
        notes: sanitizedNotes,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create schedule item" }, { status: 500 });
  }
}
