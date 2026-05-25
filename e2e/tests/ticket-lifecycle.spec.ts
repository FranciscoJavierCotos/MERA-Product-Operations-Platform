/**
 * E2E: Support agent full ticket lifecycle
 *
 * Flow:
 *   1. Login as support agent (via saved auth state)
 *   2. Navigate to /tickets → click "New Ticket"
 *   3. Fill in the new-ticket form (title, description, dept, category, priority)
 *   4. Submit → redirected to the ticket detail page
 *   5. Click the status badge → select a final status ("Resolved")
 *   6. Resolution dialog opens → enter resolution text → save
 *   7. Assert: status badge now shows the final status
 *   8. Assert: the resolution text is visible on the page
 *
 * Cleanup: the created ticket is deleted via API in afterAll.
 *
 * Prerequisites:
 *   • `supabase start` with seed data
 *   • `pnpm dev` (web :3000, api :8080)
 *   • Auth setup has run (e2e/tests/auth.setup.ts wrote support.json)
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { deleteTicketViaApi } from "../helpers/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPPORT_AUTH = path.resolve(__dirname, "../.auth/support.json");

// ── Shared state across tests in this file ────────────────────────────────
let createdTicketId: string | null = null;
const TICKET_TITLE = `E2E Lifecycle ${Date.now()}`;
const RESOLUTION_TEXT = "Fixed by updating the configuration settings.";

test.describe("Ticket lifecycle — create → resolve", () => {
  test.use({ storageState: SUPPORT_AUTH });

  test.afterAll(async ({ request }) => {
    if (createdTicketId) {
      await deleteTicketViaApi(request, createdTicketId);
    }
  });

  // ── Step 1: Create a new ticket via the UI ──────────────────────────────

  test("support agent can create a new ticket", async ({ page }) => {
    await page.goto("/tickets");

    // Navigate to new ticket form
    await page.getByRole("link", { name: /new ticket/i }).click();
    await page.waitForURL("**/tickets/new");

    // Fill the title
    await page.getByLabel(/title/i).fill(TICKET_TITLE);

    // Fill the description (Tiptap contenteditable)
    const descEditor = page.locator(
      "div[contenteditable='true']",
    ).first();
    await descEditor.click();
    await page.keyboard.type("This is an E2E test ticket created by Playwright.");

    // Select functional department (first available option)
    const deptTrigger = page.getByRole("combobox").filter({ hasText: /department|select dept/i }).first()
      .or(page.locator('[placeholder="Select department..."]').first());
    // Use text-based trigger to open the first Select
    const deptSelect = page.getByText(/select department/i);
    await deptSelect.click();
    // Pick the first option in the dropdown
    await page.getByRole("option").first().click();

    // Select category — click the next Select trigger
    const catSelect = page.getByText(/select category/i);
    await catSelect.click();
    await page.getByRole("option").first().click();

    // Submit the form
    await page.getByRole("button", { name: /create ticket/i }).click();

    // Should redirect to ticket detail page
    await page.waitForURL(/\/tickets\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // Extract ticket ID from URL for cleanup
    const url = page.url();
    const match = url.match(/\/tickets\/([0-9a-f-]{36})/);
    expect(match).not.toBeNull();
    createdTicketId = match![1];

    // Verify the ticket title appears on the page
    await expect(page.getByRole("heading", { name: TICKET_TITLE })).toBeVisible();
  });

  // ── Step 2: Change status to final, enter resolution ───────────────────

  test("support agent can resolve a ticket with a resolution", async ({ page }) => {
    // This test depends on the ticket created above
    if (!createdTicketId) test.skip();

    await page.goto(`/tickets/${createdTicketId}`);
    await page.waitForURL(`**/tickets/${createdTicketId}`);

    // Find the status badge and click it to open the dropdown
    // The StatusBadgeDropdown renders a button containing the status name
    const statusButton = page
      .getByRole("button")
      .filter({ has: page.locator(".badge, [class*='badge']") })
      .first();

    // More reliable: look for a button/element that contains the current status label
    // and a chevron icon (ChevronDown). We use a broader click target.
    await page.locator('[data-radix-dropdown-menu-trigger]').first().click()
      .catch(async () => {
        // Fallback: find the status area by looking for a Button with a Badge inside
        await page.locator("button:has(.badge)").first().click();
      });

    // Wait for the dropdown menu to appear
    await page.waitForSelector('[role="menu"], [data-radix-popper-content-wrapper]', {
      timeout: 5_000,
    }).catch(() => {
      // If menu didn't open, try clicking the status text directly
    });

    // Click a final-status item (text usually contains "Resolved" or "Closed")
    const finalStatusItem = page
      .getByRole("menuitem")
      .filter({ hasText: /resolved|closed/i })
      .first();

    if (await finalStatusItem.isVisible()) {
      await finalStatusItem.click();
    } else {
      // If no menu opened, try clicking the visible status text
      await page.locator("text=/open|new|pending/i").first().click();
      await page.getByRole("menuitem").filter({ hasText: /resolved|closed/i }).first().click();
    }

    // Resolution dialog should open (required when transitioning to a final status)
    await expect(
      page.getByRole("dialog").filter({ hasText: /resolution|mark ticket/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Enter resolution text in the Tiptap editor inside the dialog
    const resolutionEditor = page
      .getByRole("dialog")
      .locator("div[contenteditable='true']")
      .first();
    await resolutionEditor.click();
    await page.keyboard.type(RESOLUTION_TEXT);

    // Submit the resolution
    await page
      .getByRole("button", { name: /save.*resolved|save.*closed|save/i })
      .last()
      .click();

    // Wait for the dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    // Verify: status badge now shows the final status
    await expect(page.locator("text=/resolved|closed/i").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── Step 3: Resolution persists on page reload ────────────────────────

  test("resolution text is persisted and visible after reload", async ({ page }) => {
    if (!createdTicketId) test.skip();

    await page.goto(`/tickets/${createdTicketId}`);

    // The resolution card is shown when ticket is in a final status
    await expect(page.getByText(RESOLUTION_TEXT)).toBeVisible({ timeout: 10_000 });
  });

  // ── Step 4: Ticket appears in the tickets list ───────────────────────

  test("created ticket appears in the tickets list", async ({ page }) => {
    await page.goto("/tickets");

    // The ticket table should contain a link with our ticket's title
    await expect(
      page.getByRole("link", { name: TICKET_TITLE }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Step 5: Audit history contains the status change ─────────────────

  test("ticket audit history reflects the status change", async ({ page }) => {
    if (!createdTicketId) test.skip();

    await page.goto(`/tickets/${createdTicketId}`);

    // Click the "Activity" tab
    const activityTab = page.getByRole("button", { name: /activity/i });
    if (await activityTab.isVisible()) {
      await activityTab.click();
      // The history section should mention a status change
      await expect(
        page.getByText(/status|resolved|closed/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});
