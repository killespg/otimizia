import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function optionalSource(path: string) {
  const absolutePath = resolve(process.cwd(), path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

describe("Landing Liquid Glass", () => {
  const pageSource = source("app/page.tsx");
  const css = source("app/globals.css");
  const navSource = source("components/landing/landing-nav.tsx");
  const heroSource = source("components/landing/hero.tsx");
  const stickyCtaSource = source("components/landing/mobile-sticky-cta.tsx");
  const uiHeroSource = optionalSource("components/ui/hero.tsx");
  const stageSources = [
    pageSource,
    source("components/landing/feature-tabs.tsx"),
    uiHeroSource,
    source("components/landing/pricing.tsx"),
    source("components/landing/FaqAccordion.tsx"),
    source("components/landing/about.tsx"),
  ].join("\n");

  it("usa canvas contínuo e chrome flutuante", () => {
    expect(pageSource).toContain('data-landing-liquid-canvas="true"');
    expect(pageSource).toContain("landing-liquid-page");
    expect(pageSource).toContain("landing-liquid-section");
    expect(navSource).toContain('className="landing-liquid-nav"');
    expect(heroSource).toContain("liquid-glass-control--tinted");
    expect(stickyCtaSource).toContain("liquid-glass-control--tinted");
    expect(css).toContain(".landing-liquid-page");
    expect(css).toContain("header.landing-liquid-nav.od-chrome");
  });

  it("integra o hero orbital com o produto real", () => {
    expect(uiHeroSource).not.toBe("");
    expect(uiHeroSource).toContain("export default function Globe3D");
    expect(uiHeroSource).toContain("motion.div");
    expect(uiHeroSource).toContain("visual: ReactNode");
    expect(uiHeroSource).toContain('data-landing-hero-orbit="true"');
    expect(uiHeroSource).toContain('data-landing-preview-stage="true"');
    expect(heroSource).toContain('from "@/components/ui/hero"');
    expect(heroSource).toContain("<DashboardPreview />");
    expect(pageSource).not.toContain("<ContainerScroll");
  });

  it("agrupa módulos em stages Liquid Glass", () => {
    expect(stageSources.match(/data-landing-glass-stage="true"/g)).toHaveLength(8);
    expect(pageSource).toContain('data-landing-tim-stage="true"');
    expect(pageSource).toContain('data-landing-final-cta="true"');
    expect(source("components/landing/feature-tabs.tsx")).toContain(
      'data-landing-profession-stage="true"',
    );
    expect(uiHeroSource).toContain('data-landing-preview-stage="true"');
    expect(source("components/landing/pricing.tsx")).toContain(
      'data-landing-pricing-stage="true"',
    );
    expect(source("components/landing/FaqAccordion.tsx")).toContain(
      'data-landing-faq-stage="true"',
    );
    expect(source("components/landing/about.tsx")).toContain(
      'data-landing-about-stage="true"',
    );
    expect(css).toContain(".landing-liquid-stage");
    expect(css).toContain(".landing-liquid-stage--soft");
  });

  it("oferece fallbacks acessíveis", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?\.landing-liquid-stage/,
    );
    expect(css).toMatch(
      /@media \(prefers-contrast: more\)[\s\S]*?\.landing-liquid-stage/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.landing-liquid-page/,
    );
  });
});
