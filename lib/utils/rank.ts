/**
 * Lexicographic fractional indexing for board ordering.
 *
 * Ranks are strings restricted to the alphabet 'a'..'z' (base 26).
 * `between(a, b)` returns a rank R such that a < R < b for any inputs
 * where `a < b` (string comparison). Either endpoint may be null,
 * meaning "no neighbor on that side".
 *
 * This is a small self-contained implementation modeled after
 * the `fractional-indexing` npm package. It is intentionally
 * inline (no extra dep) and avoids the integer-rebalancing pitfall
 * of float-based ordering schemes.
 */

const ALPHA_START = "a".charCodeAt(0); // 97
const ALPHA_END = "z".charCodeAt(0); // 122
const MID_CHAR = String.fromCharCode(
  Math.floor((ALPHA_START + ALPHA_END) / 2),
); // 'm' (109)

function isValid(rank: string): boolean {
  if (rank.length === 0) return false;
  for (let i = 0; i < rank.length; i++) {
    const c = rank.charCodeAt(i);
    if (c < ALPHA_START || c > ALPHA_END) return false;
  }
  // Cannot end with the smallest char ('a') — leaves no room to insert below.
  if (rank.charCodeAt(rank.length - 1) === ALPHA_START) return false;
  return true;
}

function midpoint(low: string, high: string | null): string {
  if (high == null) {
    // Append a char one step closer to the end.
    const last = low.charCodeAt(low.length - 1);
    const next = Math.min(ALPHA_END, last + 1);
    if (next === last) {
      // already 'z' — extend with 'm'
      return low + MID_CHAR;
    }
    return low.slice(0, -1) + String.fromCharCode(next);
  }

  // Find first differing index.
  let i = 0;
  while (i < Math.min(low.length, high.length) && low[i] === high[i]) i++;

  const lowChar = i < low.length ? low.charCodeAt(i) : ALPHA_START - 1;
  const highChar = i < high.length ? high.charCodeAt(i) : ALPHA_END + 1;

  if (highChar - lowChar > 1) {
    const mid = Math.floor((lowChar + highChar) / 2);
    return low.slice(0, i) + String.fromCharCode(mid);
  }

  // No room at this position — emit the low char and recurse on the suffixes.
  const prefix = low.slice(0, i + 1);
  const lowSuffix = low.slice(i + 1);
  return prefix + midpoint(lowSuffix || String.fromCharCode(ALPHA_START), null);
}

export function rankBetween(
  before: string | null | undefined,
  after: string | null | undefined,
): string {
  const a = before && isValid(before) ? before : null;
  const b = after && isValid(after) ? after : null;

  if (a == null && b == null) return MID_CHAR;
  if (a == null && b != null) {
    // Place before `b`: take a value smaller than b.
    // Walk down from the first char.
    const first = b.charCodeAt(0);
    if (first > ALPHA_START + 1) {
      return String.fromCharCode(Math.floor((ALPHA_START + first) / 2));
    }
    // Recursively insert before the suffix.
    return b[0] + rankBetween(null, b.slice(1) || null);
  }
  if (a != null && b == null) return midpoint(a, null);

  // Both non-null. Guard against degenerate input.
  if (a! >= b!) {
    // Caller provided invalid neighbors. Fall back to extending below `b`.
    return midpoint(a!, null);
  }
  return midpoint(a!, b!);
}

export const FIRST_RANK = MID_CHAR;
