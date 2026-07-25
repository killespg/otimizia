import * as React from "react";
import { Bot, Filter, Clock } from "lucide-react";
import { Panel } from "./panel";

const features = [
  {
    icon: Filter,
    title: "Funil de vendas visual",
    description: "Veja cada negociação do primeiro contato até o fechamento, sem precisar cavar conversa antiga.",
  },
  {
    icon: Clock,
    title: "Lembretes que não deixam soltar o fio",
    description: "Prioridade clara pra cada tarefa — você sempre sabe quem chamar primeiro.",
  },
  {
    icon: Bot,
    title: "Sócio-Assistente",
    description: "Resume o dia, aponta oportunidades e sugere o próximo passo direto no painel.",
  },
];

/** Grid de benefícios — 3 cards com ícone, usado na landing. */
export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {features.map(({ icon: Icon, title, description }) => (
        <Panel key={title} className="p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-[10px] bg-od-accent-tint">
            <Icon className="size-5 text-od-accent" strokeWidth={2} />
          </div>
          <h3 className="mb-1.5 text-od-subtitle text-od-text">{title}</h3>
          <p className="text-sm leading-relaxed text-od-text-2">{description}</p>
        </Panel>
      ))}
    </div>
  );
}
