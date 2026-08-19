import type Anthropic from "@anthropic-ai/sdk";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_ACCENTS,
  DASHBOARD_STYLES,
  DASHBOARD_WIDGETS,
} from "@/lib/workspace/dashboard-preferences";
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
    name: "get_real_estate_pipeline_summary",
    description: "Resumo do pipeline imobiliário num período: imóveis captados, vitrines enviadas, visitas, propostas e comissão prevista/recebida. Só leitura.",
    input_schema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Janela em dias pra trás. Padrão: 30." },
      },
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

  // ---------- Exclusão (confirme com o usuário na conversa antes de chamar) ----------
  {
    name: "delete_contact",
    description:
      "Exclui um contato permanentemente (vendas e lembretes vinculados perdem o vínculo). Só chame depois que o usuário confirmar a exclusão na conversa (ex.: \"pode excluir\", \"exclui\", \"apaga\").",
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
      "Exclui uma venda permanentemente. Só chame depois que o usuário confirmar a exclusão na conversa (ex.: \"pode excluir\", \"exclui\", \"apaga\").",
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
      "Exclui um lembrete permanentemente. Só chame depois que o usuário confirmar a exclusão na conversa (ex.: \"pode excluir\", \"exclui\", \"apaga\").",
    input_schema: {
      type: "object",
      properties: {
        lembrete_id: { type: "string", description: "ID do lembrete" },
      },
      required: ["lembrete_id"],
    },
  },

  // ---------- Área jurídica (advocacia) ----------
  // Disponíveis apenas quando a área ativa no CRM é o jurídico. Permissões
  // seguem os cargos do escritório: leitura exige acesso ao jurídico e as
  // escritas exigem gestão (sócio, advogado ou paralegal).
  {
    name: "list_legal_cases",
    description:
      "Lista os casos da carteira jurídica. Filtre por 'status' (intake, active, waiting, suspended, closed, archived) ou busque por título, número do processo ou parte contrária. Disponíveis apenas no workspace de advocacia.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["intake", "active", "waiting", "suspended", "closed", "archived"],
          description: "Filtrar por status (opcional)",
        },
        busca: { type: "string", description: "Texto para buscar em título, número do processo ou parte contrária (opcional)" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 20)" },
      },
    },
  },
  {
    name: "get_legal_case",
    description:
      "Retorna tudo de um caso jurídico: dados do processo, cliente, responsável, equipe, prazos, movimentações, documentos, despesas e links de compartilhamento. Use quando o usuário perguntar sobre um caso específico.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string", description: "ID do caso" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "list_legal_deadlines",
    description:
      "Lista os prazos jurídicos. Filtre por 'status' (pending, completed, cancelled), por caso (caso_id), ou use 'filtro' com 'atrasados' ou 'proximos'. Disponíveis apenas no workspace de advocacia.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string", description: "Filtrar pelos prazos de um caso (opcional)" },
        status: { type: "string", enum: ["pending", "completed", "cancelled"], description: "Filtrar por status (opcional)" },
        filtro: { type: "string", enum: ["atrasados", "proximos"], description: "Recorte pré-definido (opcional)" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 50)" },
      },
    },
  },
  {
    name: "list_legal_case_events",
    description:
      "Lista as movimentações (eventos) de um caso jurídico — andamentos, decisões, audiências e anotações. Requer 'caso_id'.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 50)" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "list_legal_documents",
    description:
      "Lista os documentos de um caso jurídico (nome, tipo, status e se foi gerado por IA). Requer 'caso_id'.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 50)" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "list_watched_processes",
    description:
      "Lista os processos acompanhados de fora da carteira (consultados no DataJud), com a última movimentação conhecida. Filtre por caso (caso_id) quando o processo estiver vinculado.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string", description: "Filtrar pelos processos vinculados a um caso (opcional)" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 30)" },
      },
    },
  },
  {
    name: "search_datajud_process",
    description:
      "Consulta um processo público no DataJud (CNJ) por tribunal e número (formato CNJ, 20 dígitos). O processo entra na lista de acompanhamento automaticamente. Use para 'consulta esse processo', 'o que tem de novo nesse processo' etc.",
    input_schema: {
      type: "object",
      properties: {
        tribunal_alias: {
          type: "string",
          description: "Tribunal (ex: tjsp, trf1, trt3, stj, tst). Lista completa: tjac, tjal, tjam, tjap, tjba, tjce, tjdft, tjes, tjgo, tjma, tjmg, tjms, tjmt, tjpa, tjpb, tjpe, tjpi, tjpr, tjrj, tjrn, tjro, tjrr, tjrs, tjsc, tjse, tjsp, tjto, trf1..trf6, trt1..trt24, tst, stj, tse, stm, tre-uf, tjmmg, tjmrs, tjmsp",
        },
        numero_processo: { type: "string", description: "Número do processo CNJ (20 dígitos, pode enviar com pontuação)" },
      },
      required: ["tribunal_alias", "numero_processo"],
    },
  },
  {
    name: "get_legal_business_overview",
    description:
      "Resumo do escritório: casos por status, prazos pendentes/atrasados, processos acompanhados com movimentação nova, total de contatos e, para quem tem acesso ao financeiro, contas a receber e despesas do mês. Use para perguntas do tipo 'como está o escritório?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_legal_case",
    description:
      "Cria um caso jurídico na carteira. Somente 'titulo' é obrigatório; vincule um cliente (contato_id) e um responsável (responsavel_id, membro da organização) quando possível. Status padrão: intake (triagem).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Nome do caso" },
        contato_id: { type: "string", description: "ID do cliente vinculado (opcional)" },
        responsavel_id: { type: "string", description: "ID do membro responsável (padrão: o próprio usuário)" },
        numero_processo: { type: "string", description: "Número do processo (opcional)" },
        area: { type: "string", description: "Área do direito (ex: cível, trabalhista)" },
        vara: { type: "string", description: "Vara/unidade judiciária" },
        comarca: { type: "string", description: "Comarca/foro" },
        parte_contraria: { type: "string" },
        status: { type: "string", enum: ["intake", "active", "waiting", "suspended", "closed", "archived"] },
        risco: { type: "string", enum: ["low", "standard", "high", "critical"], description: "Padrão: standard" },
        confidencialidade: { type: "string", enum: ["team", "restricted"], description: "Padrão: restricted" },
        resumo: { type: "string", description: "Resumo do caso" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "update_legal_case",
    description:
      "Edita um caso jurídico: título, status, risco, confidencialidade, número do processo, área, vara, comarca, parte contrária ou resumo. Envie apenas os campos que devem mudar.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        titulo: { type: "string" },
        status: { type: "string", enum: ["intake", "active", "waiting", "suspended", "closed", "archived"] },
        risco: { type: "string", enum: ["low", "standard", "high", "critical"] },
        confidencialidade: { type: "string", enum: ["team", "restricted"] },
        numero_processo: { type: "string", description: "Envie vazio para limpar" },
        area: { type: "string", description: "Envie vazio para limpar" },
        vara: { type: "string", description: "Envie vazio para limpar" },
        comarca: { type: "string", description: "Envie vazio para limpar" },
        parte_contraria: { type: "string", description: "Envie vazio para limpar" },
        resumo: { type: "string", description: "Envie vazio para limpar" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "create_legal_deadline",
    description:
      "Cria um prazo jurídico vinculado a um caso. 'vencimento' é obrigatório, em ISO 8601 (ex.: 2026-07-02T14:00:00-03:00). Tipo padrão: procedural (processual).",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string", description: "ID do caso" },
        titulo: { type: "string", description: "O que precisa ser feito" },
        vencimento: { type: "string", description: "Data/hora limite em ISO 8601" },
        responsavel_id: { type: "string", description: "ID do membro responsável (padrão: o próprio usuário)" },
        tipo: { type: "string", enum: ["procedural", "hearing", "internal", "client", "administrative"] },
        prioridade: { type: "string", enum: ["low", "normal", "high", "critical"] },
        observacoes: { type: "string" },
      },
      required: ["caso_id", "titulo", "vencimento"],
    },
  },
  {
    name: "update_legal_deadline",
    description:
      "Edita um prazo jurídico: título, vencimento, tipo, prioridade, observações, responsável ou status (pending, completed, cancelled). Para concluir o prazo use status 'completed'. Envie apenas os campos que devem mudar.",
    input_schema: {
      type: "object",
      properties: {
        prazo_id: { type: "string" },
        titulo: { type: "string" },
        vencimento: { type: "string", description: "Data/hora em ISO 8601" },
        tipo: { type: "string", enum: ["procedural", "hearing", "internal", "client", "administrative"] },
        prioridade: { type: "string", enum: ["low", "normal", "high", "critical"] },
        status: { type: "string", enum: ["pending", "completed", "cancelled"] },
        responsavel_id: { type: "string" },
        observacoes: { type: "string", description: "Envie vazio para limpar" },
      },
      required: ["prazo_id"],
    },
  },
  {
    name: "create_legal_event",
    description:
      "Registra uma movimentação manual no caso jurídico (andamento, decisão, audiência, comunicação ou anotação). Use quando o usuário relatar algo ocorrido no processo.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        titulo: { type: "string", description: "Resumo do andamento" },
        tipo: { type: "string", enum: ["update", "filing", "decision", "hearing", "communication", "note"] },
        descricao: { type: "string" },
        data_hora: { type: "string", description: "Quando ocorreu, em ISO 8601 (padrão: agora)" },
      },
      required: ["caso_id", "titulo"],
    },
  },
  {
    name: "link_datajud_process",
    description:
      "Vincula um número de processo do DataJud a um caso da carteira (tribunal + número CNJ). Depois de vincular, use sync_datajud_process para buscar as movimentações.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        tribunal_alias: { type: "string", description: "Alias do tribunal (ex: tjsp, trf3, tst)" },
        numero_processo: { type: "string", description: "Número CNJ (20 dígitos)" },
      },
      required: ["caso_id", "tribunal_alias", "numero_processo"],
    },
  },
  {
    name: "sync_datajud_process",
    description:
      "Sincroniza agora um caso vinculado com o DataJud: grava as movimentações novas como andamentos e cria lembretes de revisão quando uma movimentação parece exigir atenção. Requer que o processo já esteja vinculado ao caso.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "create_legal_document_link",
    description:
      "Adiciona um documento a um caso por link externo (URL). Use para referenciar arquivos que já estão na internet.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        nome: { type: "string", description: "Nome do documento" },
        link: { type: "string", description: "URL externa do documento" },
        tipo_documento: { type: "string", enum: ["petition", "contract", "evidence", "decision", "power_of_attorney", "client_document", "other"] },
        observacoes: { type: "string" },
      },
      required: ["caso_id", "nome", "link"],
    },
  },
  {
    name: "update_legal_document",
    description:
      "Edita um documento jurídico: nome, tipo, status (draft, review, approved, filed, archived) ou observações. Envie apenas os campos que devem mudar.",
    input_schema: {
      type: "object",
      properties: {
        documento_id: { type: "string" },
        nome: { type: "string" },
        tipo_documento: { type: "string", enum: ["petition", "contract", "evidence", "decision", "power_of_attorney", "client_document", "other"] },
        status: { type: "string", enum: ["draft", "review", "approved", "filed", "archived"] },
        observacoes: { type: "string", description: "Envie vazio para limpar" },
      },
      required: ["documento_id"],
    },
  },
  {
    name: "add_legal_case_member",
    description:
      "Adiciona um integrante da organização à equipe de um caso, com papel lead (responsável), collaborator ou viewer.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        membro_id: { type: "string", description: "ID do usuário (membro da organização)" },
        papel: { type: "string", enum: ["lead", "collaborator", "viewer"], description: "Padrão: collaborator" },
      },
      required: ["caso_id", "membro_id"],
    },
  },
  {
    name: "remove_legal_case_member",
    description:
      "Remove um integrante da equipe de um caso.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
        membro_id: { type: "string", description: "ID do usuário a remover" },
      },
      required: ["caso_id", "membro_id"],
    },
  },
  {
    name: "delete_legal_case",
    description:
      "Exclui um caso jurídico permanentemente (prazos, movimentações e documentos vinculados são apagados junto). Só chame depois que o usuário confirmar a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        caso_id: { type: "string" },
      },
      required: ["caso_id"],
    },
  },
  {
    name: "delete_legal_deadline",
    description:
      "Exclui um prazo jurídico permanentemente. Só chame depois que o usuário confirmar a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        prazo_id: { type: "string" },
      },
      required: ["prazo_id"],
    },
  },
  {
    name: "delete_legal_document",
    description:
      "Exclui um documento jurídico permanentemente. Só chame depois que o usuário confirmar a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        documento_id: { type: "string" },
      },
      required: ["documento_id"],
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
  "create_legal_case",
  "update_legal_case",
  "create_legal_deadline",
  "update_legal_deadline",
  "create_legal_event",
  "link_datajud_process",
  "sync_datajud_process",
  "create_legal_document_link",
  "update_legal_document",
  "add_legal_case_member",
  "remove_legal_case_member",
  "delete_legal_case",
  "delete_legal_deadline",
  "delete_legal_document",
]);

export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}

// Tools exclusivas do workspace de advocacia (área jurídica + DataJud).
// Fora do law_office elas são removidas das definições enviadas ao modelo,
// e um guard no dispatcher bloqueia qualquer tentativa de execução.
const LEGAL_TOOL_NAMES = new Set([
  "list_legal_cases",
  "get_legal_case",
  "list_legal_deadlines",
  "list_legal_case_events",
  "list_legal_documents",
  "list_watched_processes",
  "search_datajud_process",
  "get_legal_business_overview",
  "create_legal_case",
  "update_legal_case",
  "create_legal_deadline",
  "update_legal_deadline",
  "create_legal_event",
  "link_datajud_process",
  "sync_datajud_process",
  "create_legal_document_link",
  "update_legal_document",
  "add_legal_case_member",
  "remove_legal_case_member",
  "delete_legal_case",
  "delete_legal_deadline",
  "delete_legal_document",
]);

export function isLegalTool(name: string): boolean {
  return LEGAL_TOOL_NAMES.has(name);
}

export function toolsForWorkspace(workspaceKey: string) {
  if (workspaceKey === "law_office") return CRM_TOOLS;
  return CRM_TOOLS.filter((tool) => !LEGAL_TOOL_NAMES.has(tool.name));
}
