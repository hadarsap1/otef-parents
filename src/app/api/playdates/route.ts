import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// GET /api/playdates - list playdates for groups the parent's children belong to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all groups the user's children belong to
  const children = await prisma.child.findMany({
    where: {
      OR: [
        { parentId: session.user.id },
        { childParents: { some: { userId: session.user.id } } },
      ],
    },
    select: {
      id: true,
      groupMemberships: { select: { groupId: true } },
    },
  });

  const groupIds = [
    ...new Set(children.flatMap((c) => c.groupMemberships.map((gm) => gm.groupId))),
  ];

  if (groupIds.length === 0) {
    return NextResponse.json([]);
  }

  // Use start of today (in UTC) so playdates for today always appear,
  // even if their time has already passed
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const playdates = await prisma.playdate.findMany({
    where: {
      groupId: { in: groupIds },
      status: { in: ["OPEN", "FULL"] },
      dateTime: { gte: today },
    },
    include: {
      host: { select: { id: true, name: true, image: true } },
      group: { select: { id: true, name: true } },
      participants: {
        include: { child: { select: { id: true, name: true } } },
      },
    },
    orderBy: { dateTime: "asc" },
  });

  return NextResponse.json(playdates);
}

// POST /api/playdates - create a new playdate in a group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { groupId, address, dateTime, endTime, maxCapacity, notes } = body;

  const sanitizedGroupId = sanitizeString(groupId, 30);
  const sanitizedAddress = sanitizeString(address, 500);
  const sanitizedNotes = sanitizeString(notes, 2000);

  if (!sanitizedGroupId || !sanitizedAddress || !dateTime || !maxCapacity) {
    return NextResponse.json(
      { error: "groupId, address, dateTime, and maxCapacity are required" },
      { status: 400 }
    );
  }

  if (maxCapacity < 1 || maxCapacity > 30) {
    return NextResponse.json(
      { error: "maxCapacity must be between 1 and 30" },
      { status: 400 }
    );
  }

  // Verify parent has a child in this group
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId: sanitizedGroupId,
      child: {
        OR: [
          { parentId: session.user.id },
          { childParents: { some: { userId: session.user.id } } },
        ],
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You don't have a child in this group" },
      { status: 403 }
    );
  }

  try {
    const playdate = await prisma.playdate.create({
      data: {
        hostId: session.user.id,
        groupId: sanitizedGroupId,
        address: sanitizedAddress,
        dateTime: new Date(dateTime),
        endTime: endTime?.trim() || null,
        maxCapacity: Number(maxCapacity),
        notes: sanitizedNotes,
      },
    });

    return NextResponse.json(playdate, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create playdate" }, { status: 500 });
  }
}
