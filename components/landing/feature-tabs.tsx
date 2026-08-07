"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  Bot,
  CalendarDays,
  CalendarRange,
  Calculator,
  ClipboardList,
  Contact,
  FileSignature,
  FileText,
  Gavel,
  Handshake,
  Images,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  Package,
  RadioTower,
  Receipt,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; description: string };
type Group = { label: string; features: Feature[] };
/** O que o Tim faz nesta profissão, com ordens de verdade que a pessoa daria. */
type Tim = { line: string; examples: string[] };
type Vertical = {
  key: string;
  tab: string;
  mobileTab: string;
  headline: string;
  tim: Tim;
  groups: Group[];
};

/**
 * O que cada profissão encontra no produto.
 *
 * A lista sai das rotas e integrações que existem de verdade — carteira, mapa,
 * DataJud, Evolution, Autentique, feed .ics, push — e não de promessa de
 * roadmap.
 *
 * Sem grade de cards: cada item é ícone, título e uma linha. A primeira versão
 * tirou os cards e não pôs nada no lugar, e virou parede de texto — 2200
 * caracteres cinzas sem nenhuma âncora visual.
 */
/**
 * Tim aparece dentro de cada vertical, não em "Em todas", porque o que ele
 * consegue fazer muda por profissão.
 *
 * ATENÇÃO ao mexer aqui: hoje só o imobiliário e o de vendas correspondem ao
 * código. As tools em `lib/ai/tools/` cobrem contato, negociação, tarefa e
 * imóvel; nenhuma enxerga caso, processo ou prazo. A linha do jurídico está
 * escrita para o comportamento que ainda vai ser implementado, por decisão do
 * dono do produto (o próximo passo é fazer o Tim falar cada profissão). Se a
 * implementação mudar de forma, ajuste a copy junto.
 */
const COMUM: Feature[] = [
  { icon: MessageCircle, title: "WhatsApp que responde sozinho", description: "A IA atende na hora e você assume a conversa quando quiser." },
  { icon: CalendarDays, title: "Calendário interativo", description: "Assine no Google ou Apple por um link que atualiza sozinho." },
  { icon: Bell, title: "Lembrete no celular", description: "Notificação antes do compromisso, com app instalável." },
  { icon: Contact, title: "Contatos e histórico", description: "Ficha completa e importação por CSV da sua base atual." },
  { icon: Users, title: "Equipe com cargos", description: "Cada pessoa vê só o que o cargo dela permite." },
];

const VERTICALS: Vertical[] = [
  {
    key: "autonomous_seller",
    tab: "Vendedor autônomo",
    mobileTab: "Vendas",
    headline: "Do primeiro contato ao pós-venda, sem planilha paralela.",
    tim: {
      line: "Fale por voz ou escreva. Ele não devolve conselho: cria o contato, abre a negociação e move no funil enquanto você está na rua.",
      examples: [
        "Cadastra o João e abre negociação de R$ 4.200",
        "Move o negócio da Carla pra proposta",
        "Cria tarefa de retorno pra sexta",
      ],
    },
    groups: [
      {
        label: "Vender",
        features: [
          { icon: TrendingUp, title: "Funil visual", description: "Arraste a negociação entre etapas e veja onde o dinheiro parou." },
          { icon: Package, title: "Catálogo com estoque", description: "Preço, quantidade e garantia; o que está acabando aparece antes." },
          { icon: ClipboardList, title: "Pedidos", description: "Confirme a venda e o valor entra no resultado do mês." },
          { icon: Truck, title: "Pós-venda e garantias", description: "Chamados e prazos acompanhados para o cliente voltar." },
        ],
      },
      {
        label: "Enxergar o negócio",
        features: [
          { icon: LayoutDashboard, title: "Painel que você monta", description: "Escolha quais indicadores aparecem e em que ordem." },
          { icon: Target, title: "Resultado comercial", description: "Ticket médio, conversão, ciclo e origem dos leads." },
          { icon: Wallet, title: "Financeiro", description: "Receitas e despesas num lugar, com importação por CSV." },
        ],
      },
    ],
  },
  {
    key: "law_office",
    tab: "Escritório de advocacia",
    mobileTab: "Advocacia",
    headline: "Prazo, andamento e honorário no mesmo lugar.",
    tim: {
      line: "Fale por voz ou escreva. Ele abre o caso, registra o andamento e cria a tarefa do prazo sem você parar o que está fazendo.",
      examples: [
        "Abre o caso da Ana e registra a audiência",
        "Cria tarefa de prazo pra sexta",
        "Resume o que mudou nos processos essa semana",
      ],
    },
    groups: [
      {
        label: "Processos",
        features: [
          { icon: Search, title: "Consulta processual", description: "Busque no DataJud e traga partes e histórico preenchidos." },
          { icon: RadioTower, title: "Acompanhamento em tempo real", description: "Movimentação nova dos processos de interesse, assim que sai." },
          { icon: Gavel, title: "Casos com linha do tempo", description: "Partes, área, responsável e o que mudou desde a última vez." },
          { icon: ClipboardList, title: "Fila de movimentações", description: "Só o que chegou e ainda não foi lido, sem passar batido." },
        ],
      },
      {
        label: "Prazos",
        features: [
          { icon: Calculator, title: "Calculadora de prazo", description: "Dias úteis ou corridos a partir da intimação, salvo no caso." },
          { icon: CalendarRange, title: "Calendário de prazos", description: "O que vence hoje, na semana e no mês, por responsável." },
        ],
      },
      {
        label: "Escritório",
        features: [
          { icon: FileSignature, title: "Documentos e assinatura", description: "Peças no caso e envio para assinatura eletrônica." },
          { icon: Receipt, title: "Honorários", description: "Contratos e parcelas, separados do valor que é do cliente." },
          { icon: Share2, title: "Link de acompanhamento", description: "Cliente vê o andamento sem precisar criar conta." },
        ],
      },
    ],
  },
  {
    key: "real_estate_broker",
    tab: "Corretor de imóveis",
    mobileTab: "Imóveis",
    headline: "Carteira, visita e comissão sob controle.",
    tim: {
      line: "Fale por voz ou escreva. Ele busca na carteira, monta a vitrine e agenda a visita, inclusive dentro do carro entre um atendimento e outro.",
      examples: [
        "Quais imóveis batem com o perfil da Carla?",
        "Monta uma vitrine com esses três",
        "Agenda visita no apartamento do Sumaré sexta às 15h",
      ],
    },
    groups: [
      {
        label: "Carteira",
        features: [
          { icon: MapPinned, title: "Mapa interativo", description: "Todos os imóveis sinalizados; responda por região na hora." },
          { icon: Images, title: "Cadastro com fotos", description: "Capa, reordenação por arraste e os dados que o cliente pergunta." },
          { icon: Sparkles, title: "Busca em linguagem natural", description: "Peça “2 quartos até 600 mil no Sumaré” e a carteira filtra." },
          { icon: BadgeCheck, title: "Qualidade do anúncio", description: "O sistema aponta o que falta para o imóvel converter melhor." },
        ],
      },
      {
        label: "Cliente",
        features: [
          { icon: Share2, title: "Vitrines por link", description: "O cliente marca o que gostou e o que quer visitar, sem conta." },
          { icon: Handshake, title: "Match imóvel e cliente", description: "Cruze o que ele procura com o que entrou na carteira." },
          { icon: CalendarDays, title: "Agenda de visitas", description: "Solicitação, confirmação e lembrete automático antes." },
          { icon: FileText, title: "Propostas em PDF", description: "Proposta pronta com imóvel e condições preenchidos." },
        ],
      },
      {
        label: "Resultado",
        features: [
          { icon: Wallet, title: "Comissões e metas", description: "Previsto, recebido e vencido, por corretor ou pela equipe." },
          { icon: ShieldCheck, title: "Carteira sempre atual", description: "Vitrine pública reflete o que está ativo, sem retrabalho." },
        ],
      },
    ],
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      className="flex min-w-0 gap-3 py-3.5"
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 5) * 0.045 }}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-od-accent/12 text-od-accent-hover">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-od-text">{feature.title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-od-text-2">{feature.description}</span>
      </span>
    </motion.div>
  );
}

export function FeatureTabs() {
  const [activeKey, setActiveKey] = React.useState(VERTICALS[2].key);
  const vertical = VERTICALS.find((item) => item.key === activeKey) ?? VERTICALS[2];

  return (
    <div>
      {/* Controle segmentado: a versão anterior usava texto solto com um fio de
          2px embaixo, que não lia como algo clicável. */}
      <div
        role="tablist"
        aria-label="Escolha a profissão"
        className="mx-auto flex max-w-[620px] gap-1 rounded-full border border-od-border bg-od-muted-surface p-1"
      >
        {VERTICALS.map((item) => {
          const selected = item.key === vertical.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-label={item.tab}
              aria-selected={selected}
              onClick={() => setActiveKey(item.key)}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-2 text-[13px] font-semibold transition-colors sm:px-3 ${
                selected ? "bg-od-accent text-white" : "text-od-text-3 hover:text-od-text-2"
              }`}
            >
              <span className="sm:hidden" aria-hidden>{item.mobileTab}</span>
              <span className="hidden sm:inline" aria-hidden>{item.tab}</span>
            </button>
          );
        })}
      </div>

      <p className="lp-h3 mx-auto mt-7 max-w-[36ch] text-balance text-center text-od-text">
        {vertical.headline}
      </p>

      {/* Sem régua entre os grupos. Eram cinco traços horizontais idênticos
          empilhados, e a regra 4a diz que separação repetida no vidro vem do
          material: o rótulo em maiúsculas, o espaço e a faixa do Tim já dizem
          onde um grupo termina. */}
      <div className="mt-[clamp(32px,4vw,52px)] space-y-[clamp(28px,3vw,40px)]">
        {/* O Tim é a peça central do produto, então não pode dividir peso com
            "Honorários" numa lista de dez. Ganha `.od-band` — o plano próprio
            que o sistema usa para destacar uma região sem virar card. */}
        <div className="od-band grid gap-x-8 gap-y-5 p-5 sm:p-7 md:grid-cols-[150px_minmax(0,1fr)]">
          <p className="text-od-label text-od-accent-hover">Sócio-assistente</p>
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-od-accent text-white">
                <Bot className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="lp-h3 text-od-text">Tim, o sócio-assistente</p>
                <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-od-text-2">
                  {vertical.tim.line}
                </p>
              </div>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2.5 md:pl-15">
              {vertical.tim.examples.map((example) => (
                <li
                  key={example}
                  className="rounded-full border border-od-border px-3.5 py-2 text-[13px] leading-relaxed text-od-text-2"
                >
                  “{example}”
                </li>
              ))}
            </ul>
          </div>
        </div>

        {vertical.groups.map((group) => (
          <div key={group.label} className="grid gap-x-8 md:grid-cols-[150px_minmax(0,1fr)]">
            <p className="pt-3.5 text-od-label text-od-text-3">{group.label}</p>
            <div className="grid gap-x-8 sm:grid-cols-2 2xl:grid-cols-3">
              {group.features.map((feature, index) => (
                <FeatureRow key={feature.title} feature={feature} index={index} />
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-x-8 md:grid-cols-[150px_minmax(0,1fr)]">
          <div className="pt-3.5">
            <p className="text-od-label text-od-text-3">Em todas</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-od-text-3">
              Vale para as três profissões.
            </p>
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2 2xl:grid-cols-3">
            {COMUM.map((feature, index) => (
              <FeatureRow key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
