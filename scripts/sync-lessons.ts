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
import {
  type ParsedLesson,
  parseDocument,
} from "./sync-lessons-parser.js";

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
const STATE_FILE = join(scriptDir, ".sync-state.json");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");

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

// ── Helpers + ParsedLesson + parseDocument ─────────────────────
// All parsing logic lives in sync-lessons-parser.ts (imported above).

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

  const classLessons = lessons.filter((l) => !l.isSchoolWide);
  const schoolWideLessons = lessons.filter((l) => l.isSchoolWide);
  console.log(`\n📋 Found ${classLessons.length} class lesson(s) + ${schoolWideLessons.length} school-wide lesson(s) on ${date}:\n`);
  for (const l of lessons) {
    const scope = l.isSchoolWide ? "🏫 כל הכיתות" : (l.isEnrichment ? "🌟 העשרה" : "📚 שיעור");
    const zoom = l.zoomLink ? "🔗" : "  ";
    console.log(`  ${scope} ${zoom} ${l.startTime}-${l.endTime}  ${l.title}`);
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
    // Look up the schoolId from the group (for school-wide lessons)
    const group = await prisma.group.findUnique({
      where: { id: GROUP_ID },
      select: { schoolId: true },
    });
    const schoolId = group?.schoolId;
    if (!schoolId) {
      console.error("❌ Could not find schoolId for group", GROUP_ID);
      return;
    }

    for (const l of lessons) {
      // School-wide lessons: match by schoolId + no groupId
      // Class lessons: match by groupId
      const existingWhere = l.isSchoolWide
        ? { title: l.title, date: new Date(date), schoolId, groupId: null, startTime: l.startTime }
        : { title: l.title, date: new Date(date), groupId: GROUP_ID, startTime: l.startTime };

      const existing = await prisma.lesson.findFirst({ where: existingWhere });

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
          // School-wide: set schoolId, no groupId. Class-specific: set groupId.
          groupId: l.isSchoolWide ? null : GROUP_ID,
          schoolId: l.isSchoolWide ? schoolId : null,
          zoomLink: l.zoomLink,
          notes: l.notes,
          isEnrichment: l.isEnrichment,
          hasSubGroups: false,
          subGroupMode: "MANUAL",
        },
      });
      const scope = l.isSchoolWide ? "🏫" : "✅";
      console.log(`  ${scope} Created: ${l.title} (${l.startTime}) → ${record.id}`);
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
