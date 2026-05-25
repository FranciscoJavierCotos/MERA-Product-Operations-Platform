/**
 * Unit tests: sortTicketsForList()
 *
 * The function in lib/utils/ticketSort.ts implements the primary list ordering
 * rule used across the dashboard:
 *
 *   1. Sort by created_at DESC (newest first).
 *   2. If two tickets are created within the tie-tolerance window
 *      (default 2 seconds), fall back to ticket_number DESC.
 *      This handles seed data and burst-imports where many tickets share a
 *      sub-second timestamp.
 *   3. If ticket_number is also equal, fall back to the exact ms timestamp.
 *
 * These tests cover:
 *   - Newest-first ordering on widely-spaced timestamps
 *   - Tiebreak by ticket_number when timestamps are within 2 s of each other
 *   - Tolerance behavior at the threshold (exactly 2 s, just over)
 *   - Pure function: no mutation of the input array
 *   - Edge cases: empty list, single element, invalid date strings
 */
import { describe, it, expect } from "vitest";
import {
  sortTicketsForList,
  DEFAULT_CREATED_AT_TIE_TOLERANCE_MS,
} from "../ticketSort";

type T = { created_at: string; ticket_number: number };

describe("sortTicketsForList()", () => {
  // ── Primary ordering: newest first ───────────────────────────────────────

  it("sorts widely-spaced timestamps DESC by created_at", () => {
    const tickets: T[] = [
      { created_at: "2026-01-01T00:00:00.000Z", ticket_number: 1 },
      { created_at: "2026-03-01T00:00:00.000Z", ticket_number: 2 },
      { created_at: "2026-02-01T00:00:00.000Z", ticket_number: 3 },
    ];
    const sorted = sortTicketsForList(tickets);
    expect(sorted.map((t) => t.ticket_number)).toEqual([2, 3, 1]);
  });

  it("places identical-timestamp tickets next to each other", () => {
    const ts = "2026-05-01T12:00:00.000Z";
    const tickets: T[] = [
      { created_at: ts,                          ticket_number: 100 },
      { created_at: "2026-04-01T00:00:00.000Z",  ticket_number: 50  },
      { created_at: ts,                          ticket_number: 200 },
    ];
    const sorted = sortTicketsForList(tickets);
    // The two same-timestamp tickets come first (newer), older one last
    expect(sorted[2]!.ticket_number).toBe(50);
    // Their relative order is determined by ticket_number DESC (200 > 100)
    expect(sorted[0]!.ticket_number).toBe(200);
    expect(sorted[1]!.ticket_number).toBe(100);
  });

  // ── Tiebreak by ticket_number within the tolerance window ─────────────────

  it("falls back to ticket_number DESC when timestamps are within tolerance", () => {
    // 1 second apart — within the 2-second default tolerance
    const tickets: T[] = [
      { created_at: "2026-05-01T12:00:00.000Z", ticket_number: 1 },
      { created_at: "2026-05-01T12:00:01.000Z", ticket_number: 2 },
    ];
    const sorted = sortTicketsForList(tickets);
    // Tolerance kicks in → ticket_number DESC wins
    expect(sorted.map((t) => t.ticket_number)).toEqual([2, 1]);
  });

  it("does NOT collapse timestamps beyond the tolerance window", () => {
    // 3 seconds apart — outside the default 2 s tolerance → date wins
    const tickets: T[] = [
      { created_at: "2026-05-01T12:00:00.000Z", ticket_number: 9999 }, // older but higher #
      { created_at: "2026-05-01T12:00:03.000Z", ticket_number: 1    },  // newer, lower #
    ];
    const sorted = sortTicketsForList(tickets);
    expect(sorted[0]!.ticket_number).toBe(1);
    expect(sorted[1]!.ticket_number).toBe(9999);
  });

  it("uses a custom tolerance when supplied", () => {
    // 30 s apart — outside default but inside a 60_000 ms override
    const tickets: T[] = [
      { created_at: "2026-05-01T12:00:00.000Z", ticket_number: 99 },
      { created_at: "2026-05-01T12:00:30.000Z", ticket_number: 5  },
    ];

    // Default tolerance → date wins, ticket #5 first (newer)
    expect(
      sortTicketsForList(tickets).map((t) => t.ticket_number),
    ).toEqual([5, 99]);

    // Custom 60 s tolerance → ticket_number DESC wins, #99 first
    expect(
      sortTicketsForList(tickets, { createdAtTieToleranceMs: 60_000 }).map(
        (t) => t.ticket_number,
      ),
    ).toEqual([99, 5]);
  });

  it("treats the tolerance as exclusive: difference exactly at threshold still tiebreaks", () => {
    // The implementation uses `Math.abs(diffMs) > tolerance` → at exactly the
    // threshold the tiebreak still applies (NOT strictly greater).
    const tickets: T[] = [
      {
        created_at: "2026-05-01T12:00:00.000Z",
        ticket_number: 1,
      },
      {
        // exactly DEFAULT_CREATED_AT_TIE_TOLERANCE_MS later
        created_at: new Date(
          Date.parse("2026-05-01T12:00:00.000Z") +
            DEFAULT_CREATED_AT_TIE_TOLERANCE_MS,
        ).toISOString(),
        ticket_number: 2,
      },
    ];
    // Within tolerance → ticket_number DESC wins
    const sorted = sortTicketsForList(tickets);
    expect(sorted.map((t) => t.ticket_number)).toEqual([2, 1]);
  });

  // ── Purity / safety ───────────────────────────────────────────────────────

  it("does not mutate the input array", () => {
    const original: T[] = [
      { created_at: "2026-01-01T00:00:00.000Z", ticket_number: 1 },
      { created_at: "2026-02-01T00:00:00.000Z", ticket_number: 2 },
    ];
    const snapshot = [...original];
    sortTicketsForList(original);
    expect(original).toEqual(snapshot);
  });

  it("returns a new array reference (never the original)", () => {
    const tickets: T[] = [
      { created_at: "2026-01-01T00:00:00.000Z", ticket_number: 1 },
    ];
    expect(sortTicketsForList(tickets)).not.toBe(tickets);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("handles an empty array", () => {
    expect(sortTicketsForList([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    const t: T[] = [{ created_at: "2026-01-01T00:00:00.000Z", ticket_number: 7 }];
    expect(sortTicketsForList(t)).toEqual(t);
  });

  it("invalid date strings sort as epoch 0 (toMs returns 0 on NaN)", () => {
    // Both "invalid" tickets parse to 0 ms → tiebreak by ticket_number DESC
    const tickets: T[] = [
      { created_at: "not-a-date",                ticket_number: 5  },
      { created_at: "2026-01-01T00:00:00.000Z",  ticket_number: 99 },
      { created_at: "also-not-a-date",           ticket_number: 10 },
    ];
    const sorted = sortTicketsForList(tickets);
    // The real-date ticket is newest → first
    expect(sorted[0]!.ticket_number).toBe(99);
    // Two zero-ms tickets break by ticket_number DESC (10 > 5)
    expect(sorted[1]!.ticket_number).toBe(10);
    expect(sorted[2]!.ticket_number).toBe(5);
  });

  it("preserves stable order when both date AND ticket_number are equal", () => {
    const ts = "2026-05-01T12:00:00.000Z";
    const tickets: T[] = [
      { created_at: ts, ticket_number: 1 },
      { created_at: ts, ticket_number: 1 },
    ];
    const sorted = sortTicketsForList(tickets);
    // No discriminating field → comparator returns 0 → no reorder
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.ticket_number).toBe(1);
    expect(sorted[1]!.ticket_number).toBe(1);
  });
});
