import type { DashboardWidgetKey } from "@/lib/workspace/dashboard-preferences";
import type { ProfessionPreset } from "@/lib/people/professions";
import { DEAL_STAGES, type Contact, type DealStage, type Task } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils/format";

export type ContactOption = Pick<Contact, "id" | "name" | "company" | "source">;

export type CalendarItem = {
  date: Date;
  title: string;
  href: string;
  tone: "danger" | "warning" | "brand";
};

const DASHBOARD_GREETINGS: Record<ProfessionPreset["key"], string> = {
  autonomous_seller: "Bora olhar os clientes quentes e destravar os próximos fechamentos.",
  law_office: "Triagens, propostas e retornos em ordem para o escritório respirar melhor.",
  real_estate_broker: "Vamos cuidar dos leads, visitas e propostas que podem virar negócio.",
  service_provider: "Pedidos, orçamentos e agenda alinhados para o serviço fluir.",
  consultant: "Hora de acompanhar propostas, diagnósticos e próximos passos com clareza.",
  freelancer: "Projetos, prazos e aprovações no radar para nada escapar.",
  livestock_producer: "Lotes, compradores e retornos organizados para tocar a pecuária.",
  small_business: "Pedidos, clientes e recompra no ponto para vender com mais ritmo.",
  other: "Seu painel está pronto para organizar contatos, oportunidades e retornos.",
  founder: "Acompanhe sua prospecção e as métricas do produto num só lugar.",
};

export function widgetShellClass(widget: DashboardWidgetKey) {
  if (widget === "metrics" || widget === "onboarding" || widget === "open_claims") {
    return "min-w-0 xl:col-span-12";
  }
  if (widget === "chart" || widget === "deals") return "min-w-0 xl:col-span-8";
  return "min-w-0 xl:col-span-4";
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function percentChange(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}%`;
}

export function countChange(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const change = current - previous;
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}`;
}

export function pointsChange(current: number, previous: number): string | undefined {
  const change = current - previous;
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}pp`;
}

export function calendarToneClass(tone: CalendarItem["tone"]) {
  if (tone === "danger") return "text-danger-600";
  if (tone === "warning") return "text-warning-700";
  return "text-brand-700";
}

export function stageMeta(stage: DealStage, preset: ProfessionPreset) {
  const label = preset.stages[stage]?.label ?? DEAL_STAGES.find((item) => item.key === stage)?.label ?? "Etapa";
  const map: Record<DealStage, string> = {
    novo: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    em_contato: "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
    negociacao: "bg-warning-50 text-warning-700",
    ganho: "bg-success-50 text-success-700",
    perdido: "bg-danger-50 text-danger-700",
  };

  return {
    label,
    className: map[stage],
  };
}

export function taskPriority(task: Task, overdue: Task[], index: number) {
  if (overdue.some((item) => item.id === task.id) || index === 0) {
    return {
      label: "Alta",
      className: "bg-danger-50 text-danger-700",
    };
  }
  if (index === 1) {
    return {
      label: "Média",
      className: "bg-warning-50 text-warning-700",
    };
  }
  return {
    label: "Baixa",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
  };
}

export function dueLabel(iso: string, now: Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const today = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today) return `Hoje, ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Amanhã, ${time}`;
  return `${formatDate(iso)}, ${time}`;
}

export function defaultDateTimeValue(now: Date) {
  const value = new Date(now);
  value.setDate(value.getDate() + 1);
  value.setHours(10, 30, 0, 0);
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function firstName(value: string) {
  const clean = value.trim();
  if (!clean) return "João";
  return clean.split(/\s+/)[0];
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JS";
}

export function dashboardGreeting(
  preset: ProfessionPreset,
  state: { overdueCount: number; todayCount: number; isFirstRun: boolean }
) {
  if (state.isFirstRun) {
    return `Comece pela área de ${preset.signupLabel}: cadastre um contato, crie um ${preset.dealSingular} e deixe um lembrete.`;
  }

  if (state.overdueCount > 0) {
    return `${state.overdueCount} ${state.overdueCount === 1 ? "retorno atrasado" : "retornos atrasados"} pedindo atenção na área de ${preset.signupLabel}.`;
  }

  if (state.todayCount > 0) {
    return `${state.todayCount} ${state.todayCount === 1 ? "lembrete" : "lembretes"} para hoje. Um bom dia para avançar ${preset.dealPlural}.`;
  }

  return DASHBOARD_GREETINGS[preset.key];
}
