"use client";

import * as React from "react";

type Feature = { title: string; description: string };
type Group = { label: string; features: Feature[] };
type Vertical = { key: string; tab: string; headline: string; groups: Group[] };

/**
 * O que cada profissão encontra no produto.
 *
 * A lista sai das rotas e integrações que existem de verdade — carteira, mapa,
 * DataJud, Evolution, Autentique, feed .ics, push — e não de promessa de
 * roadmap. Prometer o que não existe é o mesmo problema do mock infiel, só que
 * em texto.
 *
 * Sem grade de cards: os itens são linhas separadas por régua, agrupadas por
 * tema. Nove recipientes iguais empilhados diriam menos que a lista.
 */
const COMUM: Group = {
  label: "Em todas as profissões",
  features: [
    {
      title: "WhatsApp dentro do CRM",
      description:
        "Conecte seu número e responda sem sair do painel. A conversa fica ligada ao contato e à venda, com histórico importado e resposta automática opcional.",
    },
    {
      title: "Tim, seu sócio-assistente",
      description:
        "Resume o dia, aponta quem está travado e sugere o próximo passo. Entende sua carteira, aceita anexo e atende por voz em tempo real.",
    },
    {
      title: "Calendário interativo",
      description:
        "Compromissos, prazos e retornos numa agenda só — e um link para assinar no Google ou Apple Calendário, que atualiza sozinho.",
    },
    {
      title: "Lembretes que chegam no celular",
      description:
        "Notificação push antes de cada compromisso, com o app instalável direto do navegador. Você não depende de abrir o sistema para lembrar.",
    },
    {
      title: "Contatos e histórico",
      description:
        "Ficha com preferências, origem e tudo que já foi conversado. Importação por CSV para trazer sua base de onde ela estiver.",
    },
    {
      title: "Equipe com cargos",
      description:
        "Convide sócios e assistentes com o acesso certo: quem vê financeiro, quem gerencia casos, quem só registra atendimento.",
    },
  ],
};

const VERTICALS: Vertical[] = [
  {
    key: "autonomous_seller",
    tab: "Vendedor autônomo",
    headline: "Do primeiro contato ao pós-venda, sem planilha paralela.",
    groups: [
      {
        label: "Vender",
        features: [
          {
            title: "Funil visual por etapas",
            description:
              "Arraste cada negociação entre as etapas e veja onde o dinheiro está parado. Relatório de conversão, ciclo e motivo de perda no fim do mês.",
          },
          {
            title: "Catálogo de produtos",
            description:
              "Preço, estoque e garantia por item. O que está acabando aparece antes de faltar.",
          },
          {
            title: "Pedidos e confirmação de venda",
            description:
              "Registre o pedido, confirme o ganho e o valor entra no resultado do mês automaticamente.",
          },
          {
            title: "Pós-venda e garantias",
            description:
              "Acompanhe chamados e prazos de garantia para o cliente voltar, em vez de sumir depois da entrega.",
          },
        ],
      },
      {
        label: "Enxergar o negócio",
        features: [
          {
            title: "Painel que você monta",
            description:
              "Escolha quais indicadores aparecem e em que ordem. O painel é seu, não o mesmo para todo mundo.",
          },
          {
            title: "Resultado comercial",
            description:
              "Ticket médio, taxa de conversão, ciclo de vendas e origem dos leads calculados da sua própria carteira.",
          },
          {
            title: "Financeiro com importação",
            description:
              "Receitas e despesas em um lugar, com importação por CSV do que já está no seu banco ou planilha.",
          },
        ],
      },
    ],
  },
  {
    key: "law_office",
    tab: "Escritório de advocacia",
    headline: "Prazo, andamento e honorário no mesmo lugar.",
    groups: [
      {
        label: "Processos",
        features: [
          {
            title: "Consulta processual",
            description:
              "Busque pelo número no DataJud e traga partes, classe e histórico já preenchidos, sem redigitar nada.",
          },
          {
            title: "Acompanhamento em tempo real",
            description:
              "Marque os processos de interesse e receba a movimentação nova assim que ela sai — sem depender de olhar o diário.",
          },
          {
            title: "Casos com linha do tempo",
            description:
              "Cada caso guarda partes, área, responsável, andamentos e documentos, com o que mudou desde a última vez que você olhou.",
          },
          {
            title: "Movimentações para revisar",
            description:
              "Uma fila só do que chegou e ainda não foi lido, para nada passar batido entre uma audiência e outra.",
          },
        ],
      },
      {
        label: "Prazos",
        features: [
          {
            title: "Calculadora de prazo",
            description:
              "Conte em dias úteis ou corridos a partir da intimação, respeitando o tipo de contagem, e salve direto no caso.",
          },
          {
            title: "Calendário de prazos",
            description:
              "Tudo que vence hoje, na semana e no mês, separado por urgência e por responsável.",
          },
        ],
      },
      {
        label: "Escritório",
        features: [
          {
            title: "Documentos e assinatura",
            description:
              "Guarde as peças no caso e envie para assinatura eletrônica sem sair do sistema.",
          },
          {
            title: "Honorários e recebimentos",
            description:
              "Contratos, parcelas, o que venceu e o que entrou no mês — separado do valor que pertence ao cliente.",
          },
          {
            title: "Link de acompanhamento",
            description:
              "Compartilhe o andamento com o cliente por um link somente-leitura, sem precisar criar conta para ele.",
          },
        ],
      },
    ],
  },
  {
    key: "real_estate_broker",
    tab: "Corretor de imóveis",
    headline: "Carteira, visita e comissão sem perder o fio.",
    groups: [
      {
        label: "Carteira",
        features: [
          {
            title: "Mapa interativo",
            description:
              "Todos os imóveis sinalizados no mapa: você vê a concentração por bairro e responde na hora quem procura por região.",
          },
          {
            title: "Cadastro com fotos",
            description:
              "Foto de capa, reordenação por arraste e os dados que o cliente pergunta — metragem, vaga, condomínio.",
          },
          {
            title: "Busca em linguagem natural",
            description:
              "Peça “dois quartos até 600 mil no Sumaré” e o sistema filtra a carteira, sem você montar filtro campo por campo.",
          },
          {
            title: "Qualidade do anúncio",
            description:
              "O sistema aponta o que falta em cada imóvel para ele converter melhor antes de ir para o cliente.",
          },
        ],
      },
      {
        label: "Cliente",
        features: [
          {
            title: "Vitrines por link",
            description:
              "Monte uma seleção e mande um link: o cliente marca o que gostou, o que descartou e o que quer visitar, sem criar conta.",
          },
          {
            title: "Match imóvel e cliente",
            description:
              "Cruze o que o cliente procura com o que você tem na carteira e veja quem combina com a captação nova.",
          },
          {
            title: "Agenda de visitas",
            description:
              "Solicitação, confirmação e histórico, com lembrete automático disparado antes de cada visita.",
          },
          {
            title: "Propostas em PDF",
            description:
              "Gere a proposta pronta para enviar, com os dados do imóvel e as condições já preenchidas.",
          },
        ],
      },
      {
        label: "Resultado",
        features: [
          {
            title: "Comissões e metas",
            description:
              "Previsto, recebido e vencido por período, com meta da equipe inteira ou de cada corretor.",
          },
        ],
      },
    ],
  },
];

function FeatureList({ group }: { group: Group }) {
  return (
    <div className="min-w-0">
      <p className="text-od-label text-od-text-3">{group.label}</p>
      <ul className="mt-3 divide-y divide-od-border border-t border-od-border">
        {group.features.map((feature) => (
          <li key={feature.title} className="py-4">
            <p className="text-[15px] font-semibold text-od-text">{feature.title}</p>
            <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-od-text-2">{feature.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeatureTabs() {
  const [activeKey, setActiveKey] = React.useState(VERTICALS[2].key);
  const vertical = VERTICALS.find((item) => item.key === activeKey) ?? VERTICALS[2];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Escolha a profissão"
        className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-b border-od-border pb-3"
      >
        {VERTICALS.map((item) => {
          const selected = item.key === vertical.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveKey(item.key)}
              className={`relative pb-2 text-[14px] font-semibold transition-colors ${
                selected ? "text-od-text" : "text-od-text-3 hover:text-od-text-2"
              }`}
            >
              {item.tab}
              {selected ? (
                <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] rounded bg-od-accent" />
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-[560px] text-center text-od-subtitle text-od-text">{vertical.headline}</p>

      <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {vertical.groups.map((group) => (
          <FeatureList key={group.label} group={group} />
        ))}
        <FeatureList group={COMUM} />
      </div>
    </div>
  );
}
