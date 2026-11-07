import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ThemeSwitch } from "./ThemeSwitch";

vi.mock("./theme-storage", () => ({
  subscribeThemeChoice: () => () => {},
  currentThemeChoice: () => "dark",
  chooseTheme: () => {},
}));

it("uses the client snapshot, drops a choice, or leaves a button unnamed", () => {
  const html = renderToStaticMarkup(
    <ThemeSwitch label="Theme" system="System" light="Light" dark="Dark" />,
  );
  const group = /<div\b[^>]*role="group"[^>]*>[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";
  expect(group).toContain('aria-label="Theme"');
  const buttons = [...group.matchAll(/<button\b([^>]*)>/g)].map((match) => match[1] ?? "");
  expect(buttons).toHaveLength(3);
  expect(buttons.map((tag) => /data-theme-choice="([^"]*)"/.exec(tag)?.[1])).toEqual([
    "system",
    "light",
    "dark",
  ]);
  expect(buttons.map((tag) => /aria-label="([^"]*)"/.exec(tag)?.[1])).toEqual([
    "System",
    "Light",
    "Dark",
  ]);
  expect(buttons.map((tag) => /aria-pressed="([^"]*)"/.exec(tag)?.[1])).toEqual([
    "true",
    "false",
    "false",
  ]);
});
