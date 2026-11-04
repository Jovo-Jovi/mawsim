import { expect, test, type Page, type Response } from "@playwright/test";

function redirectUrls(response: Response): string[] {
  const earlier: string[] = [];
  let request = response.request().redirectedFrom();
  while (request) {
    earlier.unshift(request.url());
    request = request.redirectedFrom();
  }
  return [...earlier, response.url()];
}

function rememberForeign(raw: string, foreign: string[]): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    foreign.push(raw);
    return;
  }
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return;
  if (url.hostname !== "127.0.0.1") foreign.push(raw);
}

async function internalHrefs(page: Page): Promise<string[]> {
  return page.locator("[href]").evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/") && !href.startsWith("//")),
  );
}

async function expectInternalHrefs(page: Page, seen: Set<string>): Promise<number> {
  const hrefs = await internalHrefs(page);
  const origin = new URL(page.url()).origin;
  let found = 0;
  for (const href of hrefs) {
    found += 1;
    if (seen.has(href)) continue;
    seen.add(href);
    const response = await page.request.get(`${origin}${href}`, { maxRedirects: 0 });
    const host = new URL(response.url()).hostname;
    expect({ href, status: response.status(), host }).toEqual({ href, status: 200, host: "127.0.0.1" });
  }
  return found;
}

test("follows a second redirect, drops the guide month or fruit kind, changes the produce slug, or stores a cookie", async ({
  page,
  context,
}) => {
  const foreign: string[] = [];
  const seen = new Set<string>();
  const steps: string[] = [];
  let found = 0;
  context.on("request", (request) => rememberForeign(request.url(), foreign));
  page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));

  const landing = await page.goto("/");
  if (landing === null) throw new Error("no response for /");
  const chain = redirectUrls(landing);
  const hops = chain.length - 1;
  expect(hops).toBe(1);
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  await page.getByRole("link", { name: "تصفّح الدليل كاملًا", exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/guide\?month=(?:[1-9]|1[0-2])$/);
  await expect(page.locator("[data-month-scroller]")).toBeVisible();
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  const august = page.locator("[data-month-scroller]").getByRole("link", { name: /أغسطس/ });
  await expect(august).toHaveCount(1);
  await august.click();
  await expect(page).toHaveURL(/\/ar\/guide\?month=8$/);
  await expect(august).toHaveAttribute("aria-current", "true");
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  const fruit = page.getByRole("navigation", { name: "الأنواع" }).getByRole("link", { name: "فاكهة", exact: true });
  await fruit.click();
  await expect(page).toHaveURL(/\/ar\/guide\?month=8&kind=fruit$/);
  await expect(fruit).toHaveAttribute("aria-current", "true");
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  const firstProduce = page.locator('main a[href^="/ar/produce/"]').first();
  await expect(firstProduce).toHaveAttribute("href", "/ar/produce/mango");
  await firstProduce.click();
  await expect(page).toHaveURL(/\/ar\/produce\/mango$/);
  await expect(page.getByRole("heading", { level: 1, name: "مانجو" })).toBeVisible();
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  const english = page.getByRole("banner").getByRole("link", { name: "English", exact: true });
  await expect(english).toHaveCount(1);
  await english.click();
  await expect(page).toHaveURL(/\/en\/produce\/mango$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Mango" })).toBeVisible();
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  const arabic = page.getByRole("banner").getByRole("link", { name: "العربية", exact: true });
  await expect(arabic).toHaveCount(1);
  await arabic.click();
  await expect(page).toHaveURL(/\/ar\/produce\/mango$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1, name: "مانجو" })).toBeVisible();
  steps.push(page.url());
  found += await expectInternalHrefs(page, seen);

  expect(await context.cookies()).toEqual([]);
  expect(foreign).toEqual([]);

  console.log(`T09 redirect-hops ${hops}`);
  console.log(`T09 redirect-chain ${chain.join(" -> ")}`);
  console.log(`T09 step-urls ${steps.join(" | ")}`);
  console.log(`T09 internal-links-checked ${seen.size}`);
  console.log(`T09 internal-hrefs-found ${found}`);
});
