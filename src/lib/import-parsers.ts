export interface ImportChild {
  name: string;
  group: string;
  grade?: string;
}

/** Simple list: one name per line, all assigned to a single group */
export function parseSimpleList(text: string, groupName: string): ImportChild[] {
  return text
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((name) => ({ name, group: groupName }));
}

/** Grouped format: lines ending with ":" are group headers, names below go to that group */
export function parseGrouped(text: string): ImportChild[] {
  const results: ImportChild[] = [];
  let currentGroup = "ללא קבוצה"; // default for names before first header

  for (const raw of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.endsWith(":")) {
      currentGroup = line.slice(0, -1).trim();
    } else {
      results.push({ name: line, group: currentGroup });
    }
  }

  return results;
}

/** Parse a CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/** CSV format: columns for name, group, grade (optional) */
export function parseCsv(text: string): ImportChild[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return []; // need header + at least one row

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h === "name" || h === "שם");
  const groupIdx = header.findIndex((h) => h === "group" || h === "קבוצה");
  const gradeIdx = header.findIndex((h) => h === "grade" || h === "כיתה");

  if (nameIdx === -1 || groupIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      name: cols[nameIdx] || "",
      group: cols[groupIdx] || "",
      grade: gradeIdx !== -1 ? cols[gradeIdx] : undefined,
    };
  }).filter((c) => c.name && c.group);
}

export type ImportFormat = "simple" | "grouped" | "csv";

export function parseImport(
  text: string,
  format: ImportFormat,
  defaultGroup?: string
): ImportChild[] {
  switch (format) {
    case "simple":
      return parseSimpleList(text, defaultGroup || "ברירת מחדל");
    case "grouped":
      return parseGrouped(text);
    case "csv":
      return parseCsv(text);
  }
}
