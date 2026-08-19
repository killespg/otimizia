import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/(auth)/actions", () => ({
  logout: vi.fn(),
}));

import { ProductShellTopbar } from "@/components/design-system/product-shell-topbar";
import * as topbarModule from "@/components/design-system/product-shell-topbar";

describe("ProductShellTopbar notifications", () => {
  it("uses the notification bell as an accessible popover trigger", () => {
    const html = renderToStaticMarkup(
      createElement(ProductShellTopbar, {
        displayName: "Ana Silva",
        initials: "AS",
        variant: "generic",
        notificationCount: 3,
      }),
    );

    expect(html).toContain('aria-label="Abrir notificações: 3 pendentes"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders an honest notification summary with its real destination", () => {
    const NotificationPopoverPanel = Reflect.get(
      topbarModule,
      "NotificationPopoverPanel",
    ) as
      | ComponentType<{
          destination: string;
          notificationCount: number;
          reduceMotion: boolean;
        }>
      | undefined;

    expect(NotificationPopoverPanel).toBeTypeOf("function");
    if (!NotificationPopoverPanel) return;

    const html = renderToStaticMarkup(
      createElement(NotificationPopoverPanel, {
        destination: "/painel/tarefas",
        notificationCount: 3,
        reduceMotion: false,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("3 notificações pendentes");
    expect(html).toContain('href="/painel/tarefas"');
    expect(html).toContain("Ver todas as notificações");
  });

  it("shows an honest empty state when there are no pending notifications", () => {
    const NotificationPopoverPanel = Reflect.get(
      topbarModule,
      "NotificationPopoverPanel",
    ) as
      | ComponentType<{
          destination: string;
          notificationCount: number;
          reduceMotion: boolean;
        }>
      | undefined;

    expect(NotificationPopoverPanel).toBeTypeOf("function");
    if (!NotificationPopoverPanel) return;

    const html = renderToStaticMarkup(
      createElement(NotificationPopoverPanel, {
        destination: "/painel/tarefas",
        notificationCount: 0,
        reduceMotion: true,
      }),
    );

    expect(html).toContain("Nenhuma notificação pendente");
    expect(html).not.toContain("0 notificações pendentes");
  });
});
