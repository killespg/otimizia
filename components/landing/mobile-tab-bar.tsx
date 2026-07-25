import * as React from "react";
import { Bot, Filter, LayoutGrid, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Contatos", icon: User },
  { label: "Funil", icon: Filter },
  { label: "Lembretes", icon: Clock },
  { label: "Sócio-Assistente", icon: Bot },
];

/**
 * Bottom tab bar — replaces the sidebar as primary navigation on mobile.
 * `anchor="absolute"` (default) sticks to the bottom of its positioned
 * ancestor, for confining it inside a preview mockup card. `anchor="fixed"`
 * pins it to the real viewport, for actual full-page screens. Each tab is a
 * full 44px+ touch target with icon + label, safe-area aware for notched
 * phones.
 */
export function MobileTabBar({
  active = "Dashboard",
  anchor = "absolute",
}: {
  active?: string;
  anchor?: "absolute" | "fixed";
}) {
  return (
    <nav
      className={cn(
        "z-40 inset-x-0 bottom-0 flex items-stretch justify-around border-t border-white/[0.06] bg-[#120f1c] pb-[env(safe-area-inset-bottom)] md:hidden",
        anchor
      )}
      aria-label="Navegação principal"
    >
      {tabs.map(({ label, icon: Icon }) => {
        const isActive = label === active;
        return (
          <button
            key={label}
            type="button"
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium",
              isActive ? "text-white" : "text-[#a39da8]"
            )}
          >
            <Icon
              className="size-5"
              strokeWidth={2}
              style={{ color: isActive ? "var(--od-accent)" : undefined }}
            />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
