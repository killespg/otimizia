# Métricas comerciais do CRM jurídico

## Status

Design aprovado em 14 de agosto de 2026. A implementação ainda não começou.

## Objetivo

Transformar a parte superior de `/painel/juridico` em uma leitura comercial
confiável para escritórios de advocacia, sem remover a operação jurídica já
existente. O painel deve explicar velocidade de atendimento, qualidade do
funil, origem dos contratos, perdas, custo de aquisição e valor do cliente.

Nenhuma métrica pode ser estimada a partir de dados insuficientes. Períodos sem
cobertura histórica, custos ausentes e registros financeiros sem vínculo devem
ser identificados na interface.

## Decisões de produto aprovadas

- Um lead torna-se qualificado quando alcança a etapa `em_contato`, apresentada
  no jurídico como **Qualificação**. Se o negócio for movido diretamente para
  uma etapa posterior, as etapas anteriores são consideradas alcançadas de
  forma implícita para o funil não produzir uma sequência impossível.
- O tempo de primeira resposta usa somente conversas do WhatsApp.
- A primeira resposta pode ser humana ou automática pela IA. O detalhamento
  informa qual das duas respondeu.
- O CAC usa custos mensais informados pelo escritório: marketing mais operação
  comercial, divididos pelos novos contratos do mesmo conjunto de meses.
- O painel apresenta dois LTVs: valor médio efetivamente recebido e valor médio
  contratado.
- O histórico anterior à instrumentação é exibido como parcial. Não haverá
  reconstrução artificial de transições.
- A composição visual segue a opção A aprovada: funil no centro, poucos fundos
  funcionais e quase nenhuma linha divisória.

## Escopo

### Incluído

- Tempo mediano de primeira resposta do WhatsApp e quantidade sem resposta.
- Volume de leads qualificados.
- Conversão por etapa da mesma coorte de negócios.
- Desempenho por origem: leads, qualificados, contratos, conversão e receita
  recebida quando o cargo puder ver financeiro.
- Motivos de perda padronizados e observação livre opcional.
- CAC por período composto de meses civis.
- LTV recebido e LTV contratado.
- Estados vazios, cobertura parcial, acesso financeiro e layout responsivo.
- Base de dados e contrato serializável reutilizáveis por um futuro cliente
  mobile.

### Fora de escopo

- Medir tempo de resposta de e-mail, telefone, Instagram ou canais manuais.
- Atribuição multitoque de marketing.
- Metas, previsões ou recomendações geradas por IA.
- Reconstruir eventos antigos a partir de suposições.
- Criar neste ciclo uma API pública ou o aplicativo mobile.
- Substituir as áreas atuais de casos, prazos, DataJud e financeiro.

## Definições e fórmulas

### Período e coorte

A seção comercial tem filtro próprio, independente dos filtros operacionais de
prazos. As opções são **este mês**, **mês anterior**, **últimos 3 meses civis**
e **últimos 6 meses civis**. O mês atual é parcial até seu encerramento.

A coorte do funil contém negócios reais de `workspace_key = 'law_office'`
criados no período selecionado. Registros que representam listas do pipeline
(`details.pipeline_list_placeholder = 'true'`) são sempre excluídos.

### Primeira resposta

Para cada conversa cujo primeiro inbound ocorreu no período:

1. localizar a primeira mensagem `direction = 'inbound'`;
2. localizar a primeira mensagem posterior com `direction = 'outbound'` e
   `sent_by in ('human', 'ai')`;
3. calcular a diferença entre os dois horários.

A superfície principal mostra a mediana das conversas respondidas, por ser
menos sensível a uma conversa antiga esquecida. O detalhamento mostra o número
de conversas respondidas, o número aguardando resposta e a divisão humana/IA.
Mensagens de sistema não contam.

### Qualificação e conversão

Os marcos são `novo`, `em_contato`, `negociacao` e `ganho`, exibidos como
**Novo lead**, **Qualificação**, **Proposta enviada** e **Contratado**.

- Leads qualificados: contatos únicos da coorte que alcançaram Qualificação ou
  uma etapa posterior.
- Conversão de uma etapa: negócios que alcançaram o próximo marco divididos
  pelos que alcançaram o marco atual.
- Conversão final: negócios contratados divididos pelos negócios criados na
  coorte.
- `perdido` é um resultado terminal, não um marco de avanço.

Um contato com mais de um negócio conta uma vez no volume de leads, mas cada
negócio permanece no denominador comercial de conversão. A interface explicará
essa distinção no tooltip para não misturar pessoas e oportunidades.

### Origem

A origem vem de `contacts.source`. Valores vazios aparecem como **Sem origem**.
O ranking exibe volume de leads, qualificados e contratos. Receita recebida por
origem só aparece a quem possui `can_view_finance`.

Na primeira versão, negócios antigos usam a origem atual do contato. A interface
marca esse recorte como histórico parcial quando o período alcançar dados
anteriores à instrumentação; não tenta adivinhar origens antigas.

### Motivos de perda

Os códigos persistidos são:

- `price`: preço;
- `competitor`: contratou concorrente;
- `no_response`: falta de retorno;
- `timing`: momento inadequado;
- `profile_mismatch`: perfil incompatível;
- `other`: outro.

Ao mover um negócio jurídico para **Não contratado**, a interface solicita uma
categoria e permite observação opcional. Registros legados em
`details.loss_reason` aparecem como **Não categorizado**, preservando o texto
original sem classificá-lo automaticamente.

### CAC

`CAC = (marketing_cents + commercial_cents) / contratos conquistados`.

Para múltiplos meses, somam-se custos e contratos dos mesmos meses antes da
divisão. Um contrato é conquistado no mês da primeira transição não-baseline do
negócio para `ganho`; `closed_at` legado não substitui esse evento. Se não houver
custo cadastrado, a interface mostra **Não configurado**. Se houver custo, mas
nenhum contrato, mostra **Sem contratos no período**. Em nenhum desses estados o
valor será apresentado como zero.

### LTV

- LTV recebido: soma de `receivable_payments.amount_cents`, agrupada pelo
  `receivables.contact_id`, dividida pelos clientes únicos com pagamento.
- LTV contratado: soma de `fee_agreements.total_cents` com status `active` ou
  `completed`, dividida pelos clientes únicos desses contratos.

Rascunhos, contratos cancelados, recebíveis cancelados e registros sem
`contact_id` não entram na média. A interface informa quantos registros ficaram
sem vínculo para permitir correção dos dados. Os LTVs usam todo o relacionamento
e não mudam com o filtro mensal da seção.

## Arquitetura de dados

### Histórico imutável de etapas

Criar `deal_stage_history` como tabela analítica genérica, separada de
`crm_domain_events`. Esta última continuará sendo fila interna service-role e
não será exposta à UI.

Campos mínimos:

- `id`, `org_id`, `workspace_key`, `deal_id`, `contact_id`;
- `from_stage`, `to_stage`, `occurred_at`;
- `actor_id` quando a alteração vier de usuário autenticado;
- `is_baseline` para distinguir o marco criado na migração.

Um trigger em `deals` registra inserções e toda mudança real de `stage`, cobrindo
Board, server actions, IA, importações e RPCs. A função do trigger é
`security definer`, usa nomes totalmente qualificados, tem execução direta
revogada e não aceita escrita arbitrária do cliente. Membros da organização
podem ler o histórico; não existem policies de update ou delete.

Na migração, cada negócio existente recebe uma linha `is_baseline = true` com
`occurred_at` igual ao momento da migração. Essa linha representa apenas o
estado encontrado, não a data em que a etapa teria sido alcançada. Métricas de
transição excluem baselines.

### Primeira resposta materializada

Adicionar a `whatsapp_conversations`:

- `first_inbound_at`;
- `first_response_at`;
- `first_response_sent_by`, restrito a `human` ou `ai`.

Uma rotina de backfill deriva esses campos das mensagens existentes. Um trigger
em `whatsapp_messages` mantém os valores nas novas inserções e recalcula quando
uma mensagem anterior ao marco atual for importada. Isso evita carregar todo o
histórico de mensagens a cada abertura do painel.

### Custos de aquisição

Criar `law_acquisition_costs` com:

- `id`, `org_id`, `workspace_key = 'law_office'`;
- `month`, normalizado para o primeiro dia do mês;
- `marketing_cents`, `commercial_cents`, `notes`;
- `created_by`, `created_at`, `updated_at`;
- unicidade por `org_id`, `workspace_key` e `month`.

Leitura usa `can_view_finance(org_id)` e escrita usa
`can_manage_finance(org_id)`. Valores são inteiros não negativos. O formulário
faz upsert de um mês por vez e mantém a última gravação auditável por usuário e
horário.

### Perda estruturada

Adicionar a `deals` os campos opcionais `loss_reason_code` e
`loss_reason_notes`. O código tem check constraint com as categorias definidas.
Os campos são aplicados a todas as workspaces por pertencerem ao CRM genérico,
mas a captura obrigatória desta fase ocorre somente no funil jurídico.

### Índices e isolamento

Adicionar índices por organização, workspace, período e chaves de junção usados
nas métricas. Todas as consultas incluem `org_id` e `workspace_key`. As novas
tabelas têm RLS desde a criação. Chaves compostas ou validações equivalentes
impedem associar negócio, contato ou custo de outra organização.

## Camada de aplicação

Separar responsabilidades para não aumentar o arquivo já extenso do dashboard:

- `lib/law/legal-crm-metrics.ts`: tipos, período normalizado, fórmulas puras e
  DTO serializável `LegalCrmMetrics`;
- `lib/law/legal-crm-data.ts`: consultas Supabase limitadas às colunas
  necessárias e montagem do DTO;
- `components/legal/legal-crm-performance.tsx`: composição visual aprovada;
- `components/legal/legal-acquisition-cost-form.tsx`: edição mensal acessível a
  quem gerencia financeiro;
- action jurídica dedicada para validar e persistir custos;
- componentes pequenos para faixa de métricas, funil, origens, perdas e LTV.

O dashboard server component resolve organização, cargo e período e chama uma
única função de domínio. A função retorna `null` nos campos financeiros quando
o cargo não pode vê-los. Um futuro endpoint mobile poderá reutilizar o mesmo
DTO e a mesma camada de dados sem importar componentes React nem duplicar
fórmulas.

## Composição visual

A seção **Desempenho comercial jurídico** entra após o cabeçalho e a consulta
compacta ao Tim, antes das áreas operacionais de casos e prazos.

1. Cabeçalho curto com filtro de período e ação discreta para custos.
2. Uma faixa contínua de métricas: primeira resposta, qualificados, conversão
   final e CAC.
3. Funil dominante à esquerda e origens à direita.
4. Motivos de perda e os dois LTVs na faixa seguinte.
5. Operação jurídica atual continua abaixo, com menor prioridade visual.

Não haverá bordas entre cada métrica ou linha decorativa separando todos os
blocos. O agrupamento usa espaço, tipografia, barras de dados e no máximo dois
fundos grafite suaves. Azul é reservado para foco, seleção, ação e barras do
funil; estados não dependem somente de cor.

No mobile, a faixa vira duas colunas e depois uma coluna quando necessário. O
funil, origens, perdas e LTVs empilham sem rolagem horizontal. Controles mantêm
alvo mínimo de 44 px, foco visível, rótulo textual e contraste WCAG AA.

## Estados, erros e cobertura

- Sem WhatsApp conectado: explicar que a métrica depende do canal e oferecer
  link para configuração, sem mostrar `0 min`.
- Conversas sem resposta: mostrar quantidade pendente; não entram na mediana.
- Sem coorte: estado vazio curto, sem gráfico artificial.
- Período anterior à cobertura: banner **Histórico parcial desde DD/MM/AAAA**.
- Custos ausentes: CTA **Informar custos do mês** somente para quem pode gerir
  financeiro.
- Falha de uma consulta: registrar erro sem dados sensíveis e substituir apenas
  a seção afetada por um estado de indisponibilidade; casos e prazos continuam
  utilizáveis.
- Sem permissão financeira: CAC, receita por origem e LTV não são consultados
  nem renderizados. O layout reflui sem revelar que há valores ocultos.

## Testes e verificação

### Banco e segurança

- Trigger registra insert e mudança de etapa uma única vez e ignora updates sem
  alteração de `stage`.
- Backfill é baseline e nunca aparece como transição histórica.
- Trigger do WhatsApp distingue inbound, humano, IA e sistema.
- RLS impede leitura e escrita entre organizações.
- Somente cargos financeiros autorizados leem ou alteram custos e LTVs.
- Restrições rejeitam valores negativos, mês inválido e motivo desconhecido.

### Domínio

- Períodos civis, mês parcial e limites de timezone são determinísticos.
- Saltos de etapa implicam marcos anteriores sem duplicar pessoas.
- Conversões usam a mesma coorte e denominadores corretos.
- CAC diferencia custo ausente, zero contratos e valor calculável.
- LTV exclui status e registros sem vínculo definidos nesta especificação.
- Origem vazia e perda legada produzem categorias honestas.

### Interface

- Testes de contrato verificam hierarquia, ausência da antiga grade de cards,
  estados vazios e ocultação financeira.
- Fluxo de motivo de perda funciona com mouse e teclado e devolve o negócio à
  origem quando cancelado.
- Formulário de custo exibe validação, pending e erro recuperável.
- Inspeção autenticada em desktop e mobile valida foco, contraste, overflow,
  console e comportamento responsivo.
- Rodar Vitest completo, TypeScript, ESLint e build antes de considerar a
  implementação concluída.

## Migração, compatibilidade e rollback

A implementação será dividida em migração de dados, camada de domínio e UI. O
frontend só passa a ler os campos novos depois de a migração existir no ambiente
alvo. Backfills são idempotentes e não alteram `deals.stage`, mensagens ou
valores financeiros existentes.

Rollback funcional desliga a nova seção e retorna ao dashboard atual. A remoção
física de histórico e custos só deve ocorrer em migração posterior e explícita,
nunca no rollback imediato, para não destruir dados capturados após o lançamento.

## Critérios de aceitação

- As sete leituras aprovadas aparecem com dados reais ou estado honesto.
- Conversão por etapa vem de eventos posteriores à instrumentação.
- IA conta como primeira resposta, mas permanece identificável.
- CAC nunca mistura custos e contratos de períodos diferentes.
- LTV recebido e contratado têm rótulos e fórmulas distintas.
- Permissões financeiras e isolamento por organização são preservados.
- A seção segue o mockup A revisado, sem excesso de cards ou linhas.
- A operação jurídica atual permanece funcional abaixo da nova leitura.
- Desktop e mobile não apresentam sobreposição nem overflow horizontal.
