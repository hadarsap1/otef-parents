/**
 * sync-lessons-parser.ts
 *
 * Pure parsing logic extracted from sync-lessons.ts so it can be
 * imported by both the sync script and unit tests without pulling in
 * Prisma, env loading, or any I/O side-effects.
 */

// ── Types ──────────────────────────────────────────────────────
export interface ParsedLesson {
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string | null;
  notes: string | null;
  isEnrichment: boolean;
  isSchoolWide: boolean;
}

// ── Constants ──────────────────────────────────────────────────
export const DAY_NAMES: Record<string, number> = {
  "יום ראשון": 0,
  "יום שני": 1,
  "יום שלישי": 2,
  "יום רביעי": 3,
  "יום חמישי": 4,
};

/** 0-based index of the target class column (ב = column index 1) */
export const CLASS_INDEX = 1;

// ── Helpers ────────────────────────────────────────────────────
export function extractTime(text: string): string | null {
  const match = text.match(/(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [h, m] = match[1].split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function extractUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s\r\n,]+)/);
  return match ? match[1] : null;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function cleanTitle(text: string): string {
  return text
    .replace(/\d{1,2}:\d{2}/g, "")
    .replace(/https?:\/\/[^\s\r\n,]+/g, "")
    .replace(/להרשמה[^\n]*/g, "")
    .replace(/ניפגש[^\n]*/g, "")
    .replace(/נחכה[^\n]*/g, "")
    .replace(/הזום בשעה[^\n]*/g, "")
    .replace(/👈[^\n]*/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findDayDate(dayName: string): string {
  const targetDow = DAY_NAMES[dayName];
  if (targetDow === undefined) throw new Error(`Unknown day: ${dayName}`);
  const today = new Date();
  const todayDow = today.getDay();
  if (todayDow === targetDow) return today.toISOString().split("T")[0];
  let best = "";
  let bestDist = 999;
  for (let offset = -6; offset <= 7; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    if (d.getDay() === targetDow && Math.abs(offset) < bestDist) {
      best = d.toISOString().split("T")[0];
      bestDist = Math.abs(offset);
    }
  }
  return best || today.toISOString().split("T")[0];
}

// ── Parser ─────────────────────────────────────────────────────
/**
 * Parses the exported plain-text content of the shared Google Doc.
 *
 * Doc structure (tab-separated table):
 *   - Day header line  (e.g. "יום ראשון")
 *   - Column header row  (א \t ב \t ג \t ד \t ה \t ו)
 *   - Data rows  (7 tab-separated cells, one per class column)
 *   - School-wide rows  (time-only cell \t long content cell)
 *
 * Returns the date inferred from the first day header and the list
 * of lessons for CLASS_INDEX (כיתה ב) plus any school-wide lessons.
 */
export function parseDocument(
  content: string
): { date: string; lessons: ParsedLesson[] } {
  // Normalise line endings
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  // Locate first and second day headers
  const dayHeaders = Object.keys(DAY_NAMES);
  let firstDay = "";
  let firstDayLine = -1;
  let secondDayLine = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const matched = dayHeaders.find(
      (d) => trimmed === d || trimmed.startsWith(d + " ")
    );
    if (matched) {
      if (!firstDay) {
        firstDay = matched;
        firstDayLine = i;
      } else {
        secondDayLine = i;
        break;
      }
    }
  }

  if (!firstDay) {
    return { date: new Date().toISOString().split("T")[0], lessons: [] };
  }

  const date = findDayDate(firstDay);

  // Extract the first day's section only
  const dayContent = lines.slice(firstDayLine + 1, secondDayLine).join("\n");

  // Split by tabs — each \t introduces a new cell
  const cells = dayContent.split("\t");

  // Locate the column header row (א ב ג ...)
  const NUM_COLUMNS = 7;
  let headerFound = false;
  let headerEndIdx = 0;

  for (let i = 0; i < cells.length - 4; i++) {
    const chunk = cells.slice(i, i + 6).map((c) => c.trim());
    if (chunk[0] === "א" && chunk[1] === "ב" && chunk[2] === "ג") {
      headerFound = true;
      headerEndIdx = i + NUM_COLUMNS;
      break;
    }
  }

  if (!headerFound) {
    return { date, lessons: [] };
  }

  const dataCells = cells.slice(headerEndIdx);

  const ENRICHMENT_KEYWORDS = [
    "אופציונלי",
    "קהילתי",
    "מוזמנים",
    "להרשמה",
    "כל הגילאים",
    "כל הקהילה",
    "כל הילדים",
  ];
  const SCHOOL_WIDE_KEYWORDS = [
    "כל הגילאים",
    "כל הכיתות",
    "כל הקהילה",
    "כל הילדים",
    "מיועד לכל",
  ];

  // ── Pass 1: School-wide lessons ────────────────────────────
  // A time-only cell immediately followed by a long / keyword-bearing cell.
  const schoolWideCellIndices = new Set<number>();
  const lessons: ParsedLesson[] = [];

  for (let i = 0; i < dataCells.length - 1; i++) {
    const cell = dataCells[i].trim();
    const nextCell = dataCells[i + 1].trim();
    const isTimeOnly = /^\d{1,2}:\d{2}$/.test(cell);
    const isSchoolWideContent =
      nextCell.length > 50 &&
      (SCHOOL_WIDE_KEYWORDS.some((kw) => nextCell.includes(kw)) ||
        nextCell.length > 120);

    if (isTimeOnly && isSchoolWideContent) {
      const time = extractTime(cell)!;
      const url = extractUrl(nextCell);
      const title = cleanTitle(nextCell);
      if (title && title.length >= 2) {
        const shortTitle =
          title.length > 100 ? title.slice(0, 97) + "..." : title;
        lessons.push({
          title: shortTitle,
          startTime: time,
          endTime: addMinutes(time, 60),
          zoomLink:
            url?.includes("zoom") || url?.includes("meet") ? url : null,
          notes:
            url && !(url.includes("zoom") || url.includes("meet"))
              ? `להרשמה: ${url}`
              : null,
          isEnrichment: true,
          isSchoolWide: true,
        });
      }
      schoolWideCellIndices.add(i);
      schoolWideCellIndices.add(i + 1);
    }
  }

  // ── Pass 2: Class-column lessons ───────────────────────────
  for (let rowStart = 0; rowStart < dataCells.length; rowStart += NUM_COLUMNS) {
    if (
      schoolWideCellIndices.has(rowStart) ||
      schoolWideCellIndices.has(rowStart + CLASS_INDEX)
    )
      continue;

    const row = dataCells.slice(rowStart, rowStart + NUM_COLUMNS);
    if (row.length < 3) continue;

    const classCell = row[CLASS_INDEX]?.trim() || "";
    if (!classCell || classCell.length < 3) continue;

    const time = extractTime(classCell);
    if (!time) continue;

    const url = extractUrl(classCell);
    const title = cleanTitle(classCell);
    if (!title || title.length < 2) continue;

    const isEnrichment =
      ENRICHMENT_KEYWORDS.some((kw) => classCell.includes(kw)) ||
      (classCell.length > 80 &&
        row.filter((c) => c.trim().length > 15).length <= 2);

    if (isEnrichment) {
      const shortTitle =
        title.length > 100 ? title.slice(0, 97) + "..." : title;
      lessons.push({
        title: shortTitle,
        startTime: time,
        endTime: addMinutes(time, 60),
        zoomLink:
          url?.includes("zoom") || url?.includes("meet") ? url : null,
        notes:
          url && !(url.includes("zoom") || url.includes("meet"))
            ? `להרשמה: ${url}`
            : null,
        isEnrichment: true,
        isSchoolWide: false,
      });
    } else {
      lessons.push({
        title,
        startTime: time,
        endTime: addMinutes(time, 60),
        zoomLink: url,
        notes: null,
        isEnrichment: false,
        isSchoolWide: false,
      });
    }
  }

  // Deduplicate by title+time
  const seen = new Set<string>();
  return {
    date,
    lessons: lessons.filter((l) => {
      const key = `${l.title}|${l.startTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
