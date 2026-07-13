# OtimizIA — Design System

Fonte de verdade do visual do produto inteiro. O front (Next.js 15 + Tailwind,
`app/globals.css` como camada única de CSS) tem **três superfícies** com temas
diferentes — isso é intencional, não inconsistência:

| Superfície | Pastas | Tema | Papel |
| --- | --- | --- | --- |
| **Marketing** | `app/page.tsx`, `app/termos/`, componentes com classe `.landing-page` | claro/escuro (segue o toggle) | vender o produto: editorial, com movimento |
| **Autenticação** | `app/(auth)/**` (`AuthShell.tsx`) | claro/escuro (segue o toggle) | login/cadastro: painel dividido, moldura roxo→ciano |
| **App autenticado ("Noturno")** | `app/(app)/**` (escopo `.app-frame`) | **sempre escuro**, fixo | ferramenta de trabalho: grafite + roxo, sem distração |

O tema claro/escuro é uma classe `.dark` no `<html>`, escolhida no primeiro
paint por um script inline em `app/layout.tsx` (lê `localStorage.theme`,
cai para `prefers-color-scheme`) e alternada por `components/ThemeToggle.tsx`.
A superfície de App **ignora esse toggle**: `.app-frame` (aplicado no layout
de `app/(app)/layout.tsx`) redefine os tokens de cor e força
`color-scheme: dark`, independente da classe `.dark` estar presente ou não.

---

## 1. Fundações compartilhadas

### 1.1 Marca e cor

Rampa de marca (roxo OtimizIA — organização, foco, automação), fixa em
`tailwind.config.ts`, igual nas três superfícies:

| Passo | Hex |
| --- | --- |
| 50 | `#f5f0ff` |
| 100 | `#eadcff` |
| 200 | `#d8bdff` |
| 300 | `#be92ff` |
| 400 | `#a363ff` |
| 500 | `#8b3dff` |
| 600 | `#7424e8` |
| 700 | `#5f18c4` (ação primária) |
| 800 | `#4b1598` (hover de ação primária) |
| 900 | `#341064` |
| 950 | `#1d073d` |

Semânticas (mesmo esquema 50/100/500/600/700 nas três superfícies; `.dark` e
`.app-frame` reescrevem os tons `50/100/700` para permanecerem legíveis em
fundo escuro — ver `app/globals.css`):

| Papel | 50 | 500 | 700 | Uso |
| --- | --- | --- | --- | --- |
| `danger` | `#fef3f2` | `#f04438` | `#b42318` | atraso, perdido — claro, nunca alarmante |
| `success` | `#ecfdf3` | `#17b26a` | `#067647` | ganho, concluído |
| `warning` | `#fff7e6` | `#f59e0b` | `#8a6500` | pendência, média prioridade |

`ink`, `canvas`, `surface`, `surface-2`, `line`, `line-strong` **não são hex
fixos** — são variáveis CSS (`--color-*`, consumidas via `rgb(var(--color-x) /
<alpha-value>)`) que mudam de valor por superfície/tema. Ver tabelas nas
seções 2–4. Nunca usar hex hardcoded para essas camadas; sempre as classes
Tailwind `text-ink`, `bg-surface`, `border-line`, etc.

### 1.2 Tipografia

- **Sans**: Outfit (Google Font, `var(--font-sans)`), pesos 300–800 carregados.
  Geométrica e arredondada, escolhida para substituir a Vegur.
- **Mono**: IBM Plex Mono (`var(--font-mono)`), pesos 400/500/600 — usada em
  números tabulares e trechos de código/JSON.
- `font-black` do Tailwind foi **remapeado para peso 700** em
  `tailwind.config.ts` (não 900) — a Outfit em 900 pesa demais para os ~160
  usos de `font-black` no app.
- Títulos (`h1`–`h3`) e `.font-display` usam a mesma Outfit; `.font-display`
  força peso 300 para display editorial (landing).
- Regra geral: `text-wrap: balance` em `h1`–`h3`; nada de órfã em prosa longa.

### 1.3 Raio de borda

Escala custom (substitui a padrão do Tailwind, "cantos quase retos" — o
oposto de "tudo arredondado"), igual nas três superfícies:

| Classe | Valor | Uso típico |
| --- | --- | --- |
| `rounded-sm` | 2px | — |
| `rounded` (DEFAULT) | 3px | — |
| `rounded-md` | 4px | campos, tags, chips |
| `rounded-lg` | 5px | botões, `.card`/`.panel` |
| `rounded-xl` | 6px | — |
| `rounded-2xl` | 8px | shells (`.app-shell`, cartão de auth, menus flutuantes) |
| `rounded-3xl` | 10px | — |
| `rounded-4xl` | 12px | — |
| `rounded-full` | — | **só círculo de verdade**: avatar, dot de status. Nunca em botão/chip/pílula. |

### 1.4 Movimento

Tokens em `:root` (`app/globals.css`):

```
--ease-ui-out:    cubic-bezier(0.23, 1, 0.32, 1)   /* saída de UI: entra rápido, assenta suave */
--ease-ui-in-out: cubic-bezier(0.77, 0, 0.175, 1)  /* transições simétricas */
--motion-fast:   170ms   /* hover/foco/press */
--motion-med:    260ms   /* troca de tema, entrada de painel */
--motion-reveal: 560ms   /* entrada de seção/hero */
```

Utilitários de interação reaproveitáveis:

- `.press` / `.press-sm` — `active:scale-95/96`, para qualquer elemento clicável.
- `.lift` — hover eleva (`translateY(-2px)`) só em dispositivos com hover real
  (`@media (hover: hover) and (pointer: fine)`), nunca no toque.
- `.row-link`, `.nav-item`, `.icon-button` — variantes do mesmo padrão
  press+lift já aplicadas a linha de tabela, item de nav e botão-ícone.
- Toda animação de entrada (`.motion .app-shell`, `.faq-item`, hero) só roda
  se a classe `.motion` estiver no `<html>` — ela é adicionada por um script
  inline após o load, então JS desabilitado ou execução muito rápida = sem
  animação (progressive enhancement, não FOUC de animação).
- `prefers-reduced-motion: reduce` é respeitado nos pontos de maior custo
  (drag do painel personalizável).

### 1.5 Ícones

`app/(app)/icons.tsx` — um único sistema de ícones em SVG inline, sem
biblioteca externa:

```
viewBox 24×24 · fill: none · stroke: currentColor · strokeWidth: 1.6
strokeLinecap/Linejoin: round · aria-hidden: true
```

Traço fino e uniforme; a cor vem sempre do texto ao redor (`currentColor`),
nunca hardcoded.

### 1.6 Acessibilidade e toque

- Alvo mínimo de toque: `min-h-11` (44px) em qualquer controle; botões
  primários e campos usam `min-h-12`/`46px` no mobile (`@media max-width:639px`).
- `touch-action: manipulation` em `a, button, input, select, textarea,
  [role="button"]` — mata o delay de 300ms e o double-tap-zoom.
- Foco: `focus-visible:outline focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-brand-700` em botões;
  campos usam `focus:border-brand-600 focus:shadow-focus`
  (`shadow-focus = 0 0 0 3px rgba(139,61,255,.24)`).
- Estado desabilitado: `:disabled` **e** `[aria-disabled="true"]` recebem o
  mesmo tratamento (`opacity-58`, `cursor-not-allowed`, sem transform) — usar
  `aria-disabled` quando o elemento precisa continuar focável/anunciado.
- Navegação ativa: `aria-current="page"`, nunca só cor.

---

## 2. Superfície: Marketing (landing page)

Escopo: classe `.landing-page` (envolve `app/page.tsx` e afins). Claro por
padrão, com variante escura completa (`.dark .landing-page ...`).

- **Tokens de cor**: os genéricos `--color-*` de `:root`/`.dark` (tabela
  abaixo) — mesma fonte que a autenticação, diferente da área logada.

  | Token | Claro | Escuro |
  | --- | --- | --- |
  | `canvas` | `#F8FBFF` | `#0F0D19` |
  | `surface` | `#FFFFFF` | `#181428` |
  | `surface-2` | `#F0EBFB` | `#201B35` |
  | `line` | `#DED5EF` | `#443B66` |
  | `line-strong` | `#BFAEE0` | `#8A7ABC` |
  | `ink` | `#170F24` | `#FAF8FF` |
  | `ink-soft` | `#3D334D` | `#DAD3EB` |
  | `ink-muted` | `#645875` | `#AAA1C2` |

- **Tipografia editorial**: `.landing-page h2/h3/.font-display` forçam peso
  **300** (contraste proposital com o resto do app, que é 600–700) e
  `letter-spacing` negativo; tamanhos fluidos via `clamp()`
  (`h2: clamp(3rem,7vw,5.2rem)`), com breakpoint próprio abaixo de 640px para
  não quebrar o título em várias linhas apertadas.
- **Fundo**: gradientes radiais roxo/ciano em camadas (`rgba(139,61,255,…)` +
  `rgba(11,191,232,…)`) sobre `--color-canvas`, mais intensos no dark.
- **Padrões únicos desta superfície** (não existem no app logado):
  - `.interactive-hero` — hero com preview de produto que reage ao ponteiro
    (tilt 3D leve, glow que segue o cursor via custom properties
    `--hero-pointer-x/y`, `--hero-tilt-x/y`), com estados
    `contacts | sales | assistant` trocados por hover/click/foco.
  - `.motion-card`, `.landing-button`, `.landing-secondary` — brilho
    diagonal (`::before` com `skewX`) que varre a superfície no hover.
  - `.faq-item` / `.faq-answer` — accordion via `grid-template-rows`
    animado (não `height: auto`), com entrada escalonada por
    `nth-child` quando `.motion` está ativo.
  - `marqueeItems` — faixa de texto em loop (ver `app/page.tsx`).
- Ícones e botões reaproveitam as mesmas classes `.btn`/`.tag`/`.card` da
  seção 4.4 — não há um segundo sistema de componentes, só um segundo tema de
  cor+tipografia por cima.

## 3. Superfície: Autenticação

Escopo: `app/(auth)/AuthShell.tsx`, usado por login/cadastro/recuperação de
senha. Mesmos tokens `:root`/`.dark` da seção 2 (claro/escuro segue o toggle).

- **Moldura**: fundo cheio com gradiente de marca
  `linear-gradient(135deg,#b518ff 0%,#5c22e8 43%,#0bbfe8 100%)` — a mesma
  moldura da área logada (ver 4.1), reescrita em tom mais escuro no dark via
  `.dark [class*="135deg,#b518ff"]`.
- **Painel**: `.panel` branco (`bg-white` / `bg-surface` no dark),
  `rounded-2xl`, split em duas colunas a partir de `lg`: esquerda = copy +
  ícones de prova social (`PreviewItem`), direita = formulário centrado
  (`max-w-[420px]`).
- **Primitivas próprias**: `AuthField` (label + `.field`, obrigatório
  marcado com `*` + `sr-only "obrigatório"`), banners de erro/sucesso
  (`border-danger-200 bg-danger-50` / `border-success-200 bg-success-50`).
- Fora isso, 100% reaproveitamento de `.field`, `.btn`, `.label` da seção 4.

## 4. Superfície: App autenticado ("Noturno")

**Toda tela dentro de `app/(app)/` segue esta seção.** Landing e auth **não**
usam este sistema — ver 2 e 3.

### 4.1 Princípios

1. **Sempre escuro.** `.app-frame` (aplicado uma vez, no layout) redefine os
   tokens de cor e `color-scheme: dark` incondicionalmente — não existe modo
   claro dentro do app, mesmo que o usuário tenha "claro" salvo no toggle
   (que só afeta marketing/auth).
2. **Acolhedor, mas profissional.** Tipografia contida (nada de títulos
   gigantes nem `font-black` espalhado em corpo de texto), espaçamento
   generoso e consistente, microcópia em tom humano.
3. **Uma linguagem só.** Toda tela usa as mesmas primitivas
   (`components/app-ui.tsx` + classes abaixo). Se uma tela precisa de algo
   novo, a primitiva nasce no sistema, não na tela.
4. **Profundidade vem do contraste**, não de sombra flutuante. Superfícies
   planas, bordas discretas; roxo reservado para seleção, foco e ação
   primária.

### 4.2 Tokens (escopo `.app-frame`, `app/globals.css`)

Estes **substituem** os tokens genéricos da seção 2 só dentro do app — são um
terceiro conjunto de valores, mais escuro e com contraste maior entre
camadas que a variante `.dark` genérica:

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-canvas` | `#131118` | fundo da página (fora do `.app-shell`) |
| `--color-surface` | `#1B1924` | cards, sidebar, header |
| `--color-surface-2` | `#252334` | campos, hover de linha, chips |
| `--color-line` | `#35324A` | bordas estruturais |
| `--color-line-strong` | `#6F66A0` | bordas em foco/hover |
| `--color-ink` | `#F5F3FB` | texto principal |
| `--color-ink-soft` | `#CBC7DB` | texto secundário |
| `--color-ink-muted` | `#918CA6` | rótulos, metadados |

Escala de acento roxo própria desta superfície (usada em ícones de stat card,
glows, bordas de campo em foco — não confundir com a rampa `brand-*`):

| Token | Valor |
| --- | --- |
| `--violet-deep` | `#2e054f` |
| `--violet-core` | `#4c1d95` |
| `--violet-strong` | `#6d28d9` |
| `--violet-light` | `#8b5cf6` |
| `--violet-specular` | `#ddd6fe` |

Camada 0 (fora do `.app-shell`): fundo do `.app-frame` é a mesma moldura
gradiente roxo→ciano da autenticação (`135deg,#b518ff→#5c22e8→#0bbfe8`),
visível como margem em telas ≥ `sm`; no mobile ela desaparece e o
`.app-shell` ocupa a tela cheia.

### 4.3 Tipografia

- **Título de página**: `.page-title` — 24px, semibold(700), `-0.02em`.
- **Eyebrow** (acima do título): `.page-eyebrow` — 11px, semibold, uppercase,
  tracking largo, roxo claro (`#b8a5f0`).
- **Descrição de página**: `.page-desc` — 14px, `ink-muted`, `max-w-2xl`.
- **Título de seção/card**: `.card-title` — 15px, semibold.
- **Corpo**: 14px `font-medium`. Metadados: 12px `ink-muted`.
- **Valor de métrica**: `.stat-value` — 26.4px, semibold,
  `font-variant-numeric: tabular-nums`.
- É proibido: `font-black` em texto corrido, `clamp()` gigante em títulos,
  `uppercase tracking` fora de eyebrow/label/cabeçalho de tabela.

### 4.4 Primitivas React — `components/app-ui.tsx`

Server components, sem estado — importar sempre que a tela tiver o elemento
equivalente:

- `<PageHeader navigation eyebrow title description actions />` — topo de
  toda página; `navigation` recebe breadcrumb/link de volta.
- `<StatCard label value hint icon tone />` — métrica; `tone`:
  `brand | success | warning | danger`.
- `<SectionCard title description actions id flush tone>` — seção
  emoldurada; `flush` cola tabela/lista na borda; `tone`: `default | brand |
  danger`.
- `<Tag tone>` — status; `tone`: `brand | success | warning | danger | muted`.
- `<EmptyState icon title hint action />` — estado vazio.

### 4.5 Classes CSS de componente (`app/globals.css`)

- `.card` / `.panel` — superfície padrão (borda + sombra difusa sutil).
  `.card-quiet` / `.panel-soft` — variante sem sombra, fundo `surface-2`.
- `.card-head`, `.card-title`, `.card-desc` — cabeçalho de card.
- `.page-head`, `.page-eyebrow`, `.page-title`, `.page-desc`, `.page-actions`.
- `.stat-card` (+ modificadores `--success/--warning/--danger`),
  `.stat-label`, `.stat-value`, `.stat-icon`, `.stat-hint`.
- `.data-table` — aplicar direto na `<table>`: estiliza `thead`/`tbody`/hover
  de linha inteiros (não tem primitiva React ainda).
- `.empty-state`, `.empty-state-title`, `.empty-state-hint`.
- `.field` — input/select/textarea padrão. `.label` para o rótulo.
- `.btn` (CTA sólido roxo, "automotive paint" com glow radial e reflexo no
  hover), `.btn-soft` (secundário, borda), `.btn-primary`/`.btn-ghost`
  (mesmo par em tamanho maior, telas de conversão/onboarding).
- `.tag` + `.tag-brand`/`.tag-danger`/`.tag-honey`/`.tag-muted`.

Não existem mais aliases legados (`.glass`, `.glass-soft`, `.glass-input`,
`.glass-btn`) — foram removidos do CSS em 2026-07-13 depois de confirmar zero
uso em `.tsx`. Toda tela usa `.card`/`.card-quiet`/`.field`/`.btn` direto.

### 4.6 Navegação (`app/(app)/AppNav.tsx`)

- **Desktop** (`sm:`+): `SidebarNav`, rail fixo de 250px, item ativo com
  `aria-current="page"` + leve animação de "respiração" no glow
  (`activeNavBreathe`, 2.8s).
- **Mobile** (< `sm`): `MobileTabBar`, fixa no rodapé
  (`env(safe-area-inset-bottom)`), grid de 5 posições com um botão central
  "+" maior (FAB) que abre um menu de ações rápidas (`.mobile-create-menu`)
  em vez de navegar direto — os 4 itens ao redor são os mais usados
  (Painel/Contatos/Vendas/Tarefas), o resto vive atrás do "+".
- Cabeçalho mobile fixo de 64px (`.mobile-app-header`) com logo + atalho de
  configurações/logout.

### 4.7 Espaçamento e grid

- Grid de 8px. Espaço entre seções de página: `space-y-6`. Padding interno de
  card: `p-5`; cabeçalho de card: `mb-4`.
- `.app-main` conteúdo limitado a `max-w-[1500px]`, padding lateral
  `px-4 sm:px-8 lg:px-10`.

---

## 5. Regras gerais (valem nas três superfícies)

1. **Nunca alterar lógica** ao mexer em visual: data fetching, server
   actions, formulários (`name`/`value`/hidden inputs), links, condicionais
   de permissão e labels de workspace ficam intactos — só JSX estrutural e
   classes.
2. Remover sombra/gradiente arbitrário novo (`shadow-[...]` inline,
   `bg-white` cru, `rounded-full` fora de círculo) — usar a
   classe/primitiva do sistema. O CSS já tem overrides de compatibilidade
   para código legado (`.dark .bg-white`, `.app-frame .bg-white`, etc.);
   código novo não deve depender desses overrides.
3. Todo header de página vira `PageHeader` (app) ou segue a tipografia da
   seção 2/3 (marketing/auth). Toda métrica vira `StatCard`. Toda seção
   emoldurada vira `SectionCard`. Toda tabela ganha `.data-table`.
4. Manter acessibilidade: `aria-*`, `sr-only`, roles e foco visível (seção
   1.6) em qualquer componente novo.
5. Textos ficam em pt-BR; não mudar copy ao mexer em estrutura, só mover de
   lugar quando o layout pedir.
6. Cor semântica (`danger/success/warning`) é só para estado, nunca para
   decoração — se não é status, é `ink`/`surface`/`brand`.
