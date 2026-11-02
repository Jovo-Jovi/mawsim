import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { getProduceBySlug, StorageTipPanel } from "./index";

function mango() {
  const found = getProduceBySlug("mango");
  if (!found) throw new Error("missing produce");
  return found;
}

it("replaces mango's Arabic tip or translates it", () => {
  const html = renderToStaticMarkup(<StorageTipPanel produce={mango()} locale="ar" />);
  expect(html).toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(html).not.toContain("Ripen on the counter, then chill.");
  expect(html).toContain("كيف تحفظه");
  expect(html).not.toContain('lang="');
  expect(html).not.toContain("dir=");
});

it("replaces mango's English tip or translates it", () => {
  const html = renderToStaticMarkup(<StorageTipPanel produce={mango()} locale="en" />);
  expect(html).toContain("Ripen on the counter, then chill.");
  expect(html).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(html).toContain("How to keep it");
});
