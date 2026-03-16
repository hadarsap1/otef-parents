import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

// GET /api/events - list personal events for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.personalEvent.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(events);
}

// POST /api/events - create a personal event
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, date, startTime, endTime, notes, emoji } = body;

  const sanitizedTitle = sanitizeString(title, 200);
  const sanitizedNotes = sanitizeString(notes, 2000);
  const sanitizedStartTime = sanitizeString(startTime, 20);
  const sanitizedEndTime = sanitizeString(endTime, 20);
  const sanitizedEmoji = sanitizeString(emoji, 10);

  if (!sanitizedTitle || !date) {
    return NextResponse.json(
      { error: "title and date are required" },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.personalEvent.create({
      data: {
        title: sanitizedTitle,
        date: new Date(date),
        startTime: sanitizedStartTime,
        endTime: sanitizedEndTime,
        notes: sanitizedNotes,
        emoji: sanitizedEmoji,
        userId: session.user.id,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
