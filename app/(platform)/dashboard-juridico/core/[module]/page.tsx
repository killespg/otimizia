import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarDays, Contact, KanbanSquare, ListTodo, MessageCircle, Users } from "lucide-react";
import { AssistantModule, CalendarModule, ContactsModule, PipelineModule, TasksModule, TeamModule, WhatsAppModule } from "@/components/platform/core-modules";
import { getProfessionPreset, normalizeProfession } from "@/lib/professions";

const modules = {
  funil: { label: "Funil", title: "Atendimentos e oportunidades", icon: KanbanSquare },
  whatsapp: { label: "WhatsApp", title: "Central de conversas", icon: MessageCircle },
  calendario: { label: "Calendário", title: "Agenda compartilhada", icon: CalendarDays },
  tarefas: { label: "Tarefas", title: "Tarefas e lembretes", icon: ListTodo },
  contatos: { label: "Contatos", title: "Contatos do workspace", icon: Contact },
  equipe: { label: "Equipe", title: "Equipe e acessos", icon: Users },
  assistente: { label: "Assistente", title: "Assistente contextual", icon: Bot },
} as const;

type ModuleKey = keyof typeof modules;

export default async function CoreModulePage(
  props: {
    params: Promise<{ module: string }>;
    searchParams: Promise<{ workspace?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!(params.module in modules)) notFound();
  const moduleKey = params.module as ModuleKey;
  const workspace = normalizeProfession(searchParams.workspace);
  const preset = getProfessionPreset(workspace);
  const current = modules[moduleKey];
  const labels = {
    contacts: preset.contactsTitle,
    pipeline: preset.pipelineLabel,
    singular: preset.dealSingular,
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-5 pb-24 pt-8 md:px-8">
      <header className="flex flex-col gap-6 border-b border-white/[0.08] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] text-white/28">{preset.shortLabel} / Plataforma</p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-white/88">{current.title}</h1>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-white/32">
            Um módulo compartilhado do OtimizIA, com linguagem e contexto adaptados para {preset.shortLabel.toLowerCase()}.
          </p>
        </div>
        <Link href={workspace === "law_office" ? "/painel/juridico" : `/painel/workspaces/${workspace}`} className="text-[10px] text-od-text-2/60 hover:text-od-accent">
          Voltar ao painel
        </Link>
      </header>

      <nav aria-label="Módulos da plataforma" className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-white/[0.08]">
        {(Object.entries(modules) as [ModuleKey, (typeof modules)[ModuleKey]][]).map(([key, item]) => {
          const Icon = item.icon;
          const active = key === moduleKey;
          return <Link key={key} href={`/painel/juridico/core/${key}?workspace=${workspace}`} className={`inline-flex h-12 shrink-0 items-center gap-2 border-b px-4 text-[10px] ${active ? "border-od-accent text-od-accent" : "border-transparent text-white/30 hover:text-white/62"}`}><Icon size={13} />{item.label}</Link>;
        })}
      </nav>

      {moduleKey === "whatsapp" ? <WhatsAppModule /> : null}
      {moduleKey === "calendario" ? <CalendarModule /> : null}
      {moduleKey === "tarefas" ? <TasksModule labels={labels} /> : null}
      {moduleKey === "funil" ? <PipelineModule labels={labels} /> : null}
      {moduleKey === "contatos" ? <ContactsModule labels={labels} /> : null}
      {moduleKey === "equipe" ? <TeamModule /> : null}
      {moduleKey === "assistente" ? <AssistantModule expertise={preset.expertiseArea} /> : null}
    </main>
  );
}

