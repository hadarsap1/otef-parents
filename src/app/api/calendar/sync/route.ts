import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addToGoogleCalendar } from "@/lib/google-calendar";

// POST /api/calendar/sync - add an event/lesson/playdate to Google Calendar
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

  function toIsraelTime(date: Date) {
    const d = date.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const t = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
    });
    return { date: d, time: t };
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
      const start = toIsraelTime(schedule.startTime);
      const end = toIsraelTime(schedule.endTime);
      const lessonDesc = [schedule.notes, schedule.zoomUrl && `Zoom: ${schedule.zoomUrl}`]
        .filter(Boolean)
        .join("\n") || null;
      calendarEvent = {
        title: `${schedule.subject} (${schedule.child.name})`,
        date: schedule.startTime.toISOString(),
        startTime: start.time,
        endTime: end.time,
        description: lessonDesc,
      };
      break;
    }

    case "teacher-lesson": {
      const tLesson = await prisma.lesson.findFirst({
        where: {
          id,
          OR: [
            // Group lesson: child must be member
            {
              group: {
                members: {
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
            },
            // School-wide lesson: child must be in a group in that school
            {
              groupId: null,
              school: {
                groups: {
                  some: {
                    members: {
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
                },
              },
            },
          ],
        },
        include: {
          teacher: { select: { name: true } },
          group: { select: { name: true } },
        },
      });
      if (!tLesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }
      const tDate = tLesson.date.toISOString().split("T")[0];
      const tDesc = [
        tLesson.notes,
        tLesson.teacher.name && `מורה: ${tLesson.teacher.name}`,
        tLesson.zoomLink && `Zoom: ${tLesson.zoomLink}`,
      ].filter(Boolean).join("\n") || null;
      calendarEvent = {
        title: `${tLesson.title}${tLesson.group ? ` (${tLesson.group.name})` : ""}`,
        date: tLesson.date.toISOString(),
        startTime: tLesson.startTime,
        endTime: tLesson.endTime,
        description: tDesc,
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
      const pdStart = toIsraelTime(playdate.dateTime);
      calendarEvent = {
        title: `פליידייט - ${playdate.group.name}`,
        date: playdate.dateTime.toISOString(),
        startTime: pdStart.time,
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

  let googleEventId: string | null;
  try {
    googleEventId = await addToGoogleCalendar(session.user.id, calendarEvent);
  } catch (err) {
    console.error("[calendar/sync] addToGoogleCalendar threw:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to add to Google Calendar" },
      { status: 500 }
    );
  }

  if (!googleEventId) {
    console.error("[calendar/sync] addToGoogleCalendar returned null for user:", session.user.id);
    return NextResponse.json(
      { error: "Failed to add to Google Calendar. Please re-login to grant calendar permission." },
      { status: 500 }
    );
  }

  // Persist per-user calendar sync record
  try {
    await prisma.calendarSync.upsert({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType: type,
          entityId: id,
        },
      },
      update: { googleEventId },
      create: {
        userId: session.user.id,
        googleEventId,
        entityType: type,
        entityId: id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to save calendar event reference" }, { status: 500 });
  }

  return NextResponse.json({ googleEventId });
}
