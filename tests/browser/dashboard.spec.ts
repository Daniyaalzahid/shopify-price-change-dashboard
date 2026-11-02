import { test, expect } from "@playwright/test";
test("price drafts survive combined filters, pagination and reload; review includes hidden changes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Drafts saved in this browser")).toBeVisible();
  await page
    .getByLabel("New price for HAI-HSU-18HFP", { exact: true })
    .fill("152000");
  await page.getByLabel("Next page").click();
  await page
    .getByLabel("New price for HAI-HSU-12HFP", { exact: true })
    .fill("120000");
  await page.getByLabel("Brand", { exact: true }).selectOption("Haier");
  await page
    .getByLabel("Collection", { exact: true })
    .selectOption("Air Conditioners");
  await page.getByLabel("Search products or SKU").fill("HAI-HSU-12");
  await expect(page.locator(".product-table tbody tr")).toHaveCount(1);
  await expect(
    page.getByLabel("New price for HAI-HSU-12HFP", { exact: true }),
  ).toHaveValue("120000");
  await page.getByRole("button", { name: /Review changes/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("tbody tr")).toHaveCount(2);
  await expect(
    dialog.getByRole("button", { name: "Update Shopify" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close review" }).click();
  await page.reload();
  await expect(
    page.getByLabel("New price for HAI-HSU-18HFP", { exact: true }),
  ).toHaveValue("152000");
  await page
    .getByLabel("New price for HAI-HSU-18HFP", { exact: true })
    .fill("0");
  await expect(
    page.getByRole("button", { name: /Review changes/ }),
  ).toBeDisabled();
  await expect(page.getByText(/Price must be between/)).toBeVisible();
  await page
    .getByRole("button", { name: "Discard drafts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard all drafts", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("New price for HAI-HSU-18HFP", { exact: true }),
  ).toHaveValue("");
});
test("mobile layout contains the page while table scrolls independently", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Product pricing." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByLabel("Search products or SKU").fill("not-a-real-sku");
  await expect(
    page.getByRole("heading", { name: "No matching products" }),
  ).toBeVisible();
});
