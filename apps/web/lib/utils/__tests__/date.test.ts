/**
 * Unit tests: date formatting utilities (lib/utils/date.ts)
 *
 * Four exports:
 *   formatDate(date, formatStr?)   → "May 25th, 2026" (default "PPP" via date-fns)
 *   formatDateTime(date)           → "May 25th, 2026 at 12:00 PM" ("PPp")
 *   formatRelativeTime(date)       → "1 hour ago"  ("about " prefix stripped)
 *   formatTimeWorked(minutes)      → "1d 4h 7m"    or "-" for zero
 *
 * Timezone notes:
 *   - All formatting calls flow through date-fns, which uses the runtime's
 *     local timezone. To keep tests deterministic across machines, we:
 *       a) Test `formatTimeWorked` exhaustively — it's pure integer math
 *          and TZ-independent.
 *       b) Use vi.useFakeTimers to pin "now" for relative-time tests.
 *       c) Use input/output round-trip checks and structural assertions
 *          (string contains the year, contains AM/PM) rather than asserting
 *          an exact string that would change with the host TZ.
 *       d) Verify both string and Date inputs produce the same output —
 *          this catches a class of parseISO regressions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTimeWorked,
} from "../date";

// ─────────────────────────────────────────────────────────────────────────────
// formatTimeWorked — TZ-independent
// ─────────────────────────────────────────────────────────────────────────────

describe("formatTimeWorked()", () => {
  it("returns '-' for zero (display sentinel for empty)", () => {
    expect(formatTimeWorked(0)).toBe("-");
  });

  it("formats minutes only", () => {
    expect(formatTimeWorked(7)).toBe("7m");
    expect(formatTimeWorked(59)).toBe("59m");
  });

  it("formats exact whole hour", () => {
    expect(formatTimeWorked(60)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatTimeWorked(75)).toBe("1h 15m");
    expect(formatTimeWorked(135)).toBe("2h 15m");
  });

  it("formats exact whole day", () => {
    expect(formatTimeWorked(24 * 60)).toBe("1d");
  });

  it("formats days, hours, and minutes together", () => {
    // 1d 4h 7m = 1*1440 + 4*60 + 7 = 1687
    expect(formatTimeWorked(1687)).toBe("1d 4h 7m");
  });

  it("omits zero hours when days and minutes are present", () => {
    // 1d 0h 7m = 1447
    expect(formatTimeWorked(1447)).toBe("1d 7m");
  });

  it("omits zero minutes when days and hours are present", () => {
    // 1d 4h 0m = 1440 + 240 = 1680
    expect(formatTimeWorked(1680)).toBe("1d 4h");
  });

  it("handles multi-day durations", () => {
    // 5d 0h 30m = 5*1440 + 30 = 7230
    expect(formatTimeWorked(7230)).toBe("5d 30m");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDate — structural assertions to survive TZ shifts
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDate()", () => {
  it("accepts an ISO string and returns a non-empty formatted string", () => {
    // Midday UTC — never crosses a calendar boundary regardless of host TZ
    // for any UTC±12 zone
    const out = formatDate("2026-05-25T12:00:00.000Z");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/2026/);
  });

  it("accepts a Date object and produces equivalent output to its ISO string", () => {
    const iso = "2026-05-25T12:00:00.000Z";
    const d = new Date(iso);
    expect(formatDate(d)).toBe(formatDate(iso));
  });

  it("default format includes month name and year", () => {
    const out = formatDate("2026-05-25T12:00:00.000Z");
    // "PPP" pattern → e.g. "May 25th, 2026"
    expect(out).toMatch(/2026/);
    // Some month-name substring present (one of three letters)
    expect(out).toMatch(/[A-Za-z]{3,}/);
  });

  it("respects a custom format string", () => {
    expect(formatDate("2026-05-25T12:00:00.000Z", "yyyy-MM-dd")).toBe(
      // The date-fns format yyyy-MM-dd renders in LOCAL TZ. For a midday-UTC
      // ISO input, the local calendar date is 2026-05-25 in all UTC±11
      // timezones — we therefore test with a guard.
      formatDateInLocalTz("2026-05-25T12:00:00.000Z"),
    );
  });

  it("renders a calendar-stable date for high-noon UTC input", () => {
    // Midday UTC stays on May 25 in every timezone from UTC-11 through UTC+11
    const out = formatDate("2026-05-25T12:00:00.000Z");
    // "PPP" renders the day with an ordinal suffix (25th); match the digits
    // alone, then guard against accidental 250-/125-ish substrings.
    expect(out).toMatch(/25(st|nd|rd|th)?\b/);
  });

  it("is idempotent: same input → same output across calls", () => {
    const iso = "2026-05-25T12:00:00.000Z";
    expect(formatDate(iso)).toBe(formatDate(iso));
  });
});

/** Compute the expected yyyy-MM-dd output in the host's local TZ. */
function formatDateInLocalTz(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDateTime — includes time component
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDateTime()", () => {
  it("includes the year and an AM/PM marker", () => {
    const out = formatDateTime("2026-05-25T12:00:00.000Z");
    expect(out).toMatch(/2026/);
    // "PPp" pattern always includes AM or PM
    expect(out).toMatch(/AM|PM/);
  });

  it("string and Date inputs produce identical output", () => {
    const iso = "2026-05-25T12:00:00.000Z";
    expect(formatDateTime(iso)).toBe(formatDateTime(new Date(iso)));
  });

  it("output differs from formatDate (time component adds characters)", () => {
    const iso = "2026-05-25T12:00:00.000Z";
    expect(formatDateTime(iso).length).toBeGreaterThan(formatDate(iso).length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRelativeTime — uses fake timers for determinism
// ─────────────────────────────────────────────────────────────────────────────

describe("formatRelativeTime()", () => {
  const ANCHOR = new Date("2026-05-25T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'X minutes ago' for recent past", () => {
    const fiveMinutesAgo = new Date(ANCHOR.getTime() - 5 * 60 * 1000).toISOString();
    const out = formatRelativeTime(fiveMinutesAgo);
    expect(out).toMatch(/ago/);
    expect(out).toMatch(/minute/);
  });

  it("renders 'in X' for future timestamps (addSuffix: true)", () => {
    const inOneHour = new Date(ANCHOR.getTime() + 60 * 60 * 1000).toISOString();
    const out = formatRelativeTime(inOneHour);
    expect(out).toMatch(/in /);
  });

  it("strips the 'about ' prefix that date-fns inserts for hour-scale values", () => {
    // Just under an hour → date-fns says "about 1 hour ago"; we strip "about "
    const fiftyMinAgo = new Date(ANCHOR.getTime() - 50 * 60 * 1000).toISOString();
    const out = formatRelativeTime(fiftyMinAgo);
    expect(out.startsWith("about ")).toBe(false);
    expect(out).toMatch(/hour/);
  });

  it("accepts a Date object input equivalently to a string", () => {
    const tenMinAgo = new Date(ANCHOR.getTime() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinAgo)).toBe(
      formatRelativeTime(tenMinAgo.toISOString()),
    );
  });

  it("renders 'less than a minute ago' for sub-minute differences", () => {
    const tenSecAgo = new Date(ANCHOR.getTime() - 10 * 1000).toISOString();
    const out = formatRelativeTime(tenSecAgo);
    expect(out).toMatch(/less than|seconds/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Timezone-edge resilience
// ─────────────────────────────────────────────────────────────────────────────

describe("date utilities — timezone edge cases", () => {
  it("handles midnight UTC inputs without throwing (date-only ISO)", () => {
    // A pure date string parses to midnight UTC; local TZ may render the
    // previous calendar day in negative-offset zones. The function must still
    // return a non-empty string for both inputs.
    expect(() => formatDate("2026-05-25")).not.toThrow();
    expect(formatDate("2026-05-25").length).toBeGreaterThan(0);
  });

  it("handles a date right before midnight UTC", () => {
    expect(() => formatDate("2026-05-25T23:59:59.999Z")).not.toThrow();
    expect(formatDate("2026-05-25T23:59:59.999Z")).toMatch(/2026/);
  });

  it("handles a date right after midnight UTC", () => {
    expect(() => formatDate("2026-05-25T00:00:00.000Z")).not.toThrow();
    expect(formatDate("2026-05-25T00:00:00.000Z")).toMatch(/2026/);
  });

  it("handles offsetted ISO timestamps (e.g. +09:00) consistently", () => {
    // Same wall-clock as 2026-05-25T03:00:00Z — should render with year 2026
    // regardless of host TZ
    expect(formatDate("2026-05-25T12:00:00+09:00")).toMatch(/2026/);
  });

  it("handles end-of-year boundary without skipping a year", () => {
    const out = formatDate("2026-12-31T12:00:00.000Z");
    expect(out).toMatch(/2026/);
  });

  it("handles February 29 in a leap year", () => {
    expect(() => formatDate("2024-02-29T12:00:00.000Z")).not.toThrow();
    expect(formatDate("2024-02-29T12:00:00.000Z")).toMatch(/2024/);
  });
});
