# Mobile Personalized Dashboard Header Design

**Date:** 2026-08-04
**Status:** approved design, pending written-spec review
**Scope:** mobile header of the real-estate dashboard below the `md` breakpoint

## Goal

Replace the oversized mobile greeting block with a compact premium profile header that preserves a human greeting, reflects the real state of the operation, exposes two fast actions, and positions Tim as an operational partner who can act rather than as an assistant or chatbot.

## Product language

- Do not use emojis.
- Do not call Tim an assistant, chatbot, copilot, or helper.
- The mobile Tim action reads `Acione o Tim na sua operação`.
- Greetings use the member's first name.
- Calm language is shown only when the operation has no attention items.
- When attention items exist, the sentence states their combined quantity and invites action without claiming everything is fine.

## Responsive boundary

The new header exists only below `md`.

- `MobileRealEstateHeader` renders with `md:hidden`.
- The current date, large greeting, operational paragraph, Agenda button, Novo imóvel button, and desktop Tim control remain unchanged at `md` and above.
- The current shared product topbar and mobile bottom navigation are out of scope.
- No Supabase query, authorization rule, organization boundary, or desktop layout changes.

## Mobile composition

The mobile block has three compact levels:

1. A 44-pixel profile/action row.
   - Left: 40-pixel circular avatar with the member's initials, short salutation, and a green CSS status dot followed by the active-property count.
   - Right: a notification button and a new-property Link. Each target is at least 44 by 44 pixels and uses the existing Liquid Glass control material.
2. A full-width daily sentence below the row. It may wrap to two lines and uses restrained body typography.
3. A full-width Liquid Glass Link reading `Acione o Tim na sua operação`, immediately below the sentence.

The sentence occupies its own line so that a 320-pixel viewport does not force the avatar, text, and two actions into an illegibly narrow column.

## Component architecture

Create `components/real-estate/mobile-real-estate-dashboard-header.tsx` as a focused client component.

It consumes only serializable display data:

```ts
type MobileRealEstateDashboardHeaderProps = {
  displayName: string;
  activePropertyCount: number;
  greeting: {
    salutation: string;
    message: string;
  };
  requestedVisits: number;
  openOffers: number;
  overdueCommissions: number;
};
```

`RealEstateDashboard` remains a Server Component. It calculates the real counts and passes them to the mobile header. The client boundary exists only for notification-popover state and motion.

Create `lib/real-estate/mobile-dashboard-greeting.ts` as a pure server-safe module responsible for Brazilian time conversion, period selection, daily rotation, and status-aware copy.

```ts
type MobileGreetingPeriod =
  | "overnight"
  | "early_morning"
  | "late_morning"
  | "early_afternoon"
  | "late_afternoon"
  | "early_evening"
  | "late_evening";

type MobileDashboardGreeting = {
  period: MobileGreetingPeriod;
  salutation: "Bom dia" | "Boa tarde" | "Boa noite";
  message: string;
};

export function getMobileDashboardGreeting(input: {
  now: Date;
  attentionCount: number;
}): MobileDashboardGreeting;
```

The first name remains a presentation concern in the header, which renders the short line as `{salutation}, {firstName}`. This keeps phrase-bank entries reusable and prevents names from affecting deterministic selection.

## Brazilian time and daily rotation

Time and date are derived explicitly with the `America/Sao_Paulo` time zone. The implementation must not rely on the Vercel process time zone or the browser after hydration.

| São Paulo time | Period | Salutation |
|---|---|---|
| 00:00–04:59 | `overnight` | Boa noite |
| 05:00–08:59 | `early_morning` | Bom dia |
| 09:00–11:59 | `late_morning` | Bom dia |
| 12:00–14:59 | `early_afternoon` | Boa tarde |
| 15:00–17:59 | `late_afternoon` | Boa tarde |
| 18:00–20:59 | `early_evening` | Boa noite |
| 21:00–23:59 | `late_evening` | Boa noite |

The São Paulo calendar date is converted to an integer day number. `dayNumber % phraseBank.length` selects the phrase. For the same period and state, consecutive dates select consecutive phrases and the output remains stable across refreshes and hydration.

Attention wording uses `1 prioridade` or `{n} prioridades`, so singular and plural remain grammatical.

## Curated phrase banks

Each period has four calm phrases and four attention phrases. This produces variety without assembling sentence fragments that could sound artificial.

### Madrugada — 00:00–04:59

Calm:

1. `Pode ficar tranquilo: a operação segue em ordem enquanto a cidade descansa.`
2. `Tudo sob controle por aqui para atravessarmos a madrugada sem preocupações.`
3. `A operação está em ordem e pronta para quando o dia começar.`
4. `Está tudo certo por aqui; nada urgente precisa interromper sua noite.`

Attention:

1. `Há {priorities} para retomarmos assim que o dia começar.`
2. `A operação tem {priorities}; já sabemos por onde começar.`
3. `O próximo passo já considera {priorities}.`
4. `Antes do amanhecer, há {priorities} que merecem cuidado.`

### Começo da manhã — 05:00–08:59

Calm:

1. `A operação amanheceu em ordem para começarmos o dia com leveza.`
2. `Tudo alinhado por aqui para você abrir o dia focando no que importa.`
3. `A casa está em ordem e a manhã começa com espaço para avançar.`
4. `O dia começa com a operação redonda e as prioridades no lugar.`

Attention:

1. `Começamos o dia com {priorities} para colocar em ordem.`
2. `A manhã abre com {priorities} que podemos resolver sem perder o ritmo.`
3. `Há {priorities} esperando por nós; vamos começar pelo que mais importa.`
4. `Temos {priorities} para deixar o restante do dia mais leve.`

### Fim da manhã — 09:00–11:59

Calm:

1. `A manhã segue redonda e a operação continua em dia.`
2. `Tudo no lugar por aqui para aproveitarmos bem o restante da manhã.`
3. `A operação está alinhada e a manhã pode seguir sem ruído.`
4. `Chegamos ao fim da manhã com tudo sob controle.`

Attention:

1. `Ainda temos {priorities} para organizar antes de a tarde começar.`
2. `A manhã avança com {priorities} que merecem nossa atenção.`
3. `Ainda há {priorities}; dá tempo de agir antes de a tarde começar.`
4. `Temos {priorities} para fechar bem a manhã.`

### Começo da tarde — 12:00–14:59

Calm:

1. `A tarde começa com tudo em ordem para mantermos o ritmo.`
2. `Está tudo alinhado por aqui para avançarmos no que importa.`
3. `A operação segue redonda e a tarde está aberta para novas oportunidades.`
4. `Começamos a tarde com a casa em ordem e espaço para crescer.`

Attention:

1. `A tarde começa com {priorities} no radar.`
2. `Há {priorities} para colocarmos em dia e seguirmos com mais leveza.`
3. `Temos {priorities} pedindo atenção neste começo de tarde.`
4. `Há {priorities} para organizar antes de ganharmos ritmo.`

### Fim da tarde — 15:00–17:59

Calm:

1. `Estamos fechando a tarde com a operação em ordem.`
2. `Tudo sob controle por aqui para terminarmos o dia com tranquilidade.`
3. `A tarde segue bem encaminhada e sem pendências urgentes.`
4. `O fim da tarde chega com tudo alinhado na operação.`

Attention:

1. `Temos {priorities} para fecharmos a tarde em ordem.`
2. `O dia ainda tem espaço para resolvermos {priorities}.`
3. `Há {priorities} que merecem atenção antes de desacelerarmos.`
4. `Temos {priorities} para encerrar a tarde com mais tranquilidade.`

### Começo da noite — 18:00–20:59

Calm:

1. `O dia desacelera e a operação continua em ordem por aqui.`
2. `Tudo alinhado para fecharmos o dia com tranquilidade.`
3. `A noite começa com a casa em ordem.`
4. `Chegamos à noite com a operação sob controle e sem urgências.`

Attention:

1. `O dia deixa {priorities}; podemos agir agora.`
2. `A noite começa com {priorities} que ainda merecem atenção.`
3. `Há {priorities} para organizarmos antes de encerrar o ritmo.`
4. `Temos {priorities} para deixar a operação mais tranquila esta noite.`

### Fim da noite — 21:00–23:59

Calm:

1. `Podemos dormir tranquilos porque está tudo nos conformes por aqui.`
2. `Fechamos o dia com a operação em ordem e sem surpresas.`
3. `Tudo certo por aqui para você encerrar o dia com tranquilidade.`
4. `A casa está em ordem; agora podemos desacelerar.`

Attention:

1. `Antes de encerrar o dia, há {priorities} que merecem atenção.`
2. `O dia termina com {priorities}; deixamos tudo claro para o próximo passo.`
3. `Ainda temos {priorities} para organizar.`
4. `Há {priorities} esperando por nós antes de considerarmos o dia encerrado.`

## Notification popover

The bell controls a small non-modal popover rendered with `AnimatePresence` and `motion.div`.

- The button exposes `aria-expanded` and `aria-controls`.
- The popover is anchored below the action row, aligned to the right, and constrained to the available phone width.
- It opens with a restrained opacity and vertical-offset transition.
- `useReducedMotion` removes positional motion when requested.
- Escape closes it and restores focus to the bell.
- Clicking outside closes it.
- Following an item Link closes it.
- It does not lock page scrolling or trap focus because it is a non-modal status surface.

When counts are positive, render only the relevant rows:

- requested visits → `/painel/imoveis/visitas`;
- open offers → `/painel/funil`;
- overdue commissions → `/painel/imoveis/comissoes`.

The bell badge shows the combined attention count, capped visually at `9+`. If every count is zero, the popover reads `Tudo em ordem` and explains that there are no pending items now.

## Fast actions

- Notification button: semantic `button`, accessible name `Ver resumo da operação`, 44-pixel target.
- New property: semantic Next.js Link to `/painel/imoveis/novo`, accessible name `Cadastrar novo imóvel`, 44-pixel target.
- Tim: semantic Next.js Link to the current Tim route, visible copy `Acione o Tim na sua operação`, 44-pixel minimum height.

The internal route name may remain `/painel/assistente` for compatibility, but no visible mobile copy introduced by this feature may call Tim an assistant.

## Visual direction

- Reuse the current dark Liquid Glass tokens rather than introducing a second material system.
- The avatar uses a restrained indigo-violet fill, initials, a fine internal highlight, and no emoji.
- The active-property dot is a CSS circle, not an emoji.
- Body copy remains white/gray with violet reserved for action and focus states.
- Avoid gradient text in the personalized sentence; legibility takes precedence over decoration.
- No continuous animation. Motion is limited to opening and closing the notification surface.

## Testing strategy

Implementation follows TDD.

1. Pure unit tests cover all seven São Paulo time boundaries, UTC-to-Brazil conversion, calm versus attention phrase banks, singular/plural replacement, deterministic same-day output, and different consecutive-day output.
2. Server-render contract tests cover the mobile-header marker, `md:hidden`, desktop `hidden md:flex`, initials, greeting, active-property status, Tim copy, notification semantics, new-property destination, and preservation of the desktop copy.
3. The authenticated Liquid Glass Playwright flow covers opening, closing by Escape, outside click, focus restoration, relevant notification rows, clear state, and reduced motion. If its authenticated fixture is unavailable locally, the skipped boundary must be reported rather than counted as validation.
4. TypeScript, ESLint, the focused tests, and the complete Vitest suite remain green.

## Non-goals

- No mobile product-topbar redesign.
- No bottom-navigation change.
- No desktop header or action change.
- No new Supabase query or client-side fetching.
- No notification center, read/unread persistence, push notification, or invented analytics.
- No automatic Tim action, microphone activation, or route rename.

## Acceptance criteria

- Mobile uses the compact profile row, personalized sentence, fast actions, and Tim action in that order.
- Desktop retains the current header and Tim presentation.
- Greeting uses the correct São Paulo period for all 24 hours.
- Each period rotates through curated phrases by São Paulo calendar date and stays stable on refresh.
- Calm copy never appears when any attention count is positive.
- The bell reveals real requested-visit, open-offer, and overdue-commission information with accessible motion behavior.
- No emoji or visible assistant/chatbot terminology is introduced.
- Every interactive mobile target is at least 44 by 44 pixels.
