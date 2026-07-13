# OtimizIA — Design System "Noturno" (área autenticada)

Fonte de verdade da reconstrução visual do app autenticado. **Toda tela dentro
de `app/(app)/` segue este documento.** A landing page e as telas de auth NÃO
usam este sistema.

## Princípios

1. **Sempre escuro.** A área autenticada é dark por definição: base grafite
   (nunca preto puro), roxo da marca como único acento. Não existe modo claro
   dentro do app.
2. **Acolhedor, mas profissional.** Tipografia contida (nada de títulos de
   3rem nem `font-black` espalhado), espaçamento generoso e consistente,
   microcópia em tom humano.
3. **Uma linguagem só.** Toda tela usa as mesmas primitivas. Se uma tela
   precisa de algo novo, a primitiva nasce no sistema, não na tela.
4. **Profundidade vem do contraste.** Superfícies planas, bordas discretas e
   roxo reservado para seleção, foco e ações primárias.

## Tokens (definidos em `app/globals.css`, escopo `.app-frame`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-canvas` | `#1D1E2E` | fundo da página |
| `--color-surface` | `#171825` | cards, sidebar, header |
| `--color-surface-2` | `#1F1F31` | campos, linhas de tabela hover, chips |
| `--color-line` | `#393A4E` | bordas estruturais |
| `--color-line-strong` | `#745BAE` | bordas em foco/hover |
| `--color-ink` | `#F7F6FB` | texto principal |
| `--color-ink-soft` | `#CDC9DB` | texto secundário |
| `--color-ink-muted` | `#9792AB` | rótulos, metadados |
| `--violet-*` | `#2E054F → #8B5CF6` | acento da marca |

## Tipografia

- **Título de página**: `text-2xl font-bold tracking-tight text-ink` (24px).
- **Eyebrow** (acima do título): `.page-eyebrow` — 11px, semibold, uppercase,
  tracking largo, roxo claro.
- **Descrição de página**: 14px, `text-ink-muted`, máx. `max-w-2xl`.
- **Título de seção/card**: 15px `font-semibold text-ink`.
- **Corpo**: 14px `font-medium`. Metadados: 12px `text-ink-muted`.
- **Números/valores**: `font-semibold tabular-nums` (via `.stat-value`).
- É PROIBIDO: `font-black` em texto corrido, `clamp()` gigante em títulos,
  `uppercase tracking` fora de eyebrow/label/cabeçalho de tabela.

## Espaçamento e cantos

- Grid de 8px. Página: `space-y-6`. Dentro de card: `p-5`, header `mb-4`.
- Cantos: cards `9px` (classe `.card`), controles `7–8px`, chips `6px`.
- Só é redondo o que é círculo de verdade (avatar, dot de status).

## Primitivas React — `components/app-ui.tsx`

Importar SEMPRE que a tela tiver o elemento equivalente:

- `<PageHeader navigation eyebrow title description actions className />` — topo de TODA página;
  `navigation` recebe breadcrumb ou link de volta.
- `<StatCard label value hint icon tone className />` — métricas (substitui os
  `<article>` ad-hoc com `rounded-full` + sombras arbitrárias).
- `<SectionCard title description actions id className flush tone>` — toda seção com
  moldura; `flush` cola tabelas/listas nas bordas e `tone` aceita `brand` ou `danger`.
- `<Tag tone className>` — status (`brand | success | warning | danger | muted`).
- `<EmptyState icon title hint action className />` — estados vazios.

## Classes CSS de componente (globals.css)

- `.card` — superfície padrão (grafite plano e borda discreta).
- `.card-head` / `.card-title` / `.card-desc` — cabeçalho de card.
- `.page-head`, `.page-eyebrow`, `.page-title`, `.page-desc`, `.page-actions`.
- `.stat-card`, `.stat-label`, `.stat-value`, `.stat-icon`.
- `.data-table` — aplicar na `<table>`: estiliza thead/tbody/hover inteiros.
- `.empty-state`.
- `.btn` (CTA roxo), `.btn-soft` (secundário), `.field`, `.label`, `.tag`.

## Regras de reconstrução por tela

1. **NUNCA alterar lógica**: data fetching, server actions, formulários
   (names/values/hidden inputs), links, condicionais de permissão e labels de
   workspace ficam intactos. Só muda JSX estrutural e classes.
2. Remover TODAS as sombras arbitrárias (`shadow-[0_10px_30px...]`),
   `bg-white`, gradientes hardcoded e `rounded-full` em não-círculos.
   Substituir pelo componente/classe do sistema.
3. Todo header de página vira `<PageHeader>`. Toda métrica vira `<StatCard>`.
   Toda seção emoldurada vira `<SectionCard>`. Toda tabela ganha `.data-table`.
4. Manter acessibilidade: `aria-*`, `sr-only`, roles e foco visível.
5. Textos: manter o conteúdo em pt-BR como está (só mover de lugar quando a
   estrutura pedir).
