/**
 * sync-lessons.ts — Sync lessons from Google Doc to otef-parents
 *
 * Reads the shared Google Doc, parses the top (most recent) day section,
 * extracts lessons for כיתה ב, and creates them in the database.
 *
 * Features:
 * - Content hash change detection (skips if doc unchanged)
 * - Duplicate detection (won't create same lesson twice)
 * - Auto-detects enrichment events (community zoom sessions)
 * - Supports --force flag to bypass change detection
 *
 * Usage:
 *   npx tsx scripts/sync-lessons.ts           # sync if doc changed
 *   npx tsx scripts/sync-lessons.ts --force   # force sync regardless
 *   npx tsx scripts/sync-lessons.ts --dry-run # parse only, don't create
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load env
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(scriptDir, "..", ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

// ── Config ─────────────────────────────────────────────────────
const DOC_ID = "1rMyqRd46EQosm98qK8eujwjhgY6takyqxiXCSRyxgZ0";
const GROUP_ID = "cmmkg7v420002qdyw4slrxcch"; // כיתה ב
const TEACHER_ID = "cmmkg7u680000qdywckioelh3"; // מערכת (system user)
const CLASS_INDEX = 1; // ב is the 2nd column (0-indexed)
const STATE_FILE = join(scriptDir, ".sync-state.json");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");

// ── Day mapping ────────────────────────────────────────────────
const DAY_NAMES: Record<string, number> = {
  "יום ראשון": 0,
  "יום שני": 1,
  "יום שלישי": 2,
  "יום רביעי": 3,
  "יום חמישי": 4,
};

// ── State management ───────────────────────────────────────────
function loadState(): { lastHash: string } | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveState(hash: string) {
  writeFileSync(STATE_FILE, JSON.stringify({
    lastHash: hash,
    lastSyncDate: new Date().toISOString().split("T")[0],
    lastSyncTime: new Date().toISOString(),
  }, null, 2));
}

// ── Fetch Google Doc ───────────────────────────────────────────
async function fetchDocContent(): Promise<string> {
  const url = `https://docs.google.com/document/d/${DOC_ID}/export?format=txt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status}`);
  return res.text();
}

// ── Helpers ────────────────────────────────────────────────────
interface ParsedLesson {
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string | null;
  notes: string | null;
  isEnrichment: boolean;
}

function extractTime(text: string): string | null {
  const match = text.match(/(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [h, m] = match[1].split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function extractUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s\r\n,]+)/);
  return match ? match[1] : null;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function cleanTitle(text: string): string {
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

function findDayDate(dayName: string): string {
  const targetDow = DAY_NAMES[dayName];
  if (targetDow === undefined) throw new Error(`Unknown day: ${dayName}`);
  const today = new Date();
  const todayDow = today.getDay();
  if (todayDow === targetDow) return today.toISOString().split("T")[0];
  // Find nearest occurrence (prefer past over future for lesson docs)
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
 * The Google Doc export format uses \t to start each table cell,
 * with multi-line content within each cell. Cells are arranged
 * in rows (columns א through ו), tab-delimited.
 *
 * Strategy:
 * 1. Find the first day header
 * 2. Extract content until the next day header
 * 3. Split into cells by \t
 * 4. Group cells into table rows (6-7 cells per row = one row)
 * 5. Pick column CLASS_INDEX for class ב
 * 6. Parse each cell for title + time + zoom link
 * 7. Also detect enrichment rows (large content spanning columns)
 */
function parseDocument(content: string): { date: string; lessons: ParsedLesson[] } {
  // Normalize line endings
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  // Find first and second day headers
  const dayHeaders = Object.keys(DAY_NAMES);
  let firstDay = "";
  let firstDayLine = -1;
  let secondDayLine = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const matched = dayHeaders.find((d) => trimmed === d || trimmed.startsWith(d + " "));
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
    console.error("❌ No day header found");
    return { date: new Date().toISOString().split("T")[0], lessons: [] };
  }

  const date = findDayDate(firstDay);
  console.log(`📅 Top day: ${firstDay} → ${date}`);

  // Extract the first day's section
  const dayContent = lines.slice(firstDayLine + 1, secondDayLine).join("\n");

  // Split by tabs to get cells. Each \t starts a new cell.
  const cells = dayContent.split("\t");

  // Find the header row (cells containing just א, ב, ג, ד, ה, ו)
  // After the header, the data cells start
  let headerFound = false;
  let headerEndIdx = 0;
  const NUM_COLUMNS = 7; // א ב ג ד ה ו + (empty/extra)

  for (let i = 0; i < cells.length - 4; i++) {
    const chunk = cells.slice(i, i + 6).map((c) => c.trim());
    if (chunk[0] === "א" && chunk[1] === "ב" && chunk[2] === "ג") {
      headerFound = true;
      headerEndIdx = i + NUM_COLUMNS; // skip header + any trailing empty cell
      break;
    }
  }

  if (!headerFound) {
    console.error("❌ Could not find table header (א ב ג ד ה)");
    return { date, lessons: [] };
  }

  // Data cells start after header
  const dataCells = cells.slice(headerEndIdx);

  // Enrichment keywords — if a cell contains these, it's likely a community event
  const ENRICHMENT_KEYWORDS = ["אופציונלי", "קהילתי", "מוזמנים", "להרשמה", "כל הגילאים", "כל הקהילה", "כל הילדים"];

  // Group into rows of NUM_COLUMNS — only extract from the target class column
  const lessons: ParsedLesson[] = [];

  for (let rowStart = 0; rowStart < dataCells.length; rowStart += NUM_COLUMNS) {
    const row = dataCells.slice(rowStart, rowStart + NUM_COLUMNS);
    if (row.length < 3) continue;

    // Only look at the target class column
    const classCell = row[CLASS_INDEX]?.trim() || "";
    if (!classCell || classCell.length < 3) continue;

    const time = extractTime(classCell);
    if (!time) continue;

    const url = extractUrl(classCell);
    const title = cleanTitle(classCell);
    if (!title || title.length < 2) continue;

    // Check if this cell is an enrichment event
    const isEnrichment =
      ENRICHMENT_KEYWORDS.some((kw) => classCell.includes(kw)) ||
      (classCell.length > 80 && row.filter((c) => c.trim().length > 15).length <= 2);

    if (isEnrichment) {
      const shortTitle = title.length > 100 ? title.slice(0, 97) + "..." : title;
      lessons.push({
        title: shortTitle,
        startTime: time,
        endTime: addMinutes(time, 60),
        zoomLink: url?.includes("zoom") || url?.includes("meet") ? url : null,
        notes: url && !(url.includes("zoom") || url.includes("meet")) ? `להרשמה: ${url}` : null,
        isEnrichment: true,
      });
    } else {
      lessons.push({
        title,
        startTime: time,
        endTime: addMinutes(time, 60),
        zoomLink: url,
        notes: null,
        isEnrichment: false,
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

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Syncing lessons from Google Doc...\n");

  // 1. Fetch
  const content = await fetchDocContent();
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  // 2. Change detection
  const state = loadState();
  if (!FORCE && state?.lastHash === hash) {
    console.log("✅ Doc unchanged since last sync. Use --force to sync anyway.");
    return;
  }
  console.log(`📄 Doc hash: ${hash}${state ? ` (prev: ${state.lastHash})` : " (first sync)"}`);

  // 3. Parse
  const { date, lessons } = parseDocument(content);

  if (lessons.length === 0) {
    console.log("⚠️  No lessons found for כיתה ב in the top section.");
    saveState(hash);
    return;
  }

  console.log(`\n📋 Found ${lessons.length} lesson(s) for כיתה ב on ${date}:\n`);
  for (const l of lessons) {
    const type = l.isEnrichment ? "🌟 העשרה" : "📚 שיעור";
    const zoom = l.zoomLink ? "🔗" : "  ";
    console.log(`  ${type} ${zoom} ${l.startTime}-${l.endTime}  ${l.title}`);
    if (l.notes) console.log(`     📝 ${l.notes}`);
  }

  if (DRY_RUN) {
    console.log("\n🔸 Dry run — no lessons created.");
    return;
  }

  // 4. Create in DB
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  let created = 0;
  let skipped = 0;

  try {
    for (const l of lessons) {
      const existing = await prisma.lesson.findFirst({
        where: { title: l.title, date: new Date(date), groupId: GROUP_ID, startTime: l.startTime },
      });

      if (existing) {
        console.log(`  ⏭️  Exists: ${l.title} (${l.startTime})`);
        skipped++;
        continue;
      }

      const record = await prisma.lesson.create({
        data: {
          title: l.title,
          date: new Date(date),
          startTime: l.startTime,
          endTime: l.endTime,
          recurrence: "ONCE",
          teacherId: TEACHER_ID,
          groupId: GROUP_ID,
          zoomLink: l.zoomLink,
          notes: l.notes,
          isEnrichment: l.isEnrichment,
          hasSubGroups: false,
          subGroupMode: "MANUAL",
        },
      });
      console.log(`  ✅ Created: ${l.title} (${l.startTime}) → ${record.id}`);
      created++;
    }
  } finally {
    await prisma.$disconnect();
  }

  saveState(hash);
  console.log(`\n──────────────────────────`);
  console.log(`Done! Created: ${created}, Skipped: ${skipped}`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
