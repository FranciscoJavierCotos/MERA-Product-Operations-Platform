/**
 * Unit tests for the lexicographic fractional-indexing algorithm in rank.ts.
 *
 * Core invariant under test: for any valid ranks a < b,
 *   a < rankBetween(a, b) < b  (string comparison)
 *
 * Edge cases tested:
 *   - Empty list (both null)        → returns FIRST_RANK ("m")
 *   - Insert before first item      → result < existing first
 *   - Insert after last item        → result > existing last
 *   - Insert between adjacent items → strict ordering maintained
 *   - Deep recursive nesting        → algorithm doesn't corrupt ordering
 *   - Invalid / null inputs         → treated as absent (null)
 *   - Degenerate input (a >= b)     → does not throw; returns usable rank
 */
import { describe, it, expect } from "vitest";
import { rankBetween, FIRST_RANK } from "../rank.js";

// Helper: verify strict ordering
function assertOrdering(low: string, mid: string, high: string) {
  expect(mid > low, `expected "${mid}" > "${low}"`).toBe(true);
  expect(mid < high, `expected "${mid}" < "${high}"`).toBe(true);
}

describe("rankBetween — empty / first item", () => {
  it("returns FIRST_RANK ('m') when both neighbors are null", () => {
    expect(rankBetween(null, null)).toBe(FIRST_RANK);
    expect(rankBetween(undefined, undefined)).toBe(FIRST_RANK);
    expect(FIRST_RANK).toBe("m");
  });
});

describe("rankBetween — insert before first", () => {
  it("returns a rank strictly less than the existing first item", () => {
    const first = "m";
    const before = rankBetween(null, first);
    expect(before < first).toBe(true);
  });

  it("handles 'b' as first item — result is still a valid smaller rank", () => {
    const before = rankBetween(null, "b");
    expect(before < "b").toBe(true);
    expect(before.length).toBeGreaterThan(0);
  });

  it("handles 'ab' as first item", () => {
    const before = rankBetween(null, "ab");
    expect(before < "ab").toBe(true);
  });
});

describe("rankBetween — insert after last", () => {
  it("returns a rank strictly greater than the existing last item", () => {
    const last = "m";
    const after = rankBetween(last, null);
    expect(after > last).toBe(true);
  });

  it("handles 'z' last char — appends rather than overflowing", () => {
    const after = rankBetween("z", null);
    expect(after > "z").toBe(true);
    expect(after.startsWith("z")).toBe(true);
  });

  it("handles a multi-char rank as last", () => {
    const last = "mn";
    const after = rankBetween(last, null);
    expect(after > last).toBe(true);
  });
});

describe("rankBetween — insert between two items", () => {
  it("finds midpoint between 'a' and 'z'", () => {
    const mid = rankBetween("b", "z"); // 'b' is smallest valid (not 'a' which is invalid)
    assertOrdering("b", mid, "z");
  });

  it("finds midpoint between adjacent alphabet chars", () => {
    const mid = rankBetween("m", "n");
    assertOrdering("m", mid, "n");
  });

  it("finds midpoint between multi-char ranks", () => {
    const mid = rankBetween("mb", "mz");
    assertOrdering("mb", mid, "mz");
  });

  it("produces correct midpoint between 'mb' and 'mc'", () => {
    const mid = rankBetween("mb", "mc");
    assertOrdering("mb", mid, "mc");
  });

  it("handles ranks of different lengths", () => {
    const mid = rankBetween("m", "mb");
    assertOrdering("m", mid, "mb");
  });
});

describe("rankBetween — deep nesting (many insertions at same position)", () => {
  it("maintains ordering through 10 successive insertions between same two ranks", () => {
    const ranks: string[] = ["m", "z"];

    // Insert 10 items between index 0 and 1
    for (let i = 0; i < 10; i++) {
      const newRank = rankBetween(ranks[0], ranks[1]);
      assertOrdering(ranks[0], newRank, ranks[1]);
      ranks.splice(1, 0, newRank);
    }

    // Verify the full array is sorted
    for (let i = 0; i < ranks.length - 1; i++) {
      expect(ranks[i] < ranks[i + 1]).toBe(true);
    }
  });

  it("maintains ordering through repeated insertions at the end", () => {
    let last = "m";
    for (let i = 0; i < 10; i++) {
      const next = rankBetween(last, null);
      expect(next > last).toBe(true);
      last = next;
    }
  });

  it("maintains ordering through repeated insertions at the beginning", () => {
    let first = "m";
    for (let i = 0; i < 10; i++) {
      const prev = rankBetween(null, first);
      expect(prev < first).toBe(true);
      first = prev;
    }
  });
});

describe("rankBetween — invalid / null inputs are treated as absent", () => {
  it("empty string for `before` is treated as null (insert at start relative to `after`)", () => {
    const result = rankBetween("", "m");
    // empty string is invalid, so treated as null → insert before "m"
    expect(result < "m").toBe(true);
  });

  it("empty string for `after` is treated as null (insert after `before`)", () => {
    const result = rankBetween("m", "");
    expect(result > "m").toBe(true);
  });

  it("rank ending in 'a' for `before` is treated as null (not valid per isValid)", () => {
    // 'a' is the minimum char and a rank ending with it is invalid
    const result = rankBetween("ma", "z");
    // should still produce a rank < "z"
    expect(result < "z").toBe(true);
  });
});

describe("rankBetween — degenerate input (a >= b)", () => {
  it("does not throw when a === b; returns a usable rank", () => {
    expect(() => rankBetween("m", "m")).not.toThrow();
    const result = rankBetween("m", "m");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not throw when a > b; returns a usable rank", () => {
    expect(() => rankBetween("z", "m")).not.toThrow();
    const result = rankBetween("z", "m");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("FIRST_RANK constant", () => {
  it("is the midpoint of the alphabet range (m)", () => {
    expect(FIRST_RANK).toBe("m");
  });

  it("satisfies: rankBetween(null, null) === FIRST_RANK", () => {
    expect(rankBetween(null, null)).toBe(FIRST_RANK);
  });
});
