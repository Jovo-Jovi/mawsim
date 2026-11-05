import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Reveal } from "./index";

it("hides a card in the server HTML, or drops the wrapper the reveal script needs", () => {
  const html = renderToStaticMarkup(
    <Reveal>
      <ul>
        <li data-reveal-item="">Mango</li>
      </ul>
      <p data-reveal-item="">Sample notice</p>
    </Reveal>,
  );
  expect(html.startsWith("<div")).toBe(true);
  expect(html).toContain("Mango");
  expect(html).toContain("Sample notice");
  expect(html).toContain("data-reveal-item");
  expect(html).not.toContain("data-reveal=");
});
