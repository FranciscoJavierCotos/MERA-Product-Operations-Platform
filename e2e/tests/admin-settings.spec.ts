/**
 * E2E: Admin settings — Priority CRUD
 *
 * Verifies the full admin life-cycle for a ticket priority:
 *
 *   1. Admin navigates to /settings → "Ticket Configuration" tab
 *   2. Creates a new priority via the UI form (name, label, display_order)
 *   3. Priority appears in the priorities table
 *   4. Priority appears as an option in the new-ticket form dropdown
 *   5. Admin deletes the priority via the row action menu
 *   6. Priority is gone from the settings table
 *
 * Cleanup: if a browser delete fails, afterAll calls the API directly.
 *
 * Prerequisites:
 *   • `supabase start` with seed data
 *   • `pnpm dev` (web :3000, api :8080)
 *   • Auth setup has run (auth.setup.ts wrote admin.json)
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { authHeaders, API_URL } from "../helpers/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_AUTH = path.resolve(__dirname, "../.auth/admin.json");

// ── Unique test data ──────────────────────────────────────────────────────────
const PRIORITY_NAME = `e2e_priority_${Date.now()}`;
const PRIORITY_LABEL = `E2E Priority ${Date.now()}`;
const PRIORITY_ORDER = 98;

let createdPriorityId: number | null = null;

test.describe("Admin settings — Priority CRUD", () => {
  test.use({ storageState: ADMIN_AUTH });

  test.afterAll(async ({ request }) => {
    // Belt-and-suspenders: if the UI delete test didn't run / failed, clean up via API.
    if (createdPriorityId !== null) {
      const hdrs = await authHeaders(request, "admin");
      await request.delete(`${API_URL}/lookup/priorities/${createdPriorityId}`, {
        headers: hdrs,
      });
    }
  });

  // ── 1. Navigate to settings and open Ticket Configuration tab ─────────────

  test("admin can reach the settings page", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/settings", { timeout: 15_000 });

    // The page should render some settings heading
    await expect(
      page.getByRole("heading", { name: /settings/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Create a new priority ───────────────────────────────────────────────

  test("admin can create a new ticket priority", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/settings");

    // Find and click the "Ticket Configuration" tab
    const configTab = page
      .getByRole("tab", { name: /ticket config|ticket configuration/i })
      .or(page.getByText(/ticket config/i).first());

    if (await configTab.isVisible()) {
      await configTab.click();
    }

    // Find the Priorities section — look for an "Add" or "+" button near "Priorities"
    // The LookupTableManager renders a "Add {title}" button
    const addButton = page
      .getByRole("button", { name: /add priority|new priority|\+ priority/i })
      .or(page.locator("button").filter({ hasText: /add/i }).near(page.getByText(/priorities/i)));

    // Click the first visible "Add" button in the priorities section
    const prioritiesHeading = page.getByText(/priorities/i).first();
    if (await prioritiesHeading.isVisible()) {
      // Find the nearest Add button to the "Priorities" heading
      const addBtn = page
        .getByRole("button", { name: /add/i })
        .filter({ has: page.locator("text=/priority/i") })
        .first()
        .or(addButton.first());
      await addBtn.click();
    } else {
      // Fallback: click the first visible Add button
      await addButton.first().click();
    }

    // A dialog/form should appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 }).catch(async () => {
      // The form might be inline rather than a dialog
    });

    // Fill the form fields
    const nameInput = page.getByLabel(/name/i).last();
    await nameInput.fill(PRIORITY_NAME);

    const labelInput = page.getByLabel(/label/i).last();
    await labelInput.fill(PRIORITY_LABEL);

    // Display order (optional — may have a default)
    const orderInput = page.getByLabel(/display order|order/i).last();
    if (await orderInput.isVisible()) {
      await orderInput.clear();
      await orderInput.fill(String(PRIORITY_ORDER));
    }

    // Submit
    await page
      .getByRole("button", { name: /save|create|add|submit/i })
      .last()
      .click();

    // Wait for the dialog to close / form to reset
    await page
      .waitForSelector('[role="dialog"]', { state: "hidden", timeout: 5_000 })
      .catch(() => {});

    // The priority label should now appear in the priorities table
    await expect(page.getByText(PRIORITY_LABEL)).toBeVisible({ timeout: 10_000 });
  });

  // ── 3. Capture the created priority ID for cleanup ────────────────────────

  test("created priority exists in the API", async ({ request }) => {
    const hdrs = await authHeaders(request, "admin");
    const res = await request.get(`${API_URL}/lookup/priorities`, { headers: hdrs });
    expect(res.ok()).toBe(true);

    const priorities: { id: number; name: string; label: string }[] = await res.json();
    const created = priorities.find((p) => p.name === PRIORITY_NAME);
    expect(created, `Priority "${PRIORITY_NAME}" not found in API`).toBeDefined();

    // Store for cleanup
    if (created) createdPriorityId = created.id;
  });

  // ── 4. Verify priority appears in the new-ticket form dropdown ─────────────

  test("new-ticket form shows the created priority", async ({ page }) => {
    if (createdPriorityId === null) test.skip();

    await page.goto("/tickets/new");
    await page.waitForURL("**/tickets/new", { timeout: 15_000 });

    // Find the priority selector — it's a shadcn Select component.
    // The trigger button usually shows "Select priority…" or similar placeholder.
    const priorityTrigger = page
      .getByRole("combobox")
      .filter({ hasText: /priority/i })
      .or(page.locator('[placeholder*="priority" i]'))
      .first();

    // Open the priority dropdown
    if (await priorityTrigger.isVisible()) {
      await priorityTrigger.click();
    } else {
      // Try the SelectTrigger which may not have combobox role
      await page
        .locator("button")
        .filter({ hasText: /select priority/i })
        .first()
        .click();
    }

    // The created priority label should appear as an option
    await expect(
      page.getByRole("option", { name: PRIORITY_LABEL }),
    ).toBeVisible({ timeout: 5_000 }).catch(async () => {
      // Some Select implementations render options without the "option" role
      await expect(page.getByText(PRIORITY_LABEL)).toBeVisible({ timeout: 5_000 });
    });

    // Close the dropdown (press Escape or click away)
    await page.keyboard.press("Escape");
  });

  // ── 5. Delete the priority via the UI ─────────────────────────────────────

  test("admin can delete the created priority from settings", async ({
    page,
  }) => {
    if (createdPriorityId === null) test.skip();

    await page.goto("/settings");
    await page.waitForURL("**/settings");

    // Open the Ticket Configuration tab if needed
    const configTab = page.getByRole("tab", {
      name: /ticket config|ticket configuration/i,
    });
    if (await configTab.isVisible()) await configTab.click();

    // Find the row for our priority by its label text
    const priorityRow = page.getByText(PRIORITY_LABEL);
    await expect(priorityRow).toBeVisible({ timeout: 10_000 });

    // Each row has an overflow menu (MoreHorizontal / "…" button) — click it
    const rowContainer = page.locator("tr, [role='row'], li").filter({
      has: page.getByText(PRIORITY_LABEL),
    });

    const moreButton = rowContainer
      .getByRole("button", { name: /actions|more|options/i })
      .or(rowContainer.locator("button[aria-label]").last())
      .or(rowContainer.locator("button").last());

    await moreButton.click();

    // A dropdown menu appears — click "Delete"
    await page.getByRole("menuitem", { name: /delete|remove/i }).first().click();

    // A confirmation dialog may appear
    const confirmBtn = page.getByRole("button", { name: /confirm|yes|delete/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // The priority label should disappear from the table
    await expect(page.getByText(PRIORITY_LABEL)).not.toBeVisible({ timeout: 10_000 });

    // If the browser delete succeeded we don't need the afterAll API cleanup
    createdPriorityId = null;
  });

  // ── 6. Confirm deletion via the API ───────────────────────────────────────

  test("deleted priority no longer exists in the API", async ({ request }) => {
    // Only run this check if the UI test deleted it (createdPriorityId is null)
    // If afterAll cleaned it up the ID is already gone — skip.
    if (createdPriorityId !== null) {
      // UI delete test didn't run or failed — skip this assertion
      test.skip();
      return;
    }

    const hdrs = await authHeaders(request, "admin");
    const res = await request.get(`${API_URL}/lookup/priorities`, { headers: hdrs });
    const priorities: { name: string }[] = await res.json();
    const stillExists = priorities.some((p) => p.name === PRIORITY_NAME);
    expect(stillExists, "Priority should have been deleted").toBe(false);
  });
});
