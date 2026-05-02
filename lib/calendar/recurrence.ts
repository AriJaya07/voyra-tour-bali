/**
 * Minimal RFC5545 RRULE subset.
 * Supported: FREQ=DAILY|WEEKLY|MONTHLY, INTERVAL, COUNT, UNTIL, BYDAY (weekly only).
 *
 * Stored format (single line, no `RRULE:` prefix):
 *   FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260801
 */

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
const VALID_FREQ: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY"];
const VALID_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export interface ParsedRule {
  freq: Frequency;
  interval: number;
  count: number | null;
  until: Date | null;
  byDay: number[]; // 0=Sun..6=Sat
}

export function parseRRule(rule: string | null | undefined): ParsedRule | null {
  if (!rule || typeof rule !== "string") return null;
  const parts = rule.split(";").map((p) => p.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) map[k.toUpperCase()] = v.toUpperCase();
  }
  const freq = map.FREQ as Frequency | undefined;
  if (!freq || !VALID_FREQ.includes(freq)) return null;
  const interval = Math.max(1, parseInt(map.INTERVAL || "1") || 1);
  const count =
    map.COUNT && /^\d+$/.test(map.COUNT) ? Math.min(parseInt(map.COUNT), 366) : null;
  const until = map.UNTIL ? parseUntil(map.UNTIL) : null;
  const byDay = (map.BYDAY || "")
    .split(",")
    .filter((d) => VALID_DAYS.includes(d))
    .map((d) => VALID_DAYS.indexOf(d));
  return { freq, interval, count, until, byDay };
}

function parseUntil(raw: string): Date | null {
  // Accept YYYYMMDD or YYYY-MM-DD or full ISO.
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return new Date(Date.UTC(+compact[1], +compact[2] - 1, +compact[3]));
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildRRule(input: {
  freq: Frequency;
  interval?: number;
  byDay?: number[];
  until?: Date | string | null;
  count?: number | null;
}): string {
  const parts = [`FREQ=${input.freq}`];
  if (input.interval && input.interval > 1) parts.push(`INTERVAL=${input.interval}`);
  if (input.byDay && input.byDay.length > 0 && input.freq === "WEEKLY") {
    parts.push(`BYDAY=${input.byDay.map((d) => VALID_DAYS[d]).join(",")}`);
  }
  if (input.until) {
    const d = input.until instanceof Date ? input.until : parseUntil(input.until);
    if (d) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      parts.push(`UNTIL=${y}${m}${day}`);
    }
  }
  if (input.count && input.count > 0) parts.push(`COUNT=${input.count}`);
  return parts.join(";");
}

const MS_DAY = 86400000;

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Expand a recurring event into occurrence dates within [rangeStart, rangeEnd].
 * Returns ISO YYYY-MM-DD keys.
 */
export function expandOccurrences(
  base: Date,
  rule: ParsedRule | null,
  rangeStart: Date,
  rangeEnd: Date,
  hardCap = 366
): string[] {
  const result: string[] = [];
  const baseDay = startOfDayUTC(base);
  const startDay = startOfDayUTC(rangeStart);
  const endDay = startOfDayUTC(rangeEnd);

  const pushIfInRange = (d: Date) => {
    if (d < startDay || d > endDay) return;
    if (rule?.until) {
      const untilDay = startOfDayUTC(rule.until);
      if (d > untilDay) return;
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    result.push(`${y}-${m}-${dd}`);
  };

  if (!rule) {
    pushIfInRange(baseDay);
    return result;
  }

  const interval = Math.max(1, rule.interval);
  let occurrences = 0;
  const limit = rule.count ?? hardCap;

  if (rule.freq === "DAILY") {
    let cursor = new Date(baseDay);
    while (cursor <= endDay && occurrences < limit) {
      if (rule.until && cursor > startOfDayUTC(rule.until)) break;
      pushIfInRange(cursor);
      occurrences++;
      cursor = new Date(cursor.getTime() + interval * MS_DAY);
    }
  } else if (rule.freq === "WEEKLY") {
    const days = rule.byDay.length > 0 ? rule.byDay : [baseDay.getUTCDay()];
    // weekStart = the Sunday of the base week
    const weekStart = new Date(baseDay);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    let weekCursor = new Date(weekStart);
    while (occurrences < limit) {
      for (const d of days) {
        const occ = new Date(weekCursor);
        occ.setUTCDate(occ.getUTCDate() + d);
        if (occ < baseDay) continue;
        if (occ > endDay) {
          weekCursor = new Date(weekCursor.getTime() + interval * 7 * MS_DAY);
          if (weekCursor > endDay) return result;
          continue;
        }
        if (rule.until && occ > startOfDayUTC(rule.until)) return result;
        pushIfInRange(occ);
        occurrences++;
        if (occurrences >= limit) return result;
      }
      weekCursor = new Date(weekCursor.getTime() + interval * 7 * MS_DAY);
      if (weekCursor > endDay) break;
    }
  } else if (rule.freq === "MONTHLY") {
    let cursor = new Date(baseDay);
    while (cursor <= endDay && occurrences < limit) {
      if (rule.until && cursor > startOfDayUTC(rule.until)) break;
      pushIfInRange(cursor);
      occurrences++;
      cursor = new Date(
        Date.UTC(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + interval,
          cursor.getUTCDate()
        )
      );
    }
  }

  return result;
}

/** Compute next occurrence on/after `from` for reminder scheduling. */
export function nextOccurrenceAfter(
  base: Date,
  rule: ParsedRule | null,
  from: Date
): string | null {
  // Look up to ~2 years ahead in chunks.
  const horizon = new Date(from.getTime() + 366 * MS_DAY * 2);
  const occs = expandOccurrences(base, rule, from, horizon, 1);
  return occs[0] || null;
}
