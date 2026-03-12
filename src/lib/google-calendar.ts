import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Get an authenticated Google OAuth2 client for a user.
 * Refreshes the access token if expired.
 */
export async function getGoogleAuth(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token || !account.refresh_token) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!.trim(),
    process.env.GOOGLE_CLIENT_SECRET!.trim()
  );

  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // If token is expired, refresh and persist
  const now = Date.now();
  if (account.expires_at && account.expires_at * 1000 < now) {
    const { credentials } = await oauth2.refreshAccessToken();
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : null,
      },
    });
    oauth2.setCredentials(credentials);
  }

  return oauth2;
}

interface CalendarEventInput {
  title: string;
  date: string; // ISO date string
  startTime?: string | null; // "HH:mm"
  endTime?: string | null; // "HH:mm"
  description?: string | null;
  location?: string | null;
}

/**
 * Add an event to the user's primary Google Calendar.
 * Returns the Google Calendar event ID, or null on failure.
 */
export async function addToGoogleCalendar(
  userId: string,
  event: CalendarEventInput
): Promise<string | null> {
  const auth = await getGoogleAuth(userId);
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const timeZone = "Asia/Jerusalem";

  // Parse the date portion
  const datePart = event.date.split("T")[0]; // "YYYY-MM-DD"

  let eventBody: {
    summary: string;
    description?: string;
    location?: string;
    start: Record<string, string>;
    end: Record<string, string>;
  };

  if (event.startTime) {
    // Timed event
    const startDateTime = `${datePart}T${event.startTime}:00`;
    const endTime = event.endTime || event.startTime;
    const endDateTime = `${datePart}T${endTime}:00`;

    eventBody = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    };
  } else {
    // All-day event
    eventBody = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: { date: datePart },
      end: { date: datePart },
    };
  }

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
  });

  return res.data.id || null;
}

/**
 * Delete an event from the user's primary Google Calendar.
 * Silently ignores errors (e.g. event already deleted).
 */
export async function deleteFromGoogleCalendar(
  userId: string,
  googleEventId: string
): Promise<void> {
  const auth = await getGoogleAuth(userId);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
  } catch {
    // Event may already be deleted or user revoked access — ignore
  }
}
