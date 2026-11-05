import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HeroSceneFrame } from "./HeroSceneFrame";

function serverHtml(): string {
  return renderToStaticMarkup(
    <HeroSceneFrame label="Turning scene" pause="Pause the scene" play="Play the scene" />,
  );
}

it("puts a button or a canvas in the server HTML, so the still is no longer the first paint", () => {
  const html = serverHtml();
  expect(html).toContain("data-hero-scene");
  expect(html).toContain("<svg");
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain("<button");
  expect(html).not.toContain("<canvas");
  expect(html).not.toContain("Turning scene");
  expect(html).not.toContain("Pause the scene");
  expect(html).not.toContain("Play the scene");
  expect(html).not.toContain("data-scene-mode");
});
