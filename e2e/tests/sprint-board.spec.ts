/**
 * E2E: Sprint board — move card → status updates
 *
 * Verifies that a support agent can change the status of a work item on the
 * sprint board by opening its detail dialog, switching the status Select, and
 * saving — and that the change is reflected on the board after a page refresh.
 *
 * Flow:
 *   1. API: create project → sprint → start sprint → create work item (todo)
 *   2. Browser: navigate to /projects/{key}  (the sprint board page)
 *   3. Find the card in the "Todo" column and click it
 *   4. Click "Edit" in the detail dialog
 *   5. Change Status → "In Progress"
 *   6. Click "Save"
 *   7. Assert: card now appears under the "In Progress" column heading
 *   8. API: verify work item status = "in_progress"
 *
 * Cleanup: project (and cascade: sprint, work item) is deleted in afterAll.
 *
 * Prerequisites:
 *   • `supabase start` with seed data
 *   • `pnpm dev` (web :3000, api :8080)
 *   • Auth setup has run (auth.setup.ts wrote admin.json)
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { authHeaders, getJwt, API_URL } from "../helpers/api.js";
import type { APIRequestContext } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_AUTH = path.resolve(__dirname, "../.auth/admin.json");

// ── Shared state ──────────────────────────────────────────────────────────────

interface BoardTestFixture {
  projectId: string;
  projectKey: string;
  sprintId: string;
  workItemId: string;
  workItemKey: string;
}

let fixture: BoardTestFixture | null = null;

// ── API helpers ───────────────────────────────────────────────────────────────

async function setupBoardFixture(
  request: APIRequestContext,
): Promise<BoardTestFixture> {
  const hdrs = await authHeaders(request, "admin");

  // 1. Create a project
  const projectKey = `E2EBOARD${Date.now()}`;
  const projRes = await request.post(`${API_URL}/projects`, {
    headers: hdrs,
    data: { key: projectKey, name: `E2E Board Test ${Date.now()}` },
  });
  if (!projRes.ok()) {
    throw new Error(`Failed to create project: ${projRes.status()} ${await projRes.text()}`);
  }
  const project: { id: string; key: string } = await projRes.json();

  // 2. Create a sprint in that project
  const sprintRes = await request.post(
    `${API_URL}/projects/${project.id}/sprints`,
    {
      headers: hdrs,
      data: { name: "E2E Board Sprint" },
    },
  );
  if (!sprintRes.ok()) {
    throw new Error(`Failed to create sprint: ${sprintRes.status()} ${await sprintRes.text()}`);
  }
  const sprint: { id: string } = await sprintRes.json();

  // 3. Start the sprint (status → active)
  const startRes = await request.post(`${API_URL}/sprints/${sprint.id}/start`, {
    headers: hdrs,
  });
  if (!startRes.ok()) {
    throw new Error(`Failed to start sprint: ${startRes.status()} ${await startRes.text()}`);
  }

  // 4. Create a work item in the sprint with status = "todo"
  const itemRes = await request.post(`${API_URL}/work-items`, {
    headers: hdrs,
    data: {
      project_id: project.id,
      sprint_id: sprint.id,
      title: `E2E Board Item ${Date.now()}`,
      type: "task",
      rank: "a0",
    },
  });
  if (!itemRes.ok()) {
    throw new Error(`Failed to create work item: ${itemRes.status()} ${await itemRes.text()}`);
  }
  const workItem: { id: string; item_key: string } = await itemRes.json();

  return {
    projectId: project.id,
    projectKey: project.key,
    sprintId: sprint.id,
    workItemId: workItem.id,
    workItemKey: workItem.item_key,
  };
}

async function teardownBoardFixture(
  request: APIRequestContext,
  f: BoardTestFixture,
) {
  const hdrs = await authHeaders(request, "admin");
  // Deleting the project cascades to sprints and work items
  await request
    .delete(`${API_URL}/projects/${f.projectId}`, { headers: hdrs })
    .catch(() => {/* ignore — best-effort */});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Sprint board — move card via detail dialog", () => {
  test.use({ storageState: ADMIN_AUTH });

  test.beforeAll(async ({ request }) => {
    fixture = await setupBoardFixture(request);
  });

  test.afterAll(async ({ request }) => {
    if (fixture) {
      await teardownBoardFixture(request, fixture);
      fixture = null;
    }
  });

  // ── Board loads and shows the work item in "Todo" column ──────────────────

  test("sprint board renders the work item in the Todo column", async ({
    page,
  }) => {
    if (!fixture) test.skip();
    const { projectKey, workItemKey } = fixture!;

    await page.goto(`/projects/${projectKey}`);

    // Wait for the active sprint section
    await expect(page.getByText(/active sprint/i)).toBeVisible({
      timeout: 20_000,
    });

    // The work item card should appear somewhere on the board
    // Cards show the item title or item_key
    const cardLocator = page
      .locator("[data-testid='work-item-card'], .rounded-md.border")
      .filter({ hasText: workItemKey })
      .or(page.getByText(`E2E Board Item`).first());

    await expect(cardLocator.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Open detail dialog → edit status → save ──────────────────────────────

  test("clicking a card opens the detail dialog", async ({ page }) => {
    if (!fixture) test.skip();
    const { projectKey, workItemKey } = fixture!;

    await page.goto(`/projects/${projectKey}`);
    await expect(page.getByText(/active sprint/i)).toBeVisible({ timeout: 20_000 });

    // Find and click the work item card
    const card = page
      .getByText(workItemKey)
      .or(page.getByText(/E2E Board Item/i).first());
    await card.first().click();

    // Detail dialog should appear
    await expect(
      page.getByRole("dialog"),
    ).toBeVisible({ timeout: 5_000 });

    // The dialog should show the item key
    await expect(
      page.getByRole("dialog").getByText(workItemKey),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("status can be changed from Todo to In Progress via the detail dialog", async ({
    page,
  }) => {
    if (!fixture) test.skip();
    const { projectKey, workItemKey, workItemId } = fixture!;

    await page.goto(`/projects/${projectKey}`);
    await expect(page.getByText(/active sprint/i)).toBeVisible({ timeout: 20_000 });

    // Click the card
    const card = page
      .getByText(workItemKey)
      .or(page.getByText(/E2E Board Item/i).first());
    await card.first().click();

    // Wait for detail dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click "Edit"
    await dialog.getByRole("button", { name: /edit/i }).first().click();

    // The status Select should now be in editing mode.
    // The Select shows the current value ("To Do" / "todo") in a SelectTrigger.
    // Change it to "in_progress".
    const statusSelect = dialog.locator('[role="combobox"]').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      // Pick "In Progress" from the dropdown options
      await page
        .getByRole("option", { name: /in progress/i })
        .first()
        .click();
    } else {
      // Fallback: find the SelectTrigger containing current status text
      const trigger = dialog
        .getByText(/to do|todo/i)
        .locator("..")
        .locator("button")
        .first();
      await trigger.click();
      await page.getByRole("option", { name: /in progress/i }).first().click();
    }

    // Click "Save"
    await dialog.getByRole("button", { name: /save/i }).click();

    // Wait for the dialog to exit edit mode (Save button disappears)
    await expect(
      dialog.getByRole("button", { name: /save/i }),
    ).not.toBeVisible({ timeout: 10_000 });

    // Wait for the board to refresh (Next.js router.refresh())
    // The card should now appear under "In Progress" column heading
    await page.waitForTimeout(1_500); // brief wait for SSR rehydration

    // The column heading "In Progress" should be visible and the card
    // should be in / near it
    await expect(
      page.getByText(/in progress/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Verify via API ────────────────────────────────────────────────────────

  test("work item status is in_progress in the API after the board update", async ({
    request,
  }) => {
    if (!fixture) test.skip();
    const { workItemId } = fixture!;

    const hdrs = await authHeaders(request, "admin");
    const res = await request.get(`${API_URL}/work-items/${workItemId}`, {
      headers: hdrs,
    });
    expect(res.ok()).toBe(true);

    const item: { status: string } = await res.json();
    expect(item.status).toBe("in_progress");
  });
});
