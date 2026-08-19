import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("product shell scrolling", () => {
  const globals = read("app/globals.css");
  const navigation = read(
    "components/design-system/product-shell-navigation.tsx",
  );

  it("uses a restrained tokenized scrollbar with clear interaction states", () => {
    expect(globals).toContain("--scrollbar-thumb:");
    expect(globals).toContain("--scrollbar-thumb-hover:");
    expect(globals).toContain("scrollbar-color:");
    expect(globals).toContain("::-webkit-scrollbar-thumb:hover");
    expect(globals).toContain("::-webkit-scrollbar-thumb:active");
  });

  it("keeps navigation scrolling stable and contained", () => {
    expect(navigation).toContain("product-scroll-region");
    expect(globals).toContain("scrollbar-gutter: stable");
    expect(globals).toContain("overscroll-behavior: contain");
  });
});
