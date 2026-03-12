import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

interface DailyDigestData {
  userName: string;
  date: string; // "YYYY-MM-DD"
  personalEvents: {
    emoji: string | null;
    title: string;
    startTime: string | null;
    endTime: string | null;
    notes: string | null;
  }[];
  lessons: {
    childName: string;
    subject: string;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    zoomUrl: string | null;
  }[];
  playdates: {
    groupName: string;
    hostName: string;
    time: string; // "HH:mm"
    endTime: string | null;
    address: string | null;
  }[];
}

function formatHebrewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[d.getDay()];
  return `יום ${dayName}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function buildDigestHtml(data: DailyDigestData): string {
  const dateDisplay = formatHebrewDate(data.date);
  const hasContent =
    data.personalEvents.length > 0 ||
    data.lessons.length > 0 ||
    data.playdates.length > 0;

  if (!hasContent) {
    return "";
  }

  let lessonsHtml = "";
  if (data.lessons.length > 0) {
    const rows = data.lessons
      .map(
        (l) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${l.startTime}–${l.endTime}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${l.subject}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${l.childName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${l.zoomUrl ? `<a href="${l.zoomUrl}" style="color:#2563eb;">קישור</a>` : "—"}</td>
          </tr>`
      )
      .join("");

    lessonsHtml = `
      <h2 style="font-size:16px;color:#1e293b;margin:24px 0 8px;">📚 שיעורים</h2>
      <table style="width:100%;border-collapse:collapse;direction:rtl;">
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">שעה</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">מקצוע</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">ילד/ה</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;color:#64748b;">זום</th>
        </tr>
        ${rows}
      </table>`;
  }

  let eventsHtml = "";
  if (data.personalEvents.length > 0) {
    const items = data.personalEvents
      .map((e) => {
        const time = e.startTime
          ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ""} `
          : "";
        return `<li style="padding:6px 0;font-size:14px;">${e.emoji || "📌"} <strong>${e.title}</strong> ${time}${e.notes ? `<br><span style="color:#64748b;font-size:13px;">${e.notes}</span>` : ""}</li>`;
      })
      .join("");

    eventsHtml = `
      <h2 style="font-size:16px;color:#1e293b;margin:24px 0 8px;">🗓️ אירועים אישיים</h2>
      <ul style="list-style:none;padding:0;margin:0;direction:rtl;">${items}</ul>`;
  }

  let playdatesHtml = "";
  if (data.playdates.length > 0) {
    const items = data.playdates
      .map((pd) => {
        const time = pd.endTime ? `${pd.time}–${pd.endTime}` : pd.time;
        return `<li style="padding:6px 0;font-size:14px;">🎈 <strong>פליידייט – ${pd.groupName}</strong><br>
          <span style="color:#64748b;font-size:13px;">🕐 ${time} | מארח/ת: ${pd.hostName}${pd.address ? ` | 📍 ${pd.address}` : ""}</span></li>`;
      })
      .join("");

    playdatesHtml = `
      <h2 style="font-size:16px;color:#1e293b;margin:24px 0 8px;">🎈 פליידייטים</h2>
      <ul style="list-style:none;padding:0;margin:0;direction:rtl;">${items}</ul>`;
  }

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:24px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">☀️ בוקר טוב, ${data.userName}!</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">${dateDisplay}</p>
    </div>
    <div style="padding:16px 32px 32px;">
      ${lessonsHtml}
      ${eventsHtml}
      ${playdatesHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;">
      <p style="font-size:12px;color:#94a3b8;text-align:center;">עוטף הורים 💙</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendDailyDigest(
  to: string,
  data: DailyDigestData
): Promise<boolean> {
  const html = buildDigestHtml(data);
  if (!html) return false; // nothing to send

  const dateDisplay = formatHebrewDate(data.date);

  const { error } = await resend.emails.send({
    from: "עוטף הורים <donotreplay@loz.com>",
    to,
    subject: `📋 סיכום יומי – ${dateDisplay}`,
    html,
  });

  if (error) {
    console.error("Failed to send digest to", to, error);
    return false;
  }
  return true;
}
