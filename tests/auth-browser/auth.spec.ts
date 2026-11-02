import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { write, rows, closeDb } from "../../src/server/db";
import { hashPassword } from "../../src/server/security";
const tag = randomUUID(),
  id = randomUUID(),
  email = "browser-admin-" + tag + "@example.test",
  staffEmail = "browser-team-" + tag + "@example.test",
  password = "browser-only-" + tag;
test.beforeAll(async () => {
  await write(
    "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?)",
    [
      id,
      "Browser Admin",
      email,
      await hashPassword(password),
      "super_admin",
      Date.now(),
    ],
  );
});
test.afterAll(async () => {
  const users = await rows<{ id: string }>(
    "SELECT id FROM users WHERE email IN (?,?)",
    [email, staffEmail],
  );
  for (const u of users) {
    await write("DELETE FROM security_events WHERE actor_id=? OR target_id=?", [
      u.id,
      u.id,
    ]);
    await write("DELETE FROM sessions WHERE user_id=?", [u.id]);
    await write("DELETE FROM users WHERE id=?", [u.id]);
  }
  await closeDb();
});
test("login gate, admin-created account, role restriction and session revocation", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Product pricing." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Team members", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser Staff");
  await page.getByLabel("Email", { exact: true }).fill(staffEmail);
  await page.getByLabel("Initial password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(staffEmail, { exact: true }).first(),
  ).toBeVisible();
  const second = await browser.newContext();
  const staff = await second.newPage();
  await staff.goto("/login");
  await staff.getByLabel("Email address").fill(staffEmail);
  await staff.getByLabel("Password", { exact: true }).fill(password);
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    staff.getByRole("heading", { name: "Product pricing." }),
  ).toBeVisible();
  await expect(
    staff.getByRole("button", { name: "Team members", exact: true }),
  ).toHaveCount(0);
  expect((await staff.request.get("/api/team")).status()).toBe(403);
  expect(
    (
      await staff.request.post("/api/team", {
        headers: { Origin: "https://untrusted.example" },
        data: { name: "Bad", email: "bad@example.test", password },
      })
    ).status(),
  ).toBe(403);
  const row = page.locator("tr").filter({ hasText: staffEmail });
  await row.getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(row.getByText("Inactive", { exact: true })).toBeVisible();
  await staff.reload();
  await expect(staff).toHaveURL(/\/login$/);
  await second.close();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
