import type Anthropic from "@anthropic-ai/sdk";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_ACCENTS,
  DASHBOARD_STYLES,
  DASHBOARD_WIDGETS,
} from "@/lib/dashboard-preferences";
import { STAGE_KEYS } from "./validation";

// Ferramentas que espelham tudo que o usuário pode fazer no OtimizIA.
// Cada execução usa o client Supabase da sessão do usuário, então o RLS
// garante que a IA só enxerga e altera dados da organização ativa do usuário,
// dentro da área de atuação (workspace) selecionada.

export const CRM_TOOLS: Anthropic.Tool[] = [
  // ---------- Leitura ----------
  {
    name: "list_contacts",
    description:
      "Lista os contatos do usuário. Use 'busca' para filtrar por nome, e-mail, telefone ou empresa. Sempre consulte antes de afirmar algo sobre contatos.",
    input_schema: {
      type: "object",
      properties: {
        busca: { type: "string", description: "Texto para filtrar (opcional)" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 20)" },
      },
    },
  },
  {
    name: "get_contact",
    description:
      "Retorna os detalhes completos de um contato: dados cadastrais, vendas, lembretes e últimas conversas registradas. Use quando o usuário perguntar sobre um contato específico.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "list_deals",
    description:
      "Lista as vendas (negócios) do funil. Filtre por etapa se precisar. Etapas: novo, em_contato, negociacao (Proposta), ganho, perdido.",
    input_schema: {
      type: "object",
      properties: {
        etapa: {
          type: "string",
          enum: STAGE_KEYS,
          description: "Filtrar por etapa do funil (opcional)",
        },
      },
    },
  },
  {
    name: "list_tasks",
    description:
      "Lista os lembretes/tarefas do usuário. Filtros: 'abertos' (padrão), 'concluidos', 'atrasados' ou 'hoje'.",
    input_schema: {
      type: "object",
      properties: {
        filtro: {
          type: "string",
          enum: ["abertos", "concluidos", "atrasados", "hoje"],
          description: "Qual recorte listar (padrão: abertos)",
        },
      },
    },
  },
  {
    name: "get_business_summary",
    description:
      "Resumo geral do negócio: total de contatos, valor do funil por etapa, vendas ganhas no mês e lembretes pendentes/atrasados. Use para perguntas do tipo 'como está meu negócio?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_workspace_customization",
    description:
      "Mostra como o CRM e o painel do usuário estão personalizados agora: estilo, cor, widgets, métricas, nomes dos blocos e labels do workspace. Use antes de mudar aparência, dashboard ou preferências.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_properties",
    description:
      "Busca imóveis da carteira (só disponível no workspace imobiliário). Filtre por bairro, tipo, transação, preço máximo e quartos mínimos. Por padrão retorna só imóveis com status 'ativo'.",
    input_schema: {
      type: "object",
      properties: {
        bairro: { type: "string", description: "Filtrar por bairro (busca parcial)" },
        tipo_imovel: {
          type: "string",
          enum: ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"],
        },
        tipo_transacao: { type: "string", enum: ["venda", "aluguel", "venda_aluguel"] },
        preco_max_reais: { type: "number", description: "Preço máximo em reais" },
        quartos_min: { type: "integer", description: "Mínimo de quartos" },
        status: {
          type: "string",
          enum: ["rascunho", "ativo", "reservado", "vendido", "alugado", "inativo"],
          description: "Padrão: ativo",
        },
        limite: { type: "integer", description: "Máximo de resultados (padrão 20)" },
      },
    },
  },
  {
    name: "get_property",
    description:
      "Retorna os detalhes completos de um imóvel: dados, fotos (em ordem) e campos que a IA sugeriu e ainda aguardam confirmação humana.",
    input_schema: {
      type: "object",
      properties: {
        imovel_id: { type: "string", description: "ID do imóvel" },
      },
      required: ["imovel_id"],
    },
  },

  // ---------- Escrita ----------
  {
    name: "create_contact",
    description:
      "Cria um novo contato. Somente 'nome' é obrigatório. Antes de criar, verifique com list_contacts se já não existe um contato parecido para evitar duplicados. Use 'detalhes' para os campos extras da profissão do usuário (ex: bairro, orçamento, tipo de cliente) — eles aparecem no contexto do sistema.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome do contato" },
        telefone: { type: "string" },
        email: { type: "string" },
        empresa: { type: "string" },
        origem: { type: "string", description: "De onde veio (indicação, Instagram etc.)" },
        anotacoes: { type: "string" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário. Só preencha os que o usuário mencionar.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["nome"],
    },
  },
  {
    name: "update_contact",
    description:
      "Atualiza campos de um contato existente. Envie apenas os campos que devem mudar. Para limpar um campo, envie string vazia.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
        nome: { type: "string" },
        telefone: { type: "string" },
        email: { type: "string" },
        empresa: { type: "string" },
        origem: { type: "string" },
        anotacoes: { type: "string" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário para atualizar (mescla com os já existentes).",
          additionalProperties: { type: "string" },
        },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "log_interaction",
    description:
      "Registra uma conversa/interação com um contato (ligação, WhatsApp, reunião etc.). Use quando o usuário relatar que falou com alguém.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
        texto: { type: "string", description: "Resumo da conversa" },
      },
      required: ["contato_id", "texto"],
    },
  },
  {
    name: "create_deal",
    description:
      "Cria uma venda no funil (entra na etapa 'novo'). Valor em reais (ex.: 1500.50). Vincule a um contato quando possível. Use 'detalhes' para os campos extras da profissão do usuário (ex: área do direito, tipo de imóvel).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título da venda" },
        valor_reais: { type: "number", description: "Valor em reais (opcional)" },
        contato_id: { type: "string", description: "ID do contato relacionado (opcional)" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário. Só preencha os que o usuário mencionar.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["titulo"],
    },
  },
  {
    name: "move_deal",
    description:
      "Move uma venda para outra etapa do funil. 'ganho' e 'perdido' fecham a venda.",
    input_schema: {
      type: "object",
      properties: {
        venda_id: { type: "string", description: "ID da venda" },
        etapa: { type: "string", enum: STAGE_KEYS, description: "Nova etapa" },
      },
      required: ["venda_id", "etapa"],
    },
  },
  {
    name: "create_task",
    description:
      "Cria um lembrete/tarefa. 'vencimento' em formato ISO 8601 (ex.: 2026-07-02T14:00:00-03:00). Vincule a um contato quando fizer sentido.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "O que precisa ser feito" },
        vencimento: { type: "string", description: "Data/hora limite em ISO 8601 (opcional)" },
        contato_id: { type: "string", description: "ID do contato relacionado (opcional)" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "toggle_task",
    description: "Marca um lembrete como concluído ou reabre.",
    input_schema: {
      type: "object",
      properties: {
        lembrete_id: { type: "string", description: "ID do lembrete" },
        concluido: { type: "boolean", description: "true = concluído, false = reabrir" },
      },
      required: ["lembrete_id", "concluido"],
    },
  },
  {
    name: "update_dashboard_preferences",
    description:
      "Muda o painel do usuário: estilo visual, cor, ordem dos widgets, widgets visíveis, métricas visíveis e nomes das métricas. Use quando ele pedir para reorganizar, esconder, mostrar, trocar estilo ou montar o painel do jeito dele.",
    input_schema: {
      type: "object",
      properties: {
        estilo: { type: "string", enum: DASHBOARD_STYLES, description: "Estilo visual do painel" },
        cor: { type: "string", enum: DASHBOARD_ACCENTS, description: "Cor de destaque" },
        widgets: {
          type: "array",
          items: { type: "string", enum: DASHBOARD_WIDGETS },
          description: "Widgets ativos na ordem desejada",
        },
        metricas: {
          type: "array",
          items: { type: "string", enum: ALL_DASHBOARD_METRICS.map((metric) => metric.key) },
          description: "Métricas ativas na ordem desejada, máximo 8",
        },
        nomes_metricas: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "Nomes personalizados por chave de métrica",
        },
      },
    },
  },
  {
    name: "update_workspace_labels",
    description:
      "Muda os nomes do CRM no workspace atual, como Contatos, Prospecção, item do quadro, valor acompanhado e retornos.",
    input_schema: {
      type: "object",
      properties: {
        contatos: { type: "string" },
        quadro: { type: "string" },
        item_quadro: { type: "string" },
        valor: { type: "string" },
        retornos: { type: "string" },
      },
    },
  },
  {
    name: "create_property",
    description:
      "Cria um imóvel na carteira (só disponível no workspace imobiliário). 'titulo', 'tipo_imovel' e 'tipo_transacao' são obrigatórios. Use 'sugestoes' apenas para campos que você está inferindo de uma foto, PDF ou mensagem (não algo que o usuário te disse diretamente) — eles ficam pendentes de confirmação humana, nunca preenchem a coluna real automaticamente.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        tipo_imovel: {
          type: "string",
          enum: ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"],
        },
        tipo_transacao: { type: "string", enum: ["venda", "aluguel", "venda_aluguel"] },
        status: {
          type: "string",
          enum: ["rascunho", "ativo", "reservado", "vendido", "alugado", "inativo"],
          description: "Padrão: ativo",
        },
        preco_reais: { type: "number" },
        preco_aluguel_reais: { type: "number" },
        quartos: { type: "integer" },
        banheiros: { type: "integer" },
        vagas: { type: "integer" },
        area_m2: { type: "number" },
        bairro: { type: "string" },
        cidade: { type: "string" },
        uf: { type: "string" },
        descricao: { type: "string" },
        contato_id: {
          type: "string",
          description: "ID do contato dono do imóvel (opcional) — vira owner_contact_id, precisa já existir como contato desta organização.",
        },
        sugestoes: {
          type: "object",
          description:
            "Valores inferidos (não confirmados) por nome da coluna, ex: {\"quartos\": \"3\"}. Ficam pendentes até um humano confirmar.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["titulo", "tipo_imovel", "tipo_transacao"],
    },
  },
  {
    name: "update_property",
    description:
      "Atualiza campos de um imóvel existente (só disponível no workspace imobiliário). Envie apenas os campos que devem mudar. Use 'sugestoes' para inferências não confirmadas, nunca para o que o usuário afirmou com certeza.",
    input_schema: {
      type: "object",
      properties: {
        imovel_id: { type: "string" },
        titulo: { type: "string" },
        tipo_imovel: {
          type: "string",
          enum: ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"],
        },
        tipo_transacao: { type: "string", enum: ["venda", "aluguel", "venda_aluguel"] },
        status: { type: "string", enum: ["rascunho", "ativo", "reservado", "vendido", "alugado", "inativo"] },
        preco_reais: { type: "number" },
        preco_aluguel_reais: { type: "number" },
        quartos: { type: "integer" },
        banheiros: { type: "integer" },
        vagas: { type: "integer" },
        area_m2: { type: "number" },
        bairro: { type: "string" },
        cidade: { type: "string" },
        uf: { type: "string" },
        descricao: { type: "string" },
        sugestoes: {
          type: "object",
          description: "Valores inferidos (não confirmados) por nome da coluna, mescla com os já existentes.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["imovel_id"],
    },
  },
  {
    name: "get_client_preferences",
    description:
      "Lê o perfil de busca (preferências) de um cliente num atendimento específico do workspace imobiliário — tipo de transação, faixa de preço, bairros, quartos mínimos etc.",
    input_schema: {
      type: "object",
      properties: {
        atendimento_id: { type: "string", description: "ID do atendimento (deal) — a preferência é por atendimento, não só por contato." },
      },
      required: ["atendimento_id"],
    },
  },
  {
    name: "update_client_preferences",
    description:
      "Grava/atualiza o perfil de busca do cliente para um atendimento (workspace imobiliário). Envie só os campos que o usuário de fato informou — nunca invente faixa de preço, bairro ou característica que a pessoa não disse.",
    input_schema: {
      type: "object",
      properties: {
        atendimento_id: { type: "string" },
        contato_id: { type: "string", description: "Só precisa informar se o atendimento ainda não tiver contato vinculado." },
        tipo_transacao: { type: "string", enum: ["venda", "aluguel", "venda_aluguel"] },
        tipos_imovel: {
          type: "array",
          items: { type: "string", enum: ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"] },
        },
        preco_min_reais: { type: "number" },
        preco_max_reais: { type: "number" },
        bairros: { type: "array", items: { type: "string" } },
        cidades: { type: "array", items: { type: "string" } },
        quartos_min: { type: "integer" },
        vagas_min: { type: "integer" },
        area_min_m2: { type: "number" },
        caracteristicas_obrigatorias: {
          type: "object",
          description: "Ex: {\"piscina\": \"sim\"}. Imóvel que não atender bloqueia o match inteiro.",
          additionalProperties: { type: "string" },
        },
        caracteristicas_desejadas: {
          type: "object",
          description: "Como caracteristicas_obrigatorias, mas não eliminatórias — só um extra.",
          additionalProperties: { type: "string" },
        },
        financiamento_necessario: { type: "boolean" },
        prazo_mudanca: { type: "string", description: "Data (AAAA-MM-DD) em que o cliente precisa se mudar." },
        observacoes: { type: "string" },
      },
      required: ["atendimento_id"],
    },
  },
  {
    name: "match_properties_for_client",
    description:
      "Calcula (sem gravar nada) o quanto cada imóvel ativo da carteira combina com o perfil de busca do cliente num atendimento — score 0-100 explicado por critério. Requer que o perfil já tenha sido definido (update_client_preferences).",
    input_schema: {
      type: "object",
      properties: {
        atendimento_id: { type: "string" },
        limite: { type: "integer", description: "Quantos imóveis retornar, no máximo. Padrão: 5." },
      },
      required: ["atendimento_id"],
    },
  },
  {
    name: "attach_property_to_deal",
    description:
      "Vincula um imóvel específico a um atendimento (workspace imobiliário), fora do cálculo de match. Use quando o usuário pedir explicitamente pra adicionar/enviar um imóvel a um atendimento. Se o vínculo já existir e nenhum status for informado, não mexe na jornada já em andamento.",
    input_schema: {
      type: "object",
      properties: {
        atendimento_id: { type: "string" },
        imovel_id: { type: "string" },
        status: {
          type: "string",
          enum: ["suggested", "selected", "sent", "viewed", "interested", "rejected", "visit_scheduled", "offer", "won"],
          description: "Opcional. Sem isso, um vínculo novo nasce como 'selected' e um já existente não muda de status.",
        },
      },
      required: ["atendimento_id", "imovel_id"],
    },
  },
  {
    name: "create_property_showcase",
    description:
      "Cria uma vitrine (link público) com uma seleção de imóveis (workspace imobiliário). Se atendimento_id for informado, os imóveis entram na jornada daquele atendimento como 'enviados'.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        imoveis: { type: "array", items: { type: "string" }, description: "IDs dos imóveis a incluir." },
        atendimento_id: { type: "string" },
        contato_id: { type: "string", description: "Cliente pra quem a vitrine é (opcional)." },
      },
      required: ["titulo", "imoveis"],
    },
  },
  {
    name: "schedule_property_visit",
    description:
      "Agenda uma visita a um imóvel para um cliente (workspace imobiliário). Sempre cria já como agendada — use quando o usuário (corretor) definir data/hora com o cliente.",
    input_schema: {
      type: "object",
      properties: {
        imovel_id: { type: "string" },
        contato_id: { type: "string" },
        atendimento_id: { type: "string", description: "Opcional — vincula a visita a um atendimento." },
        data_hora: { type: "string", description: "Data e hora em ISO 8601, ex: 2026-07-20T14:30:00-03:00." },
        duracao_minutos: { type: "integer", description: "Padrão: 45." },
        observacoes: { type: "string" },
      },
      required: ["imovel_id", "contato_id", "data_hora"],
    },
  },
  {
    name: "create_real_estate_offer",
    description:
      "Cria uma proposta de compra/negociação (workspace imobiliário), sempre como rascunho — só o corretor decide enviar pro cliente. Nunca invente valor não informado explicitamente pelo usuário.",
    input_schema: {
      type: "object",
      properties: {
        atendimento_id: { type: "string" },
        imovel_id: { type: "string" },
        contato_id: { type: "string" },
        valor_reais: { type: "number" },
        entrada_reais: { type: "number" },
        valor_financiado_reais: { type: "number" },
        condicoes_pagamento: { type: "string" },
        condicoes: { type: "string" },
        valida_ate: { type: "string", description: "Data (AAAA-MM-DD) de expiração da proposta." },
      },
      required: ["atendimento_id", "imovel_id", "contato_id", "valor_reais"],
    },
  },
  {
    name: "generate_listing_copy",
    description:
      "Busca os fatos de um imóvel formatados pra escrever título/descrição/textos por canal (workspace imobiliário) — não gera texto sozinha, devolve os dados reais pra você (a IA na conversa) escrever em cima, sem inventar nada que não esteja aqui.",
    input_schema: {
      type: "object",
      properties: {
        imovel_id: { type: "string" },
        canal: { type: "string", description: "Ex: 'portal', 'whatsapp', 'instagram' — pra ajustar o tom/tamanho do texto." },
      },
      required: ["imovel_id"],
    },
  },
  {
    name: "detect_listing_gaps",
    description: "Calcula o score de qualidade (0-100) do anúncio de um imóvel e lista o que falta pra melhorar (fotos, descrição, preço, endereço, matrícula etc). Só leitura, não altera o imóvel.",
    input_schema: {
      type: "object",
      properties: {
        imovel_id: { type: "string" },
      },
      required: ["imovel_id"],
    },
  },
  {
    name: "update_organization_context",
    description:
      "Atualiza contexto da empresa que alimenta a IA: nome, setor, região, prioridades, tom, instruções e observações. Use quando o usuário pedir para a IA conhecer melhor a empresa.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        contexto: { type: "string" },
        prioridades: { type: "string" },
        tom: { type: "string" },
        instrucoes_ia: { type: "string" },
        setor: { type: "string" },
        regiao: { type: "string" },
        tamanho_equipe: { type: "string" },
        site: { type: "string" },
        observacoes: { type: "string" },
      },
    },
  },

  // ---------- Exclusão (exigem confirmação explícita do usuário) ----------
  {
    name: "delete_contact",
    description:
      "Exclui um contato permanentemente (vendas e lembretes vinculados perdem o vínculo). Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "delete_deal",
    description:
      "Exclui uma venda permanentemente. Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        venda_id: { type: "string", description: "ID da venda" },
      },
      required: ["venda_id"],
    },
  },
  {
    name: "delete_task",
    description:
      "Exclui um lembrete permanentemente. Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        lembrete_id: { type: "string", description: "ID do lembrete" },
      },
      required: ["lembrete_id"],
    },
  },
];

const MUTATING_TOOLS = new Set([
  "create_contact",
  "update_contact",
  "log_interaction",
  "create_deal",
  "move_deal",
  "create_task",
  "toggle_task",
  "update_dashboard_preferences",
  "update_workspace_labels",
  "update_organization_context",
  "create_property",
  "update_property",
  "update_client_preferences",
  "attach_property_to_deal",
  "create_property_showcase",
  "schedule_property_visit",
  "create_real_estate_offer",
  "delete_contact",
  "delete_deal",
  "delete_task",
]);

export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}
