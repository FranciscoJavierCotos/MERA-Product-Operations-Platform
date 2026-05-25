/**
 * Unit tests: SLA display + countdown helpers
 *
 * Covers the four pure functions in lib/utils/sla.ts that drive the SLA
 * badges and countdown labels in the ticket list / detail views:
 *
 *   getTicketSlaInstance() — normalise the joined `sla_instance` shape
 *                            (Supabase may return an array, a single object,
 *                             null, or undefined depending on the join hint).
 *   computeSlaDisplayInfo() — derive { responseStatus, resolutionStatus,
 *                            response/resolutionMinutesRemaining, isPaused }
 *                            given an instance, the ticket's current status,
 *                            and an optional resolved_at.
 *   formatSlaCountdown()   — render a remaining/overdue label like "2h 15m left"
 *                            or "30m overdue".
 *   formatSlaMinutes()     — render a duration like "1d 4h 7m" with omitted
 *                            zero parts.
 *
 * All tests pass an explicit `now` so they remain deterministic.
 *
 * NB about "paused minutes": the SLA pause state is exposed via the boolean
 * `isPaused` (derived from `paused_at !== null`). The `total_paused_minutes`
 * field is NOT re-applied client-side — the BEFORE trigger in Postgres
 * (migration 022) already extends `response_due_at` / `resolution_due_at`
 * when a pause ends, so by the time the client sees the row, the due dates
 * already account for paused time. These tests therefore assert:
 *   1. `isPaused` reflects `paused_at !== null` exactly.
 *   2. Minutes-remaining is computed against the trigger-adjusted due dates
 *      (so a paused instance whose due date has been pushed into the future
 *      shows a positive remainder, not a breach).
 */
import { describe, it, expect } from "vitest";
import type { SlaInstance } from "@/types/sla.types";
import {
  computeElapsedMinutes,
  computeSlaDisplayInfo,
  formatSlaCountdown,
  formatSlaMinutes,
  getTicketSlaInstance,
} from "../sla";

const NOW = new Date("2026-05-25T12:00:00.000Z");

function makeInstance(overrides: Partial<SlaInstance> = {}): SlaInstance {
  return {
    id: "sla-1",
    ticket_id: "ticket-1",
    policy_id: "policy-1",
    response_due_at:    "2026-05-25T14:00:00.000Z", // 2h ahead
    resolution_due_at:  "2026-05-25T20:00:00.000Z", // 8h ahead
    responded_at: null,
    paused_at: null,
    total_paused_minutes: 0,
    created_at: "2026-05-25T10:00:00.000Z",
    updated_at: "2026-05-25T10:00:00.000Z",
    ...overrides,
  };
}

// ── getTicketSlaInstance() ───────────────────────────────────────────────────

describe("getTicketSlaInstance()", () => {
  it("returns null for null / undefined", () => {
    expect(getTicketSlaInstance(null)).toBeNull();
    expect(getTicketSlaInstance(undefined)).toBeNull();
  });

  it("returns the first element when given an array", () => {
    const a = makeInstance({ id: "a" });
    const b = makeInstance({ id: "b" });
    expect(getTicketSlaInstance([a, b])).toBe(a);
  });

  it("returns null for an empty array", () => {
    expect(getTicketSlaInstance([])).toBeNull();
  });

  it("returns the object as-is when given a single instance", () => {
    const inst = makeInstance();
    expect(getTicketSlaInstance(inst)).toBe(inst);
  });
});

// ── computeSlaDisplayInfo() — non-terminal ticket ─────────────────────────────

describe("computeSlaDisplayInfo() — open ticket", () => {
  it("on_track when resolution due is more than 60 minutes away", () => {
    const info = computeSlaDisplayInfo(makeInstance(), "new", null, NOW);
    expect(info.resolutionStatus).toBe("on_track");
    expect(info.resolutionMinutesRemaining).toBe(8 * 60); // 8h ahead
  });

  it("at_risk when resolution due is within 60 minutes", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        resolution_due_at: "2026-05-25T12:30:00.000Z", // 30 min ahead
      }),
      "new",
      null,
      NOW,
    );
    expect(info.resolutionStatus).toBe("at_risk");
    expect(info.resolutionMinutesRemaining).toBe(30);
  });

  it("at_risk at exactly the 60-minute threshold (inclusive)", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        resolution_due_at: "2026-05-25T13:00:00.000Z", // exactly 60 min
      }),
      "new",
      null,
      NOW,
    );
    expect(info.resolutionStatus).toBe("at_risk");
    expect(info.resolutionMinutesRemaining).toBe(60);
  });

  it("breached when resolution_due_at is in the past", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        resolution_due_at: "2026-05-25T11:00:00.000Z", // 1h ago
      }),
      "new",
      null,
      NOW,
    );
    expect(info.resolutionStatus).toBe("breached");
    expect(info.resolutionMinutesRemaining).toBe(-60);
  });

  // ── Response status ─────────────────────────────────────────────────────

  it("response = pending when responded_at is null and due is in the future", () => {
    const info = computeSlaDisplayInfo(makeInstance(), "new", null, NOW);
    expect(info.responseStatus).toBe("pending");
    expect(info.responseMinutesRemaining).toBe(120); // 2h ahead
  });

  it("response = breached when responded_at is null and due has passed", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({ response_due_at: "2026-05-25T11:00:00.000Z" }),
      "new",
      null,
      NOW,
    );
    expect(info.responseStatus).toBe("breached");
  });

  it("response = met when support responded before the deadline", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        response_due_at: "2026-05-25T14:00:00.000Z",
        responded_at:   "2026-05-25T13:30:00.000Z", // 30 min early
      }),
      "new",
      null,
      NOW,
    );
    expect(info.responseStatus).toBe("met");
  });

  it("response = met at exactly the deadline (inclusive)", () => {
    const due = "2026-05-25T14:00:00.000Z";
    const info = computeSlaDisplayInfo(
      makeInstance({ response_due_at: due, responded_at: due }),
      "new",
      null,
      NOW,
    );
    expect(info.responseStatus).toBe("met");
  });

  it("response = breached when responded_at is AFTER the deadline", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        response_due_at: "2026-05-25T14:00:00.000Z",
        responded_at:   "2026-05-25T15:00:00.000Z",
      }),
      "new",
      null,
      NOW,
    );
    expect(info.responseStatus).toBe("breached");
  });
});

// ── Paused instances ─────────────────────────────────────────────────────────

describe("computeSlaDisplayInfo() — paused", () => {
  it("isPaused reflects paused_at !== null exactly", () => {
    const notPaused = computeSlaDisplayInfo(makeInstance(), "new", null, NOW);
    expect(notPaused.isPaused).toBe(false);

    const paused = computeSlaDisplayInfo(
      makeInstance({ paused_at: "2026-05-25T11:30:00.000Z" }),
      "pending_customer",
      null,
      NOW,
    );
    expect(paused.isPaused).toBe(true);
  });

  it("when paused, the DB-extended due date is used as-is (no client-side re-pause math)", () => {
    // Trigger has already pushed resolution_due_at forward by total_paused_minutes;
    // the client must trust the value verbatim.
    const info = computeSlaDisplayInfo(
      makeInstance({
        resolution_due_at: "2026-05-25T18:00:00.000Z", // 6h ahead (trigger-adjusted)
        paused_at:        "2026-05-25T11:00:00.000Z",
        total_paused_minutes: 120,
      }),
      "pending_customer",
      null,
      NOW,
    );
    expect(info.resolutionMinutesRemaining).toBe(360); // exactly 6h, NOT 360+120
    expect(info.isPaused).toBe(true);
  });
});

// ── Terminal status (resolved / closed) ──────────────────────────────────────

describe("computeSlaDisplayInfo() — terminal status", () => {
  it("resolved BEFORE resolution_due_at → met", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({
        resolution_due_at: "2026-05-25T20:00:00.000Z",
      }),
      "resolved",
      "2026-05-25T18:00:00.000Z", // 2h before deadline
      NOW,
    );
    expect(info.resolutionStatus).toBe("met");
    expect(info.resolutionMinutesRemaining).toBe(120);
  });

  it("resolved AFTER resolution_due_at → breached", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({ resolution_due_at: "2026-05-25T10:00:00.000Z" }),
      "resolved",
      "2026-05-25T13:00:00.000Z", // 3h late
      NOW,
    );
    expect(info.resolutionStatus).toBe("breached");
    expect(info.resolutionMinutesRemaining).toBe(-180);
  });

  it("resolved at exactly the deadline → met (>= 0)", () => {
    const due = "2026-05-25T15:00:00.000Z";
    const info = computeSlaDisplayInfo(
      makeInstance({ resolution_due_at: due }),
      "closed",
      due,
      NOW,
    );
    expect(info.resolutionStatus).toBe("met");
    expect(info.resolutionMinutesRemaining).toBe(0);
  });

  it("terminal status without resolvedAt falls back to `now` as the reference time", () => {
    const info = computeSlaDisplayInfo(
      makeInstance({ resolution_due_at: "2026-05-25T20:00:00.000Z" }),
      "resolved",
      null,
      NOW,
    );
    expect(info.resolutionStatus).toBe("met"); // 8h remaining when computed at NOW
    expect(info.resolutionMinutesRemaining).toBe(480);
  });
});

// ── formatSlaCountdown() / formatSlaMinutes() ────────────────────────────────

describe("formatSlaMinutes()", () => {
  it("formats minutes only", () => {
    expect(formatSlaMinutes(7)).toBe("7m");
  });

  it("formats hours and minutes, skipping days when zero", () => {
    expect(formatSlaMinutes(135)).toBe("2h 15m");
  });

  it("formats days/hours/minutes", () => {
    // 1d 4h 7m = 1*1440 + 4*60 + 7 = 1687
    expect(formatSlaMinutes(1687)).toBe("1d 4h 7m");
  });

  it("omits hours when hours == 0 but days and minutes present", () => {
    // 1d 0h 7m = 1447
    expect(formatSlaMinutes(1447)).toBe("1d 7m");
  });

  it("returns '0m' for zero", () => {
    expect(formatSlaMinutes(0)).toBe("0m");
  });

  it("formats exact whole hour", () => {
    expect(formatSlaMinutes(60)).toBe("1h");
  });

  it("formats exact whole day", () => {
    expect(formatSlaMinutes(1440)).toBe("1d");
  });
});

describe("formatSlaCountdown()", () => {
  it("positive remaining → 'left'", () => {
    expect(formatSlaCountdown(75)).toBe("1h 15m left");
  });

  it("zero remaining → '0m left' (boundary)", () => {
    expect(formatSlaCountdown(0)).toBe("0m left");
  });

  it("negative remaining → 'overdue' label using absolute value", () => {
    expect(formatSlaCountdown(-30)).toBe("30m overdue");
  });

  it("large positive remaining renders days", () => {
    expect(formatSlaCountdown(2 * 1440 + 5 * 60 + 3)).toBe("2d 5h 3m left");
  });
});

// ── computeElapsedMinutes() ──────────────────────────────────────────────────

describe("computeElapsedMinutes()", () => {
  it("returns minutes between createdAt and now when endAt is null", () => {
    const elapsed = computeElapsedMinutes("2026-05-25T11:00:00.000Z", null, NOW);
    expect(elapsed).toBe(60);
  });

  it("returns minutes between createdAt and endAt when both supplied", () => {
    const elapsed = computeElapsedMinutes(
      "2026-05-25T10:00:00.000Z",
      "2026-05-25T11:30:00.000Z",
      NOW,
    );
    expect(elapsed).toBe(90);
  });

  it("clamps to 0 when endAt is BEFORE createdAt (no negative durations)", () => {
    const elapsed = computeElapsedMinutes(
      "2026-05-25T12:00:00.000Z",
      "2026-05-25T11:00:00.000Z", // 1h before
      NOW,
    );
    expect(elapsed).toBe(0);
  });

  it("rounds to the nearest minute", () => {
    // 75 s → 1.25 min → rounds to 1
    const elapsed = computeElapsedMinutes(
      "2026-05-25T12:00:00.000Z",
      "2026-05-25T12:01:15.000Z",
      NOW,
    );
    expect(elapsed).toBe(1);
  });
});
