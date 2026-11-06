import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LOCALES = ["en", "ar"] as const;
const SCHEMES = ["light", "dark"] as const;

type LocaleCode = (typeof LOCALES)[number];

type PhotoManifestRow = {
  key: string;
  file: string;
  alt_en: string;
  alt_ar: string;
  credit_required: boolean;
};

type ProduceName = {
  slug: string;
  en: string;
  ar: string;
};

type CatalogueAbout = {
  about: {
    photoHero: string;
    photoTexture: string;
  };
};

type CreditProof = {
  subjects: string[];
  hrefs: string[];
  urls: string[];
  stray: string[];
  probe: string;
};

type FrameBorder = {
  frames: number;
  width: string;
  color: string;
  expected: string;
};

const photos = JSON.parse(readFileSync("content/photos.json", "utf8")) as PhotoManifestRow[];
const produceRows = JSON.parse(readFileSync("content/produce.json", "utf8")) as ProduceName[];

function catalogueFor(locale: LocaleCode): CatalogueAbout {
  return JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")) as CatalogueAbout;
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

function watch(page: Page): string[] {
  const foreign: string[] = [];
  page.on("request", (request) => rememberForeign(request.url(), foreign));
  page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
  return foreign;
}

function photoByKey(key: string): PhotoManifestRow {
  const row = photos.find((photo) => photo.key === key);
  if (!row) throw new Error(`missing photo key: ${key}`);
  return row;
}

function altFor(row: PhotoManifestRow, locale: LocaleCode): string {
  return locale === "en" ? row.alt_en : row.alt_ar;
}

function creditSubjects(locale: LocaleCode): string[] {
  const catalogue = catalogueFor(locale);
  const nameBySlug = new Map(produceRows.map((row) => [row.slug, row[locale]]));
  return photos.flatMap((row) => {
    if (!row.credit_required) return [];
    if (row.key === "hero") return [catalogue.about.photoHero];
    if (row.key === "texture") return [catalogue.about.photoTexture];
    const name = nameBySlug.get(row.key);
    if (!name) throw new Error(`photo key has no produce name: ${row.key}`);
    return [name];
  });
}

function decodeAttr(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return decodeAttr(match?.[1] ?? "");
}

function elementTagAt(html: string, start: number): string {
  let quote: string | null = null;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index] ?? "";
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") return html.slice(start, index + 1);
  }
  return "";
}

function heroImageTag(html: string): string {
  const marker = html.indexOf("data-hero-photo");
  if (marker < 0) return "";
  const imgAt = html.indexOf("<img", marker);
  if (imgAt < 0) return "";
  return elementTagAt(html, imgAt);
}

function fileFromSrc(src: string): string {
  return new URL(src, "http://127.0.0.1").searchParams.get("url") ?? "";
}

function slugFromHref(href: string): string {
  const match = /\/produce\/([^/?#]+)/.exec(href);
  if (!match?.[1]) throw new Error(`card link has no produce slug: ${href}`);
  return match[1];
}

async function openPage(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.ok()).toBe(true);
  await expect(page.locator("h1")).toBeVisible();
}

async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (document.getAnimations?.() ?? []).filter((anim) => anim.playState === "running").length,
      ),
    )
    .toBe(0);
}

async function loadedFile(img: Locator): Promise<string> {
  await expect(img).toBeVisible();
  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => img.evaluate((node) => (node instanceof HTMLImageElement ? node.naturalWidth : 0)))
    .toBeGreaterThan(0);
  const src = await img.getAttribute("src");
  if (!src) throw new Error("image has no src");
  return fileFromSrc(src);
}

function screensFor(locale: LocaleCode): { name: string; path: string }[] {
  return [
    { name: `home-${locale}`, path: `/${locale}` },
    { name: `guide-${locale}`, path: `/${locale}/guide?month=8` },
    { name: `produce-${locale}`, path: `/${locale}/produce/mango` },
    { name: `produce-leafy-${locale}`, path: `/${locale}/produce/molokhia` },
    { name: `about-${locale}`, path: `/${locale}/about` },
  ];
}

async function frameBorder(page: Page, path: string): Promise<FrameBorder> {
  const images = page.locator("main img[alt]:not([alt='']):visible");
  const frames = await images.count();
  if (frames === 0) {
    expect(path).toContain("/about");
    return { frames: 0, width: "", color: "", expected: "" };
  }
  let width = "";
  let color = "";
  let expected = "";
  for (let index = 0; index < frames; index += 1) {
    const img = images.nth(index);
    await expect(img).toBeVisible();
    const frame = img.locator("xpath=..");
    await expect(frame).toBeVisible();
    const reading = await frame.evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.borderTop = "1px solid var(--color-hairline)";
      document.body.appendChild(probe);
      const probeStyle = getComputedStyle(probe);
      const frameStyle = getComputedStyle(element);
      const result = {
        width: frameStyle.borderTopWidth,
        color: frameStyle.borderTopColor,
        expected: probeStyle.borderTopColor,
      };
      probe.remove();
      return result;
    });
    expect(reading.width).toBe("1px");
    expect(reading.color).toBe(reading.expected);
    width = reading.width;
    color = reading.color;
    expected = reading.expected;
  }
  return { frames, width, color, expected };
}

for (const locale of LOCALES) {
  test.describe(locale, () => {
    test("drops the hero photograph from the first HTML, lazy-loads it, or shows a card without its own image", async ({
      page,
      request,
    }) => {
      const foreign = watch(page);
      const heroPhoto = photoByKey("hero");
      const heroAlt = altFor(heroPhoto, locale);
      const first = await request.get(`/${locale}`);
      expect(first.ok()).toBe(true);
      const tag = heroImageTag(await first.text());
      expect(tag).toContain("<img");
      expect(attr(tag, "alt")).toBe(heroAlt);
      expect(attr(tag, "loading")).not.toBe("lazy");
      expect(fileFromSrc(attr(tag, "src"))).toBe(heroPhoto.file);

      await openPage(page, `/${locale}`);
      const hero = page.locator("[data-hero-photo] img");
      await expect(hero).toHaveCount(1);
      await expect(hero).toBeVisible();
      await expect(hero).not.toHaveAttribute("loading", "lazy");
      expect(await hero.getAttribute("alt")).toBe(heroAlt);
      expect(await loadedFile(hero)).toBe(heroPhoto.file);

      const cards = page.locator("main a[href*='/produce/']:visible");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      const checked: string[] = [];
      for (let index = 0; index < cardCount; index += 1) {
        const card = cards.nth(index);
        await expect(card).toBeVisible();
        const href = await card.getAttribute("href");
        if (!href) throw new Error("home card has no href");
        const slug = slugFromHref(href);
        const img = card.locator("img");
        await expect(img).toHaveCount(1);
        expect(await loadedFile(img)).toBe(photoByKey(slug).file);
        await expect(img.locator("xpath=..").locator("[data-kind]")).toHaveCount(0);
        checked.push(slug);
      }

      console.log(
        `showcase home ${locale} heroAlt=${JSON.stringify(heroAlt)} cards=${checked.join(",")} foreign=${foreign.length}`,
      );
      expect(foreign).toEqual([]);
    });

    test("misses a produce photograph across the twelve months", async ({ page }) => {
      const foreign = watch(page);
      const seen = new Set<string>();
      for (let month = 1; month <= 12; month += 1) {
        await openPage(page, `/${locale}/guide?month=${month}`);
        const cards = page.locator("main a[href*='/produce/']:visible");
        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThan(0);
        for (let index = 0; index < cardCount; index += 1) {
          const card = cards.nth(index);
          await expect(card).toBeVisible();
          const href = await card.getAttribute("href");
          if (!href) throw new Error(`guide card has no href in month ${month}`);
          const slug = slugFromHref(href);
          const img = card.locator("img");
          await expect(img).toHaveCount(1);
          expect(await loadedFile(img)).toBe(photoByKey(slug).file);
          await expect(img.locator("xpath=..").locator("[data-kind]")).toHaveCount(0);
          seen.add(slug);
        }
      }
      const slugs = [...seen].sort();
      console.log(`showcase guide ${locale} slugs=${slugs.join(",")} count=${slugs.length} foreign=${foreign.length}`);
      expect(slugs).toEqual(produceRows.map((row) => row.slug).sort());
      expect(foreign).toEqual([]);
    });

    test("drops a produce photograph or its alt", async ({ page }) => {
      const foreign = watch(page);
      const checked: string[] = [];
      for (const row of produceRows) {
        await openPage(page, `/${locale}/produce/${row.slug}`);
        const img = page.locator("main article img");
        await expect(img).toHaveCount(1);
        await expect(img).toBeVisible();
        const photo = photoByKey(row.slug);
        expect(await img.getAttribute("alt")).toBe(altFor(photo, locale));
        expect(await loadedFile(img)).toBe(photo.file);
        await expect(img.locator("xpath=..").locator("[data-kind]")).toHaveCount(0);
        checked.push(row.slug);
      }
      console.log(`showcase produce ${locale} pages=${checked.join(",")} count=${checked.length} foreign=${foreign.length}`);
      expect(checked).toHaveLength(produceRows.length);
      expect(foreign).toEqual([]);
    });

    test("drops a credited subject, leaves an https outside a credit href, or hides an https inside a script src", async ({
      page,
    }) => {
      const foreign = watch(page);
      const required = photos.filter((row) => row.credit_required).length;
      const expected = creditSubjects(locale);
      await openPage(page, `/${locale}/about`);
      const list = page.locator("main section ul");
      await expect(list).toBeVisible();
      const proof = await page.evaluate((): CreditProof => {
        const pattern = /https:\/\/[^\s"'<>]*/g;
        const credits = document.querySelector("main section ul");
        if (!(credits instanceof HTMLElement)) {
          return { subjects: [], hrefs: [], urls: ["missing-credit-list"], stray: [], probe: "" };
        }
        const subjects = [...credits.querySelectorAll(":scope > li")].map((row) => row.querySelector("p")?.textContent ?? "");
        const hrefs = [...credits.querySelectorAll("a[href]")].map((anchor) => anchor.getAttribute("href") ?? "");

        const markupKeepingScriptSrc = (root: HTMLElement): { html: string; creditHtml: string } => {
          const copy = root.cloneNode(true);
          if (!(copy instanceof HTMLElement)) return { html: "", creditHtml: "" };
          for (const script of copy.querySelectorAll("script")) {
            if (!script.hasAttribute("src")) script.remove();
          }
          const clonedList = copy.querySelector("main section ul");
          return {
            html: copy.innerHTML,
            creditHtml: clonedList instanceof HTMLElement ? clonedList.outerHTML : "",
          };
        };

        const probeRoot = document.createElement("div");
        const external = document.createElement("script");
        external.setAttribute("src", "https://cdn.example/app.js");
        const inline = document.createElement("script");
        inline.textContent = "https://inline.example/x";
        probeRoot.append(external, inline);

        const pageMarkup = markupKeepingScriptSrc(document.documentElement);
        const probe = markupKeepingScriptSrc(probeRoot).html;
        const html = pageMarkup.html;
        const without = pageMarkup.creditHtml === "" ? html : html.replace(pageMarkup.creditHtml, "");
        const urls = [...html.matchAll(pattern)].map((match) => (match[0] ?? "").replaceAll("&amp;", "&"));
        const stray = [...without.matchAll(pattern)].map((match) => (match[0] ?? "").replaceAll("&amp;", "&"));
        return { subjects, hrefs, urls, stray, probe };
      });
      console.log(
        `showcase about ${locale} credits=${proof.subjects.length} manifest=${required} subjects=${proof.subjects.join("|")} foreign=${foreign.length}`,
      );
      expect(proof.subjects).toEqual(expected);
      expect(proof.subjects).toHaveLength(required);
      expect(proof.hrefs).toEqual(proof.urls);
      expect(proof.stray).toEqual([]);
      expect(proof.probe).toContain('src="https://cdn.example/app.js"');
      expect(proof.probe).not.toContain("https://inline.example/x");
      expect(foreign).toEqual([]);
    });

    test("drops a texture photograph or draws a pattern", async ({ page }) => {
      const foreign = watch(page);
      const texture = photoByKey("texture");
      const bands = [
        { path: `/${locale}`, names: ["hero", "heading"] },
        { path: `/${locale}/guide?month=8`, names: ["guide"] },
        { path: `/${locale}/about`, names: ["about"] },
      ];
      const held: string[] = [];
      for (const entry of bands) {
        await openPage(page, entry.path);
        for (const name of entry.names) {
          const band = page.locator(`[data-texture-band="${name}"]`);
          await expect(band).toHaveCount(1);
          await expect(band).toBeVisible();
          const layer = band.locator(":scope > [aria-hidden='true']");
          await expect(layer).toHaveCount(1);
          await expect(layer).toBeVisible();
          const img = layer.locator("img");
          await expect(img).toHaveCount(1);
          await expect(img).toBeVisible();
          await expect(img).toHaveAttribute("alt", "");
          expect(await loadedFile(img)).toBe(texture.file);
          await expect(layer.locator("pattern")).toHaveCount(0);
          held.push(name);
        }
        await expect(page.locator("pattern")).toHaveCount(0);
      }
      console.log(`showcase texture ${locale} bands=${held.join(",")} foreign=${foreign.length}`);
      expect(held).toEqual(["hero", "heading", "guide", "about"]);
      expect(foreign).toEqual([]);
    });

    test("fails axe or paints a photo frame border off the hairline", async ({ page }) => {
      const foreign = watch(page);
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const screen of screensFor(locale)) {
          await openPage(page, screen.path);
          await settled(page);
          const axe = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
          if (axe.violations.length > 0) {
            console.log(
              `showcase axe ${locale} ${scheme} ${screen.name} violations=${axe.violations.map((violation) => violation.id).join(",")}`,
            );
          }
          const border = await frameBorder(page, screen.path);
          const borderText =
            border.frames === 0
              ? "frames=0"
              : `frames=${border.frames} border=${border.width} color=${border.color} expected=${border.expected}`;
          console.log(`showcase axe ${locale} ${scheme} ${screen.name} axe=${axe.violations.length} ${borderText}`);
          expect(axe.violations).toEqual([]);
        }
      }
      console.log(`showcase axe ${locale} foreign=${foreign.length}`);
      expect(foreign).toEqual([]);
    });
  });
}
