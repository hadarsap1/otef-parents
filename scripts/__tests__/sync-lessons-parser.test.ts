/**
 * Unit tests for the sync-lessons parseDocument function.
 *
 * Run with:  npx tsx scripts/__tests__/sync-lessons-parser.test.ts
 *
 * Uses Node's built-in `node:test` runner + `node:assert/strict`.
 * No Jest / Vitest dependency required.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDocument } from "../sync-lessons-parser.js";

// ── Doc-builder helpers ─────────────────────────────────────────
/**
 * Builds a minimal Google Doc text export for one day.
 *
 * The real doc format after a plain-text export looks like:
 *
 *   יום ראשון\n
 *   \tא\tב\tג\tד\tה\tו\n
 *   \t<cell-א>\t<cell-ב>\t<cell-ג>\t<cell-ד>\t<cell-ה>\t<cell-ו>\n
 *
 * Each cell can contain newlines (multi-line cell content).
 * School-wide rows are a pair: \t<time>\t<long content>\n
 */
function buildDay(
  dayHeader: string,
  dataRows: string[],   // already tab-joined rows (7 cells each) or standalone pairs
  nextDayHeader?: string
): string {
  const header = `\tא\tב\tג\tד\tה\tו\t`;
  const body = dataRows.join("\n");
  const suffix = nextDayHeader ? `\n${nextDayHeader}\n` : "";
  return `${dayHeader}\n${header}\n${body}${suffix}`;
}

/**
 * Creates a standard 7-cell class row.
 * @param cells Array of exactly 7 cell strings (א through ו + extra).
 */
function classRow(cells: string[]): string {
  return `\t${cells.join("\t")}`;
}

/** Creates a school-wide row pair: \t<time>\t<longContent> */
function schoolWideRow(time: string, content: string): string {
  return `\t${time}\t${content}`;
}

// ── 1. Normal class lesson ──────────────────────────────────────
describe("normal class lesson", () => {
  test("extracts a standard lesson from column ב (index 1)", () => {
    const doc = buildDay("יום ראשון", [
      classRow([
        "שיעור א 9:00",
        "מתמטיקה 9:00",   // ← column ב (index 1), should be extracted
        "שיעור ג 9:00",
        "שיעור ד 9:00",
        "שיעור ה 9:00",
        "שיעור ו 9:00",
        "",
      ]),
    ]);

    const { lessons } = parseDocument(doc);
    assert.equal(lessons.length, 1, "exactly one lesson extracted");
    assert.equal(lessons[0].title, "מתמטיקה", "title cleaned correctly");
    assert.equal(lessons[0].startTime, "09:00", "startTime parsed");
    assert.equal(lessons[0].endTime, "10:00", "endTime is startTime + 60 min");
    assert.equal(lessons[0].isSchoolWide, false, "not school-wide");
    assert.equal(lessons[0].isEnrichment, false, "not enrichment");
  });
});

// ── 2. School-wide lesson (length > 120) ───────────────────────
describe("school-wide lesson", () => {
  test("time-only cell followed by content > 120 chars is school-wide", () => {
    // Content must be > 120 chars to trigger the length-based school-wide path
    const longContent =
      "אירוע קהילתי מיוחד לכלל בית הספר — הצגת סוף שנה בחצר. " +
      "מוזמנות כל המשפחות להגיע. הכניסה חופשית ומיועדת לכולם ולכל הגילאים!";
    assert.ok(longContent.length > 120, "pre-condition: content > 120 chars");

    const doc = buildDay("יום שני", [schoolWideRow("10:00", longContent)]);

    const { lessons } = parseDocument(doc);
    const schoolWide = lessons.filter((l) => l.isSchoolWide);
    assert.equal(schoolWide.length, 1, "one school-wide lesson detected");
    assert.equal(schoolWide[0].startTime, "10:00");
    assert.equal(schoolWide[0].isEnrichment, true);
  });
});

// ── 3. School-wide with keyword (> 50 chars, < 120) ────────────
describe("school-wide lesson via keyword", () => {
  test("keyword 'כל הגילאים' triggers school-wide even below 120 chars", () => {
    // Between 51 and 120 chars, contains a keyword
    const content = "הופעה מיוחדת — כל הגילאים מוזמנים להגיע לאולם המרכזי";
    assert.ok(content.length > 50, "pre-condition: > 50 chars");
    assert.ok(content.length <= 120, "pre-condition: <= 120 chars");

    const doc = buildDay("יום שלישי", [schoolWideRow("11:00", content)]);

    const { lessons } = parseDocument(doc);
    const schoolWide = lessons.filter((l) => l.isSchoolWide);
    assert.equal(schoolWide.length, 1, "keyword triggers school-wide detection");
    assert.equal(schoolWide[0].startTime, "11:00");
  });
});

// ── 4. No school-wide lessons ──────────────────────────────────
describe("no school-wide lessons", () => {
  test("doc with only regular class rows produces 0 school-wide", () => {
    const doc = buildDay("יום רביעי", [
      classRow([
        "חשבון 8:00",
        "עברית 8:00",
        "אנגלית 8:00",
        "מדעים 8:00",
        "גיאוגרפיה 8:00",
        "אמנות 8:00",
        "",
      ]),
      classRow([
        "ספרות 10:00",
        "תנ\"ך 10:00",
        "היסטוריה 10:00",
        "חינוך גופני 10:00",
        "מוסיקה 10:00",
        "מחשבים 10:00",
        "",
      ]),
    ]);

    const { lessons } = parseDocument(doc);
    const schoolWide = lessons.filter((l) => l.isSchoolWide);
    assert.equal(schoolWide.length, 0, "no school-wide lessons");
    assert.ok(lessons.length > 0, "class lessons were still extracted");
  });
});

// ── 5. Mixed: class + school-wide in same doc ──────────────────
describe("mixed class and school-wide lessons", () => {
  test("both types extracted in same day section", () => {
    const longContent =
      "יריד קהילתי לכלל בית הספר — דוכנים, פעילויות ומשחקים ופינוקים לכל הגיל. " +
      "כל המשפחות מוזמנות. הכניסה חופשית לכולם. נשמח לראותכם!";
    assert.ok(longContent.length > 120, "pre-condition: content > 120 chars");

    const doc = buildDay("יום חמישי", [
      classRow([
        "חשבון 8:30",
        "עברית 8:30",
        "אנגלית 8:30",
        "מדעים 8:30",
        "גיאוגרפיה 8:30",
        "אמנות 8:30",
        "",
      ]),
      schoolWideRow("14:00", longContent),
    ]);

    const { lessons } = parseDocument(doc);
    const schoolWide = lessons.filter((l) => l.isSchoolWide);
    const classLessons = lessons.filter((l) => !l.isSchoolWide);
    assert.equal(schoolWide.length, 1, "one school-wide lesson");
    assert.equal(classLessons.length, 1, "one class lesson for column ב");
  });
});

// ── 6. Separator not treated as lesson ─────────────────────────
describe("separator row", () => {
  test("________________ row does not produce a lesson", () => {
    const doc = buildDay("יום ראשון", [
      classRow([
        "חשבון 9:00",
        "עברית 9:00",
        "אנגלית 9:00",
        "מדעים 9:00",
        "גיאוגרפיה 9:00",
        "אמנות 9:00",
        "",
      ]),
      // Separator row — all cells are underscores with no time
      classRow([
        "________________",
        "________________",
        "________________",
        "________________",
        "________________",
        "________________",
        "",
      ]),
    ]);

    const { lessons } = parseDocument(doc);
    // Separator row has no time → extractTime returns null → skipped
    for (const l of lessons) {
      assert.ok(
        !l.title.includes("____"),
        `separator title should not appear in lessons: "${l.title}"`
      );
    }
    assert.equal(lessons.length, 1, "only the real lesson row is extracted");
  });
});

// ── 7. Empty class column ──────────────────────────────────────
describe("empty class column", () => {
  test("row where column ב is empty is skipped", () => {
    const doc = buildDay("יום ראשון", [
      classRow([
        "חשבון 9:00",
        "",               // ← column ב is empty
        "אנגלית 9:00",
        "מדעים 9:00",
        "גיאוגרפיה 9:00",
        "אמנות 9:00",
        "",
      ]),
    ]);

    const { lessons } = parseDocument(doc);
    const classLessons = lessons.filter((l) => !l.isSchoolWide);
    assert.equal(classLessons.length, 0, "empty column ב → row skipped");
  });
});

// ── 8. Duplicate title+time deduplication ──────────────────────
describe("duplicate deduplication", () => {
  test("same title+time appearing twice yields only one lesson", () => {
    const row = classRow([
      "חשבון 9:00",
      "עברית 9:00",
      "אנגלית 9:00",
      "מדעים 9:00",
      "גיאוגרפיה 9:00",
      "אמנות 9:00",
      "",
    ]);

    // Build doc with the same row twice (simulates a copy-paste in the source doc)
    const doc = buildDay("יום ראשון", [row, row]);

    const { lessons } = parseDocument(doc);
    const deduped = lessons.filter(
      (l) => l.title === "עברית" && l.startTime === "09:00"
    );
    assert.equal(deduped.length, 1, "duplicate title+time reduced to one entry");
  });
});

// ── 9. No day header → empty lessons ──────────────────────────
describe("no day header", () => {
  test("content without a recognized day header returns empty lessons array", () => {
    const doc = `Some random content without any day\n\tא\tב\tג\tד\tה\tו\t\n\tfoo\tbar\tbaz\t\t\t\t`;

    const { lessons } = parseDocument(doc);
    assert.equal(lessons.length, 0, "no lessons without day header");
  });
});

// ── 10. Enrichment detection via keyword ──────────────────────
describe("enrichment detection", () => {
  test("class-column cell with 'אופציונלי' keyword is flagged as enrichment", () => {
    const doc = buildDay("יום ראשון", [
      classRow([
        "חשבון 9:00",
        // Column ב: short enough to avoid length-based enrichment, but has keyword
        "זום קהילתי אופציונלי 9:00",
        "אנגלית 9:00",
        "מדעים 9:00",
        "גיאוגרפיה 9:00",
        "אמנות 9:00",
        "",
      ]),
    ]);

    const { lessons } = parseDocument(doc);
    const classLessons = lessons.filter((l) => !l.isSchoolWide);
    assert.equal(classLessons.length, 1, "one lesson extracted");
    assert.equal(classLessons[0].isEnrichment, true, "'אופציונלי' marks enrichment");
    assert.equal(classLessons[0].isSchoolWide, false, "still class-specific");
  });
});

// ── Bonus: addMinutes helper isolated behaviour ────────────────
describe("addMinutes helper (boundary behaviour)", () => {
  test("09:00 + 60 minutes = 10:00 (normal case)", async () => {
    const { addMinutes } = await import("../sync-lessons-parser.js");
    assert.equal(addMinutes("09:00", 60), "10:00");
  });

  test("23:30 + 60 minutes produces 24:30 (no midnight rollover — known limitation)", async () => {
    // The current implementation does not wrap past 23:59.
    // Lessons scheduled near midnight are not expected in this school context,
    // so this edge case is documented but not considered a blocking bug.
    const { addMinutes } = await import("../sync-lessons-parser.js");
    assert.equal(addMinutes("23:30", 60), "24:30", "current behaviour: no hour wrap");
  });

  test("08:45 + 45 minutes = 09:30 (fractional hour)", async () => {
    const { addMinutes } = await import("../sync-lessons-parser.js");
    assert.equal(addMinutes("08:45", 45), "09:30");
  });
});
