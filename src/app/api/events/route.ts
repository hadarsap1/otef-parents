import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (!title?.trim() || !date) {
    return NextResponse.json(
      { error: "title and date are required" },
      { status: 400 }
    );
  }

  const event = await prisma.personalEvent.create({
    data: {
      title: title.trim(),
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      notes: notes?.trim() || null,
      emoji: emoji || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
