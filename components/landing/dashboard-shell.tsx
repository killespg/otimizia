import * as React from "react";
import { Bell, Check, Clock, MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileTabBar } from "./mobile-tab-bar";
import { LogoMark } from "@/components/design-system/logo";

const navItems = [
  "Dashboard",
  "Contatos",
  "Funil de vendas",
  "Lembretes",
  "Sócio-Assistente",
];

const dashboardMetrics = [
  { icon: MessageCircle, label: "Conversas", value: "87", note: "+12% desde ontem" },
  { icon: Check, label: "Vendas ganhas", value: "34", note: "+8% desde ontem" },
  { icon: Clock, label: "Lembretes hoje", value: "5", note: "2 atrasados" },
];

/** Dark sidebar nav with a quiet shared active state. Desktop only; mobile gets MobileTabBar instead. */
export function Sidebar({ active = "Dashboard" }: { active?: string }) {
  return (
    <div className="hidden w-[180px] shrink-0 flex-col gap-0.5 bg-[#120f1c] px-4 py-5 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <LogoMark size={20} className="shrink-0" />
        <span className="text-[15px] font-extrabold text-white">OtimizIA</span>
      </div>
      {navItems.map((item) => (
        <div
          key={item}
          className={cn(
            "rounded-none px-2.5 py-2.5 text-[13px] font-medium text-white/45",
            item === active && "bg-white/[0.075] font-semibold text-white"
          )}
        >
          {item}
        </div>
      ))}
      <div className="mt-auto px-2.5 py-2.5 text-[13px] font-medium text-white/30">
        Configurações
      </div>
    </div>
  );
}

/**
 * Topbar — search field + notification bell + avatar, on the same dark
 * canvas as the content. `showTrigger` renders the sidebar collapse button
 * (only valid inside a SidebarProvider — leave off for the standalone
 * preview-card DashboardShell, which has no provider).
 */
export function Topbar() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-white/[0.12] py-2 md:w-64 md:flex-none">
          <Search className="size-3.5 shrink-0 text-white/40" strokeWidth={2} />
          <span className="truncate text-[13px] text-white/40">Buscar cliente ou venda</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative">
          <div className="flex size-11 items-center justify-center border-l border-white/[0.06]">
            <Bell className="size-4 text-white/50" strokeWidth={2} />
          </div>
          <div className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-[#171320] bg-od-accent" />
        </div>
        <div className="flex size-8 items-center justify-center rounded-full bg-od-accent text-xs font-bold text-white">
          JS
        </div>
      </div>
    </div>
  );
}

/**
 * Full dashboard shell: one always-dark work surface with a sidebar and a
 * divided metric band. On mobile the band becomes a readable sequence and
 * the sidebar is replaced by a bottom MobileTabBar.
 */
export function DashboardShell() {
  return (
    <div className="relative flex h-full overflow-hidden rounded-xl border border-white/[0.08] bg-od-bg">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <div className="grid grid-cols-1 divide-y divide-white/[0.07] border-y border-white/[0.07] pb-24 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:pb-0">
          {dashboardMetrics.map(({ icon: Icon, label, value, note }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-5">
              <Icon className="size-4 shrink-0 text-od-accent" strokeWidth={2} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{value}</span>
                  <span className="text-[12px] font-medium text-white/65">{label}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/50">{note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-0 border-b border-white/[0.07] md:grid-cols-[1.4fr_1fr] md:divide-x md:divide-white/[0.07]">
          <div className="px-5 py-5">
            <p className="text-[11px] font-medium text-white/45">Funil desta semana</p>
            <div className="mt-4 flex items-end gap-1.5" aria-hidden="true">
              {[38, 52, 44, 68, 59, 81, 72].map((height, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-sm ${index === 5 ? "bg-od-accent" : "bg-white/[0.13]"}`}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-white/35">
              <span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span><span>dom</span>
            </div>
          </div>
          <div className="px-5 py-5">
            <p className="text-[11px] font-medium text-white/45">Quem chamar hoje</p>
            <ul className="mt-3 divide-y divide-white/[0.07]">
              {[
                { name: "Marina Alves", note: "Proposta enviada", tone: "atrasado" },
                { name: "Rafael Souza", note: "Retorno combinado", tone: "hoje" },
                { name: "Studio Nova", note: "Aguardando contrato", tone: "hoje" },
              ].map((item) => (
                <li key={item.name} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/70">
                    {item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-white">{item.name}</span>
                    <span className="block truncate text-[10px] text-white/45">{item.note}</span>
                  </span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.tone === "atrasado" ? "bg-[#fb7767]/12 text-[#fca79b]" : "bg-white/[0.07] text-white/60"}`}>
                    {item.tone === "atrasado" ? "Atrasado" : "Hoje"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
