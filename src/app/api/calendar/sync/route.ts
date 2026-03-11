import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addToGoogleCalendar } from "@/lib/google-calendar";

// POST /api/calendar/sync — add an event/lesson/playdate to Google Calendar
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, id } = body as { type: string; id: string };

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  let calendarEvent: {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    description?: string | null;
    location?: string | null;
  };

  switch (type) {
    case "personal": {
      const event = await prisma.personalEvent.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      calendarEvent = {
        title: `${event.emoji ? event.emoji + " " : ""}${event.title}`,
        date: event.date.toISOString(),
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.notes,
      };
      break;
    }

    case "lesson": {
      const schedule = await prisma.scheduleItem.findFirst({
        where: {
          id,
          child: {
            OR: [
              { parentId: session.user.id },
              { childParents: { some: { userId: session.user.id } } },
            ],
          },
        },
        include: { child: { select: { name: true } } },
      });
      if (!schedule) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }
      const startH = schedule.startTime.toISOString().slice(11, 16);
      const endH = schedule.endTime.toISOString().slice(11, 16);
      calendarEvent = {
        title: `${schedule.subject} (${schedule.child.name})`,
        date: schedule.startTime.toISOString(),
        startTime: startH,
        endTime: endH,
        description: schedule.notes,
      };
      break;
    }

    case "playdate": {
      const playdate = await prisma.playdate.findFirst({
        where: {
          id,
          OR: [
            { hostId: session.user.id },
            {
              participants: {
                some: {
                  child: {
                    OR: [
                      { parentId: session.user.id },
                      { childParents: { some: { userId: session.user.id } } },
                    ],
                  },
                },
              },
            },
          ],
        },
        include: {
          group: { select: { name: true } },
          host: { select: { name: true } },
        },
      });
      if (!playdate) {
        return NextResponse.json({ error: "Playdate not found" }, { status: 404 });
      }
      const pdStartH = playdate.dateTime.toISOString().slice(11, 16);
      calendarEvent = {
        title: `פלייגדייט - ${playdate.group.name}`,
        date: playdate.dateTime.toISOString(),
        startTime: pdStartH,
        endTime: playdate.endTime,
        description: playdate.notes
          ? `${playdate.notes}\nמארח/ת: ${playdate.host.name}`
          : `מארח/ת: ${playdate.host.name}`,
        location: playdate.address,
      };
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const googleEventId = await addToGoogleCalendar(
    session.user.id,
    calendarEvent
  );

  if (!googleEventId) {
    return NextResponse.json(
      { error: "Failed to add to Google Calendar. Please re-login to grant calendar permission." },
      { status: 500 }
    );
  }

  return NextResponse.json({ googleEventId });
}
