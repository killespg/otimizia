import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import type { ProfessionPreset } from "@/lib/people/professions";
import { dismissChecklist } from "../../actions";
import {
  IconBell,
  IconBot,
  IconCheckCircle,
  IconColumns,
  IconSettings,
  IconUsers,
  IconX,
} from "../../icons";

export function OnboardingChecklist({
  preset,
  isOrgAdmin,
  done,
}: {
  preset: ProfessionPreset;
  isOrgAdmin: boolean;
  done: {
    contact: boolean;
    deal: boolean;
    task: boolean;
    businessContext: boolean;
    assistant: boolean;
    team: boolean;
  };
}) {
  const steps = [
    {
      key: "contact",
      title: preset.firstSteps[0],
      desc: "Comece com quem você está atendendo agora.",
      href: "/painel/contatos",
      icon: IconUsers,
      done: done.contact,
    },
    {
      key: "deal",
      title: preset.firstSteps[1],
      desc: "Anote valor, etapa e próximo passo.",
      href: "/painel/funil",
      icon: IconColumns,
      done: done.deal,
    },
    {
      key: "task",
      title: preset.firstSteps[2],
      desc: "Escolha quando chamar o cliente de novo.",
      href: "/painel/tarefas",
      icon: IconBell,
      done: done.task,
    },
    {
      key: "assistant",
      title: "Converse com o assistente",
      desc: "Pergunte algo sobre seu negócio ou peça pra criar um contato.",
      href: "/painel/assistente",
      icon: IconBot,
      done: done.assistant,
    },
    ...(isOrgAdmin
      ? [
          {
            key: "context",
            title: "Configure o contexto da empresa",
            desc: "Conte o que a empresa faz — a IA usa isso em tudo que responde.",
            href: "/painel/equipe",
            icon: IconSettings,
            done: done.businessContext,
          },
          {
            key: "team",
            title: "Convide um colega de equipe",
            desc: "Traga quem também vende ou atende junto com você.",
            href: "/painel/equipe",
            icon: IconUsers,
            done: done.team,
          },
        ]
      : []),
  ];

  if (steps.every((step) => step.done)) return null;

  return (
    <section className="enter relative rounded-md border border-brand-200 bg-brand-50 p-5">
      <form action={dismissChecklist} className="absolute right-3 top-3">
        <PendingButton
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-od-text-3 hover:bg-od-surface/60 hover:text-od-text"
          aria-label="Fechar painel de primeiros passos"
          iconOnly
          pendingLabel="Fechando"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </PendingButton>
      </form>

      <p className="text-sm font-black text-brand-800">Primeiros passos</p>
      <h2 className="mt-2 max-w-lg text-2xl font-black tracking-[-0.03em] text-od-text">
        Deixe seu painel pronto pra valer.
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={
                "row-link relative rounded-md border p-4 " +
                (step.done
                  ? "border-success-200 bg-od-surface/70"
                  : "border-brand-200 bg-od-surface hover:border-brand-400")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className={"h-6 w-6 " + (step.done ? "text-success-600" : "text-brand-700")} />
                {step.done && <IconCheckCircle className="h-5 w-5 text-success-600" />}
              </div>
              <p
                className={
                  "mt-4 text-sm font-black " +
                  (step.done ? "text-od-text-3 line-through" : "text-od-text")
                }
              >
                {step.title}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-od-text-3">
                {step.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
