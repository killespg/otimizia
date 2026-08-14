# Redesign do painel jurídico

## Objetivo

Transformar `/painel/juridico` em uma central de trabalho para o advogado: o
que vence, o que mudou e o que exige decisão devem aparecer antes de gráficos
e indicadores históricos. O redesign preserva consultas, filtros, permissões,
links e estados vazios existentes.

## Direção aprovada

- Superfícies em grafite, texto neutro e azul apenas para ação, seleção e foco.
- Raios semânticos do design system: 9 px em controles, 11 px em agrupamentos
  internos e 15 px em painéis.
- Uma faixa contínua de indicadores, sem uma grade de cards repetidos.
- Agenda prioritária como superfície dominante; financeiro e fluxo da carteira
  como informação secundária.
- Tabela de casos como continuidade da operação, com leitura confortável em
  desktop e reorganização linear no mobile.

## Hierarquia

1. Cabeçalho curto com data, título, resumo de estado, filtros e ação “Novo caso”.
2. Consulta rápida ao Tim como ferramenta, não como hero decorativo.
3. Faixa de indicadores reais: prazos críticos, casos parados, movimentações e
   valores vencidos (ou carteira ativa quando o cargo não vê financeiro).
4. Agenda prioritária e resumo financeiro/da carteira.
5. Casos em acompanhamento.
6. Fluxo histórico em uma seção de menor prioridade.

## Estados e acessibilidade

- Nenhum estado depende somente de cor; ícone, rótulo e número permanecem.
- Controles mantêm alvo mínimo de 44 px, foco visível e contraste WCAG AA.
- Escritório vazio recebe instruções acionáveis; carteira em dia recebe
  confirmação positiva e explicação quando filtros escondem prazos.
- Sem animação ornamental ou conteúdo oculto por JavaScript.

## Fora de escopo

- Alterar schema, consultas, RLS, cargos, dados financeiros ou rotas.
- Inventar metas, produtividade, risco processual ou qualquer métrica ausente.
- Redesenhar as páginas internas de processos, prazos e DataJud neste ciclo.

## Verificação

- Teste de contrato visual para hierarquia, tokens semânticos e ausência das
  cores roxas legadas.
- TypeScript, ESLint, suíte Vitest e build completo.
- Inspeção responsiva e de console no navegador quando houver sessão jurídica;
  sem sessão, a limitação será registrada explicitamente.
