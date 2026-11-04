import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { getProduceBySlug, ProducePhoto } from "./index";
import type { ProducePhotoRow } from "./photos";
import { SeasonRing } from "./SeasonRing";

function mango() {
  const found = getProduceBySlug("mango");
  if (!found) throw new Error("missing produce");
  return found;
}

const photo: ProducePhotoRow = {
  key: "mango",
  file: "/photos/produce/mango.jpg",
  width: 1800,
  height: 1400,
  alt_en: "Fruit on linen",
  alt_ar: "فاكهة على قماش",
  author: "Huda N.",
  source_url: "https://localhost/source",
  licence: "Commercial use",
  licence_url: "https://localhost/licence",
  credit_required: true,
};

it("omits the accent tick or draws it on the wrong arc", () => {
  const plain = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} />);
  expect(plain).not.toContain("<line");
  expect(plain.match(/data-in="/g)?.length).toBe(12);
  const marked = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} currentMonth={8} />);
  expect(marked.match(/<line\b/g)?.length).toBe(1);
  expect(marked).toContain('x1="10.525"');
  expect(marked).toContain('y1="29.475"');
  expect(marked).toContain('x2="7.131"');
  expect(marked).toContain('y2="32.869"');
  expect(marked.match(/data-in="/g)?.length).toBe(12);
  const january = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} currentMonth={1} />);
  expect(january).toContain('x1="23.468"');
  expect(january).toContain('y1="7.057"');
  expect(january).not.toContain('x1="10.525"');
});

it("drops the current-month tick on the fallback or draws it over a photograph", () => {
  const produce = mango();
  const fallback = renderToStaticMarkup(
    <ProducePhoto produce={produce} photo={undefined} locale="en" slot="page" currentMonth={8} />,
  );
  expect(fallback.match(/<line\b/g)?.length).toBe(1);
  expect(fallback).toContain('x1="10.525"');
  const untouched = renderToStaticMarkup(
    <ProducePhoto produce={produce} photo={undefined} locale="en" slot="page" />,
  );
  expect(untouched).not.toContain("<line");
  const photographed = renderToStaticMarkup(
    <ProducePhoto produce={produce} photo={photo} locale="en" slot="page" currentMonth={8} />,
  );
  expect(photographed).not.toContain("<line");
  expect(photographed).not.toContain("data-in=");
  const ringCss = readFileSync(new URL("./SeasonRing.module.css", import.meta.url), "utf8");
  expect(ringCss).toContain(":dir(rtl)");
  expect(ringCss).toContain("scaleX(-1)");
  expect(ringCss).toContain("var(--color-accent)");
});
