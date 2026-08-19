# Legal CRM Commercial Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real, permission-safe commercial metrics for the legal CRM: WhatsApp first response, qualified leads, funnel conversion, sources, losses, CAC, and received/contracted LTV.

**Architecture:** Add immutable deal-stage instrumentation, materialized WhatsApp response timestamps, structured loss reasons, and monthly legal acquisition costs in Supabase. Keep metric formulas in a pure TypeScript domain module, isolate Supabase loading behind one server-side adapter, and render a reusable serializable DTO in a focused legal dashboard component.

**Tech Stack:** Next.js 16 server components and server actions, React 19, TypeScript 5.5, Supabase/PostgreSQL with RLS, Tailwind CSS 4, Vitest 4, Playwright 1.62.

## Global Constraints

- Do not add dependencies.
- Every query and write must be scoped by `org_id` and `workspace_key = 'law_office'` where that column exists.
- Never infer old transitions, sources, costs, or financial values; render an explicit unavailable or partial state.
- IA and human outbound WhatsApp messages count as first response; `system` does not.
- Financial rows are loaded only when `canViewFinance` is true; costs are written only when `canManageFinance` is true.
- Preserve the existing cases, deadlines, DataJud, Tim, receivables, and permission behavior below the new section.
- Follow the approved visual direction: graphite/black surfaces, blue details, spacing-led grouping, no repeated card grid, and almost no decorative divider lines.
- Controls must keep a 44 px target, visible focus, textual labels, WCAG AA contrast, and no horizontal overflow at 390 px.
- The worktree is already dirty and contains user-staged logo files. Every commit must use explicit task paths and must not include unrelated existing changes.
- Do not deploy or apply migrations to a remote Supabase project in this plan.
- Functional rollback means reverting the dashboard integration while retaining captured history and costs; destructive table removal requires a later explicit migration.

---

## File Structure

- `supabase/migrations/0080_legal_crm_commercial_metrics.sql`: instrumentation, backfills, structured loss columns, acquisition-cost table, indexes, triggers, and RLS.
- `lib/supabase/types.ts`: row and enum types for the new schema.
- `lib/crm/pipeline-stage.ts`: one canonical pipeline-list-to-stage parser used by client and server.
- `lib/crm/pipeline-stage.test.ts`: legal and legacy stage-label behavior.
- `lib/law/legal-crm-metrics.ts`: period normalization, pure formulas, status unions, and `LegalCrmMetrics` DTO.
- `lib/law/legal-crm-metrics.test.ts`: formula and honest-empty-state coverage.
- `lib/law/legal-crm-data.ts`: permission-aware Supabase reads and DTO assembly.
- `lib/law/legal-crm-data.test.ts`: adapter gating and partial-failure behavior.
- `lib/law/legal-acquisition-cost.ts`: strict form-value parsing.
- `lib/law/legal-acquisition-cost.test.ts`: validation and cent conversion.
- `app/(dashboard)/painel/juridico/crm-actions.ts`: authorized monthly-cost persistence.
- `components/legal/legal-acquisition-cost-form.tsx`: cost drawer form.
- `components/legal/legal-loss-reason-dialog.tsx`: accessible loss-reason confirmation.
- `components/legal/legal-crm-performance.tsx`: approved dashboard composition.
- `components/legal/legal-crm-performance.test.tsx`: semantic and visual contract.
- `app/(dashboard)/painel/funil/Board.tsx`: legal loss interception and optimistic-move handling.
- `app/(dashboard)/painel/funil/page.tsx`: passes the legal workspace flag.
- `app/(dashboard)/painel/actions.ts`: validates structured loss data and uses the canonical stage parser.
- `app/(dashboard)/painel/juridico/page.tsx`: loads and mounts the commercial section without absorbing its rendering logic.
- `components/legal/legal-dashboard.test.ts`: updated page-level composition contract.
- `test/integration/legal-crm-metrics.test.ts`: trigger, RLS, tenancy, and finance-permission verification against local Supabase.

---

### Task 1: Canonical legal pipeline-stage mapping

**Files:**
- Create: `lib/crm/pipeline-stage.ts`
- Create: `lib/crm/pipeline-stage.test.ts`
- Modify: `app/(dashboard)/painel/actions.ts`
- Modify: `app/(dashboard)/painel/funil/Board.tsx`

**Interfaces:**
- Produces: `stageFromPipelineList(listName: string): DealStage`
- Produces: `isLostPipelineList(listName: string): boolean`
- Consumers: Board optimistic updates and the `moveDealToList` server action.

- [ ] **Step 1: Write the failing legal-label tests**

```ts
import { describe, expect, it } from "vitest";
import { isLostPipelineList, stageFromPipelineList } from "./pipeline-stage";

describe("stageFromPipelineList", () => {
  it.each([
    ["Novo lead", "novo"],
    ["Qualificação", "em_contato"],
    ["Proposta enviada", "negociacao"],
    ["Contratado", "ganho"],
    ["Não contratado", "perdido"],
    ["NEGÓCIO PERDIDO", "perdido"],
  ] as const)("maps %s to %s", (label, stage) => {
    expect(stageFromPipelineList(label)).toBe(stage);
  });

  it("checks loss with the same parser used by server and client", () => {
    expect(isLostPipelineList("Não contratado")).toBe(true);
    expect(isLostPipelineList("Contratado")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run lib/crm/pipeline-stage.test.ts`

Expected: FAIL because `lib/crm/pipeline-stage.ts` does not exist.

- [ ] **Step 3: Add the canonical parser and replace both duplicate local functions**

```ts
import type { DealStage } from "@/lib/supabase/types";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function stageFromPipelineList(listName: string): DealStage {
  const value = normalized(listName);
  if (value.includes("nao contratado") || value.includes("perdido") || value.includes("perda") || value.includes("lost")) return "perdido";
  if (value.includes("contratado") || value.includes("fechado") || value.includes("vendido") || value.includes("vendas") || value.includes("ganho") || value.includes("won")) return "ganho";
  if (value.includes("proposta") || value.includes("negociacao") || value.includes("visita")) return "negociacao";
  if (value.includes("qualificacao") || value.includes("analise") || value.includes("contato") || value.includes("follow")) return "em_contato";
  return "novo";
}

export function isLostPipelineList(listName: string) {
  return stageFromPipelineList(listName) === "perdido";
}
```

Import this function in `Board.tsx` and `actions.ts`; remove both local `stageFromList`/`stageFromPipelineList` bodies so client and server cannot disagree.

- [ ] **Step 4: Run the focused test and relevant existing CRM tests**

Run: `npx vitest run lib/crm/pipeline-stage.test.ts lib/crm/deals-report.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit only the parser task**

```powershell
git add -- lib/crm/pipeline-stage.ts lib/crm/pipeline-stage.test.ts 'app/(dashboard)/painel/actions.ts' 'app/(dashboard)/painel/funil/Board.tsx'
git commit --only -m "refactor: centralize pipeline stage mapping" -- lib/crm/pipeline-stage.ts lib/crm/pipeline-stage.test.ts 'app/(dashboard)/painel/actions.ts' 'app/(dashboard)/painel/funil/Board.tsx'
```

---

### Task 2: Instrument immutable stage history and WhatsApp response markers

**Files:**
- Create: `supabase/migrations/0080_legal_crm_commercial_metrics.sql`
- Create: `test/integration/legal-crm-metrics.test.ts`
- Modify: `lib/supabase/types.ts`

**Interfaces:**
- Produces table: `deal_stage_history`
- Produces columns: `deals.loss_reason_code`, `deals.loss_reason_notes`
- Produces columns: `whatsapp_conversations.first_inbound_at`, `first_response_at`, `first_response_sent_by`
- Produces table: `law_acquisition_costs`
- Produces TypeScript types: `DealStageHistory`, `LegalLossReasonCode`, `LawAcquisitionCost` and extended `Deal`/`WhatsappConversation`.

- [ ] **Step 1: Write failing integration cases for instrumentation and RLS**

Create a dedicated integration suite using `test/integration/helpers.ts`. Its core assertions must be:

```ts
const { data: deal } = await owner.client.from("deals").insert({
  owner_id: owner.userId,
  org_id: organizationId,
  workspace_key: "law_office",
  title: "Consulta trabalhista",
  stage: "novo",
}).select("id").single();

await owner.client.from("deals").update({ stage: "em_contato" }).eq("id", deal!.id);
const { data: history } = await owner.client.from("deal_stage_history")
  .select("from_stage,to_stage,is_baseline")
  .eq("deal_id", deal!.id)
  .order("occurred_at");
expect(history).toEqual([
  { from_stage: null, to_stage: "novo", is_baseline: false },
  { from_stage: "novo", to_stage: "em_contato", is_baseline: false },
]);

const forged = await outsider.client.from("deal_stage_history").insert({
  org_id: organizationId,
  workspace_key: "law_office",
  deal_id: deal!.id,
  to_stage: "ganho",
  occurred_at: new Date().toISOString(),
});
expect(forged.error).not.toBeNull();
```

Add WhatsApp messages at deterministic timestamps and assert that a `system`
outbound does not fill `first_response_at`, while the first `ai` outbound does.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `npm run test:integration -- test/integration/legal-crm-metrics.test.ts`

Expected: FAIL because the new tables and columns do not exist. If local Supabase is unavailable, record that boundary and continue with the static/type tests; do not point the command at a remote project.

- [ ] **Step 3: Implement the migration with locked-down trigger functions**

The migration must contain this structure, with all identifiers schema-qualified inside security-definer functions:

```sql
alter table public.deals
  add column loss_reason_code text,
  add column loss_reason_notes text,
  add constraint deals_loss_reason_code_check check (
    loss_reason_code is null or loss_reason_code in
    ('price','competitor','no_response','timing','profile_mismatch','other')
  );

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null,
  deal_id uuid not null references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  from_stage text check (from_stage is null or from_stage in ('novo','em_contato','negociacao','ganho','perdido')),
  to_stage text not null check (to_stage in ('novo','em_contato','negociacao','ganho','perdido')),
  actor_id uuid references auth.users(id) on delete set null,
  is_baseline boolean not null default false,
  occurred_at timestamptz not null default now()
);

alter table public.deal_stage_history enable row level security;
create policy "deal_stage_history_select_member" on public.deal_stage_history
  for select using (public.is_org_member(org_id));

create table public.law_acquisition_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'law_office' check (workspace_key = 'law_office'),
  month date not null check (month = date_trunc('month', month)::date),
  marketing_cents integer not null default 0 check (marketing_cents >= 0),
  commercial_cents integer not null default 0 check (commercial_cents >= 0),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, workspace_key, month)
);

alter table public.law_acquisition_costs enable row level security;
create policy "law_acquisition_costs_select" on public.law_acquisition_costs
  for select using (public.can_view_finance(org_id));
create policy "law_acquisition_costs_write" on public.law_acquisition_costs
  for all using (public.can_manage_finance(org_id)) with check (public.can_manage_finance(org_id));

grant select on public.deal_stage_history to authenticated;
grant select, insert, update, delete on public.law_acquisition_costs to authenticated;
```

Add `security definer set search_path = ''` trigger functions for deal inserts/stage changes and WhatsApp insert/update/delete. Revoke direct execution from `public`, `anon`, and `authenticated`. Backfill current deals as `is_baseline = true` at migration time, then backfill WhatsApp markers from ordered messages. Add indexes for `(org_id, workspace_key, occurred_at)`, `(deal_id, occurred_at)`, and `(org_id, month)`.

Add a migration header comment stating that immediate rollback is application-only:

```sql
-- Rollback seguro: reverter a leitura/UI e manter estas tabelas e colunas.
-- Remoção física exige uma migration posterior explícita para não apagar
-- histórico, custos e motivos capturados depois do lançamento.
```

- [ ] **Step 4: Extend row types and re-run focused checks**

```ts
export type LegalLossReasonCode = "price" | "competitor" | "no_response" | "timing" | "profile_mismatch" | "other";

export type DealStageHistory = {
  id: string;
  org_id: string;
  workspace_key: string;
  deal_id: string;
  contact_id: string | null;
  from_stage: DealStage | null;
  to_stage: DealStage;
  actor_id: string | null;
  is_baseline: boolean;
  occurred_at: string;
};
```

Add the two loss fields to `Deal`, three first-response fields to
`WhatsappConversation`, and the full `LawAcquisitionCost` row type.

Run: `npx --no-install supabase status -o json`

Confirm the API URL is local, then run:

Run: `npx --no-install supabase migration up --local`

Run: `npx vitest run test/integration/legal-crm-metrics.test.ts --config vitest.integration.config.ts`

Expected: PASS when local Supabase has migration 0080 applied.

- [ ] **Step 5: Commit only migration, types, and integration test**

```powershell
git add -- supabase/migrations/0080_legal_crm_commercial_metrics.sql lib/supabase/types.ts test/integration/legal-crm-metrics.test.ts
git commit --only -m "feat: instrument legal CRM metrics" -- supabase/migrations/0080_legal_crm_commercial_metrics.sql lib/supabase/types.ts test/integration/legal-crm-metrics.test.ts
```

---

### Task 3: Pure commercial-metric formulas

**Files:**
- Create: `lib/law/legal-crm-metrics.ts`
- Create: `lib/law/legal-crm-metrics.test.ts`

**Interfaces:**
- Produces: `resolveLegalCrmPeriod(key, now): LegalCrmPeriod`
- Produces: `buildLegalCrmMetrics(input): LegalCrmMetrics`
- Produces DTO status unions consumed by data loading and UI.

- [ ] **Step 1: Write failing tests for periods, stage skipping, response, CAC, and LTV**

Use fixed timestamps and assert the public contract:

```ts
const metrics = buildLegalCrmMetrics({
  period: resolveLegalCrmPeriod("current_month", new Date("2026-08-14T12:00:00-03:00")),
  deals: [
    { id: "d1", contact_id: "c1", stage: "ganho", created_at: "2026-08-02T12:00:00Z", is_placeholder: false },
    { id: "d2", contact_id: "c2", stage: "perdido", created_at: "2026-08-03T12:00:00Z", is_placeholder: false },
  ],
  stageHistory: [
    { deal_id: "d1", to_stage: "novo", occurred_at: "2026-08-02T12:00:00Z", is_baseline: false },
    { deal_id: "d1", to_stage: "ganho", occurred_at: "2026-08-05T12:00:00Z", is_baseline: false },
  ],
  contacts: [{ id: "c1", source: "Indicação" }, { id: "c2", source: null }],
  responses: [
    { first_inbound_at: "2026-08-02T10:00:00Z", first_response_at: "2026-08-02T10:12:00Z", first_response_sent_by: "ai" },
    { first_inbound_at: "2026-08-03T10:00:00Z", first_response_at: null, first_response_sent_by: null },
  ],
  costs: [{ month: "2026-08-01", marketing_cents: 50000, commercial_cents: 30000 }],
  agreements: [{ contact_id: "c1", total_cents: 1200000, status: "active" }],
  payments: [{ contact_id: "c1", amount_cents: 600000, receivable_status: "paid" }],
  lossRows: [{ loss_reason_code: "price", legacy_reason: null }],
  canViewFinance: true,
  coverageStartedAt: "2026-08-01T00:00:00Z",
});

expect(metrics.firstResponse).toMatchObject({ status: "ready", medianMinutes: 12, responded: 1, pending: 1, ai: 1, human: 0 });
expect(metrics.funnel.map((item) => item.reached)).toEqual([2, 1, 1, 1]);
expect(metrics.cac).toMatchObject({ status: "ready", valueCents: 80000, wins: 1 });
expect(metrics.ltv).toEqual({ receivedCents: 600000, contractedCents: 1200000, unlinkedRecords: 0 });
```

Add separate cases for `not_configured`, `no_wins`, finance denied, baseline-only
history, duplicate contacts, `system` already excluded by input, cancelled
agreements/receivables, and odd/even median counts.

- [ ] **Step 2: Run the domain test and verify RED**

Run: `npx vitest run lib/law/legal-crm-metrics.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement exact DTO unions and deterministic formulas**

```ts
export type MetricValue<T> =
  | { status: "ready"; value: T }
  | { status: "empty" }
  | { status: "unavailable"; reason: "missing_cost" | "no_wins" | "no_whatsapp" | "partial_failure" };

export type LegalCrmPeriodKey = "current_month" | "previous_month" | "last_3_months" | "last_6_months";

export type LegalCrmPeriod = {
  key: LegalCrmPeriodKey;
  label: string;
  startIso: string;
  endIso: string;
  startMonth: string;
  endMonth: string;
  isPartial: boolean;
};

export type LegalCrmMetrics = {
  period: LegalCrmPeriod;
  firstResponse: { status: "ready"; medianMinutes: number; responded: number; pending: number; ai: number; human: number } | { status: "empty" | "unavailable"; reason: "no_whatsapp" | "no_conversations" | "partial_failure" };
  leads: { total: number; qualified: number };
  funnel: Array<{ stage: "novo" | "em_contato" | "negociacao" | "ganho"; label: string; reached: number; conversionFromPrevious: number | null }>;
  origins: Array<{ source: string; leads: number; qualified: number; wins: number; conversion: number | null; receivedCents: number | null }>;
  losses: Array<{ code: string; label: string; count: number }>;
  cac: { status: "ready"; valueCents: number; totalCostCents: number; wins: number } | { status: "hidden" | "not_configured" | "no_wins" };
  ltv: { receivedCents: number | null; contractedCents: number | null; unlinkedRecords: number } | null;
  coverage: { partial: boolean; startedAt: string | null };
};
```

Use `Set` for unique contacts, milestone ranks for implicit skipped stages,
sorted response durations for median, and integer-cent arithmetic. Keep the São
Paulo month-boundary conversion in one helper and cover UTC-edge cases in tests.

```ts
const LEGAL_CRM_TIME_ZONE = "America/Sao_Paulo";

function zonedMidnightUtc(year: number, monthIndex: number, day: number) {
  let result = new Date(Date.UTC(year, monthIndex, day));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEGAL_CRM_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(result).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    result = new Date(result.getTime() + (Date.UTC(year, monthIndex, day) - represented));
  }
  return result;
}
```

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npx vitest run lib/law/legal-crm-metrics.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the pure domain module**

```powershell
git add -- lib/law/legal-crm-metrics.ts lib/law/legal-crm-metrics.test.ts
git commit --only -m "feat: calculate legal CRM metrics" -- lib/law/legal-crm-metrics.ts lib/law/legal-crm-metrics.test.ts
```

---

### Task 4: Permission-aware Supabase data adapter

**Files:**
- Create: `lib/law/legal-crm-data.ts`
- Create: `lib/law/legal-crm-data.test.ts`

**Interfaces:**
- Consumes: `buildLegalCrmMetrics`, Supabase schema from Task 2.
- Produces: `loadLegalCrmMetrics(repository, input): Promise<LegalCrmMetrics>` for testable orchestration.
- Produces: `getLegalCrmMetrics(input: { supabase: SupabaseClient; orgId: string; periodKey: LegalCrmPeriodKey; now: Date; canViewFinance: boolean }): Promise<LegalCrmMetrics>` for the dashboard.

- [ ] **Step 1: Write a failing adapter-gating test**

Extract a small repository interface so tests do not mock Supabase internals:

```ts
export interface LegalCrmRepository {
  deals(orgId: string, start: string, end: string): Promise<QueryResult<DealMetricRow[]>>;
  stageHistory(orgId: string, start: string, end: string): Promise<QueryResult<StageMetricRow[]>>;
  contacts(orgId: string): Promise<QueryResult<ContactMetricRow[]>>;
  responses(orgId: string, start: string, end: string): Promise<QueryResult<ResponseMetricRow[]>>;
  costs(orgId: string, startMonth: string, endMonth: string): Promise<QueryResult<CostMetricRow[]>>;
  agreements(orgId: string): Promise<QueryResult<AgreementMetricRow[]>>;
  payments(orgId: string): Promise<QueryResult<PaymentMetricRow[]>>;
}
```

Use a fake repository whose financial methods throw. Assert
`loadLegalCrmMetrics(fake, { canViewFinance: false })` resolves without calling
`costs`, `agreements`, or `payments` and returns `cac.status === "hidden"`.

- [ ] **Step 2: Run the adapter test and verify RED**

Run: `npx vitest run lib/law/legal-crm-data.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement repository orchestration and Supabase adapter**

Run operational queries together, then financial queries only after permission
is known. Every select lists explicit columns and includes organization and
workspace filters. Convert each Supabase `{ data, error }` into:

```ts
export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: T; source: "deals" | "history" | "contacts" | "responses" | "costs" | "agreements" | "payments" };
```

Log only the source name and org id through `logError`; never log row contents.
Pass empty rows plus the failed source to the domain builder so one failed query
marks only dependent metrics unavailable.

```ts
export async function loadLegalCrmMetrics(
  repository: LegalCrmRepository,
  input: { orgId: string; period: LegalCrmPeriod; canViewFinance: boolean },
) {
  const operational = await Promise.all([
    repository.deals(input.orgId, input.period.startIso, input.period.endIso),
    repository.stageHistory(input.orgId, input.period.startIso, input.period.endIso),
    repository.contacts(input.orgId),
    repository.responses(input.orgId, input.period.startIso, input.period.endIso),
  ]);
  const financial = input.canViewFinance
    ? await Promise.all([
        repository.costs(input.orgId, input.period.startMonth, input.period.endMonth),
        repository.agreements(input.orgId),
        repository.payments(input.orgId),
      ])
    : [];
  return buildLegalCrmMetrics(repositoryResultsToMetricInput(operational, financial, input));
}

export async function getLegalCrmMetrics(input: {
  supabase: SupabaseClient;
  orgId: string;
  periodKey: LegalCrmPeriodKey;
  now: Date;
  canViewFinance: boolean;
}) {
  const period = resolveLegalCrmPeriod(input.periodKey, input.now);
  return loadLegalCrmMetrics(createSupabaseLegalCrmRepository(input.supabase), {
    orgId: input.orgId,
    period,
    canViewFinance: input.canViewFinance,
  });
}
```

- [ ] **Step 4: Run domain, adapter, and type tests**

Run: `npx vitest run lib/law/legal-crm-metrics.test.ts lib/law/legal-crm-data.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```powershell
git add -- lib/law/legal-crm-data.ts lib/law/legal-crm-data.test.ts
git commit --only -m "feat: load legal CRM analytics" -- lib/law/legal-crm-data.ts lib/law/legal-crm-data.test.ts
```

---

### Task 5: Monthly acquisition-cost input

**Files:**
- Create: `lib/law/legal-acquisition-cost.ts`
- Create: `lib/law/legal-acquisition-cost.test.ts`
- Create: `app/(dashboard)/painel/juridico/crm-actions.ts`
- Create: `components/legal/legal-acquisition-cost-form.tsx`
- Modify: `lib/law/law-office.ts`

**Interfaces:**
- Produces: `parseLegalAcquisitionCost(formData): LegalAcquisitionCostInput`
- Produces: `saveLegalAcquisitionCost(formData): Promise<void>`
- Produces: `canManageFinance(role, isAdmin): boolean`
- Consumer: commercial dashboard action drawer.

- [ ] **Step 1: Write failing parser and permission tests**

```ts
const form = new FormData();
form.set("month", "2026-08");
form.set("marketing", "500,00");
form.set("commercial", "300,50");
form.set("notes", "Google Ads e triagem");
expect(parseLegalAcquisitionCost(form)).toEqual({
  month: "2026-08-01",
  marketingCents: 50000,
  commercialCents: 30050,
  notes: "Google Ads e triagem",
});
expect(() => parseLegalAcquisitionCost(new FormData())).toThrow("Informe o mês");
expect(canManageFinance("lawyer")).toBe(false);
expect(canManageFinance("finance")).toBe(true);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run lib/law/legal-acquisition-cost.test.ts lib/law/law-office.test.ts`

Expected: FAIL for missing parser/export.

- [ ] **Step 3: Implement parser, authorized upsert, and revalidation**

The action obtains authenticated user, active org, org role, and membership;
rejects unauthorized callers before the write; then executes:

```ts
await supabase.from("law_acquisition_costs").upsert({
  org_id: orgId,
  workspace_key: "law_office",
  month: input.month,
  marketing_cents: input.marketingCents,
  commercial_cents: input.commercialCents,
  notes: input.notes,
  created_by: user.id,
  updated_by: user.id,
}, { onConflict: "org_id,workspace_key,month" });
```

Call `revalidatePath("/painel/juridico")`. Keep the database RLS check as the
second authorization layer.

- [ ] **Step 4: Build the accessible drawer form and test its markup**

Use `ActionDrawer`, `Input`, `Textarea`, and `PendingButton`. The trigger copy is
**Informar custos**, the fields are month, marketing, operação comercial, and
notes, and the helper copy states the exact CAC formula. Override the trigger
class with neutral/blue tokens instead of the drawer's purple default.

```tsx
<ActionDrawer
  label="Informar custos"
  title="Custos de aquisição"
  description="O CAC soma marketing e operação comercial e divide pelos contratos conquistados no mesmo período."
  triggerClassName="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-od-accent px-4 text-xs font-semibold text-white hover:bg-od-accent-hover"
>
  <form action={saveLegalAcquisitionCost} className="space-y-4">
    <Input name="month" type="month" label="Mês" required />
    <Input name="marketing" inputMode="decimal" label="Marketing (R$)" required />
    <Input name="commercial" inputMode="decimal" label="Operação comercial (R$)" required />
    <Textarea name="notes" label="Observações" maxLength={500} />
    <PendingButton pendingLabel="Salvando">Salvar custos</PendingButton>
  </form>
</ActionDrawer>
```

Run: `npx vitest run lib/law/legal-acquisition-cost.test.ts components/ui/primitives.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the cost-input slice**

```powershell
git add -- lib/law/legal-acquisition-cost.ts lib/law/legal-acquisition-cost.test.ts lib/law/law-office.ts 'app/(dashboard)/painel/juridico/crm-actions.ts' components/legal/legal-acquisition-cost-form.tsx
git commit --only -m "feat: capture legal acquisition costs" -- lib/law/legal-acquisition-cost.ts lib/law/legal-acquisition-cost.test.ts lib/law/law-office.ts 'app/(dashboard)/painel/juridico/crm-actions.ts' components/legal/legal-acquisition-cost-form.tsx
```

---

### Task 6: Structured legal loss-reason flow

**Files:**
- Create: `components/legal/legal-loss-reason-dialog.tsx`
- Create: `components/legal/legal-loss-reason-dialog.test.tsx`
- Modify: `app/(dashboard)/painel/funil/Board.tsx`
- Modify: `app/(dashboard)/painel/funil/page.tsx`
- Modify: `app/(dashboard)/painel/actions.ts`

**Interfaces:**
- Produces: `LegalLossReasonDialog({ dealTitle, onCancel, onConfirm })`.
- Modifies: `moveDealToList(id, listName, lossReason?)` with `lossReason?: { code: LegalLossReasonCode; notes: string }`.

- [ ] **Step 1: Write failing dialog and Board contract tests**

Assert that the dialog renders all six categories, a notes field, Cancel and
Confirm controls, `role="dialog"`, `aria-modal="true"`, labelled title, and no
preselected reason. Add a source contract asserting `Board` receives
`isLegal`, intercepts a lost target before optimistic state mutation, and passes
the structured object to `moveDealToList`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run components/legal/legal-loss-reason-dialog.test.tsx components/legal/legal-dashboard.test.ts`

Expected: FAIL because the dialog and legal interception do not exist.

- [ ] **Step 3: Implement the controlled dialog and move interception**

Add Board state with this exact shape:

```ts
type PendingLegalLoss = {
  dealId: string;
  targetList: string;
  previousStage: DealStage;
  previousDetails: Record<string, string>;
} | null;
```

When `isLegal && isLostPipelineList(targetList)`, set the pending value and
return before `setDeals`. On confirm, call the existing optimistic move helper
with `{ code, notes }`. On cancel, clear pending state and leave the deal in its
original list. Escape and backdrop return focus to the triggering card/control.

```tsx
{pendingLegalLoss ? (
  <LegalLossReasonDialog
    dealTitle={deals.find((deal) => deal.id === pendingLegalLoss.dealId)?.title ?? "Atendimento"}
    onCancel={() => setPendingLegalLoss(null)}
    onConfirm={(lossReason) => confirmLegalLoss(pendingLegalLoss, lossReason)}
  />
) : null}
```

- [ ] **Step 4: Enforce the same rule on the server**

In `moveDealToList`, inspect `workspaceKey`. If it is `law_office` and the
target stage is `perdido`, require a known code. Persist `loss_reason_code` and
trimmed `loss_reason_notes`; clear both when a legal deal moves out of lost.
Non-legal workspaces preserve their current behavior. Pass `isLegal` from
`PipelinePage` when `workspaceKey === "law_office"`.

```ts
const legalLoss = workspaceKey === "law_office" && stage === "perdido";
if (legalLoss && (!lossReason || !LEGAL_LOSS_REASON_CODES.includes(lossReason.code))) {
  throw new Error("Informe o motivo da perda.");
}

const lossFields = workspaceKey === "law_office"
  ? {
      loss_reason_code: legalLoss ? lossReason!.code : null,
      loss_reason_notes: legalLoss ? lossReason!.notes.trim().slice(0, 500) || null : null,
    }
  : {};
```

Run: `npx vitest run lib/crm/pipeline-stage.test.ts components/legal/legal-loss-reason-dialog.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the loss-reason slice**

```powershell
git add -- components/legal/legal-loss-reason-dialog.tsx components/legal/legal-loss-reason-dialog.test.tsx 'app/(dashboard)/painel/funil/Board.tsx' 'app/(dashboard)/painel/funil/page.tsx' 'app/(dashboard)/painel/actions.ts'
git commit --only -m "feat: capture legal deal loss reasons" -- components/legal/legal-loss-reason-dialog.tsx components/legal/legal-loss-reason-dialog.test.tsx 'app/(dashboard)/painel/funil/Board.tsx' 'app/(dashboard)/painel/funil/page.tsx' 'app/(dashboard)/painel/actions.ts'
```

---

### Task 7: Approved commercial dashboard section

**Files:**
- Create: `components/legal/legal-crm-performance.tsx`
- Create: `components/legal/legal-crm-performance.test.tsx`
- Modify: `app/(dashboard)/painel/juridico/page.tsx`
- Modify: `components/legal/legal-dashboard.test.ts`

**Interfaces:**
- Consumes: `LegalCrmMetrics`, cost form, `crm_period` search parameter.
- Produces: server-renderable `<LegalCrmPerformance metrics canManageFinance />`.

- [ ] **Step 1: Write failing semantic and visual-contract tests**

Render a ready DTO with `renderToStaticMarkup` and assert:

```ts
expect(html).toContain("Desempenho comercial jurídico");
expect(html).toContain("Tempo de 1ª resposta");
expect(html).toContain("Leads qualificados");
expect(html).toContain("Conversão por etapa");
expect(html).toContain("Origens que mais convertem");
expect(html).toContain("Principais motivos de perda");
expect(html).toContain("LTV recebido");
expect(html).toContain("LTV contratado");
expect(html).not.toContain("grid-cols-4 gap-4");
expect(html).not.toMatch(/divide-[xy]|border-(?:r|b)\b/);
```

Render finance-denied and empty DTOs. Assert no CAC/LTV amounts leak, no `0 min`
appears without WhatsApp data, and the partial-history banner includes its date.

- [ ] **Step 2: Run focused component tests and verify RED**

Run: `npx vitest run components/legal/legal-crm-performance.test.tsx components/legal/legal-dashboard.test.ts`

Expected: FAIL because the component is absent.

- [ ] **Step 3: Implement the approved A-v2 composition**

Build one continuous metric band, a dominant funnel beside origins, then losses
beside the two LTV surfaces. Use semantic `section`, `header`, `dl`, `ol`, and
progress text; bars have visible percentage labels. Use rounded background
groups only for the main metric band and LTV pair. Do not add a border to each
metric or source row.

```tsx
<section aria-labelledby="legal-crm-title" className="space-y-7">
  <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div><h2 id="legal-crm-title">Desempenho comercial jurídico</h2><p>Atendimento, conversão e retorno financeiro</p></div>
    <LegalCrmPeriodFilter period={metrics.period.key} />
  </header>
  <LegalCrmMetricBand metrics={metrics} />
  <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.8fr)]">
    <LegalCrmFunnel items={metrics.funnel} />
    <LegalCrmOrigins items={metrics.origins} />
  </div>
  <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
    <LegalCrmLosses items={metrics.losses} />
    {metrics.ltv ? <LegalCrmLtv value={metrics.ltv} /> : null}
  </div>
</section>
```

Period controls are links preserving unrelated search parameters and setting
`crm_period` to one of the four keys. CAC `not_configured` renders the cost form
only when `canManageFinance` is true.

- [ ] **Step 4: Load the DTO in the legal page without duplicating formulas**

Extend the page search params with `crm_period`. After existing authentication,
organization, membership, and permission checks, call:

```ts
const commercialMetrics = await getLegalCrmMetrics({
  supabase,
  orgId,
  periodKey: normalizeLegalCrmPeriodKey(filters?.crm_period),
  now,
  canViewFinance: canViewFinance(membership?.job_role, isAdmin),
});
```

Render the commercial section after the compact Tim assistant and before the
existing operational metrics. Update the page-level contract so the extracted
component, not the 900-line page, owns the new markup.

Run: `npx vitest run components/legal/legal-crm-performance.test.tsx components/legal/legal-dashboard.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the dashboard slice**

```powershell
git add -- components/legal/legal-crm-performance.tsx components/legal/legal-crm-performance.test.tsx components/legal/legal-dashboard.test.ts 'app/(dashboard)/painel/juridico/page.tsx'
git commit --only -m "feat: add legal CRM performance dashboard" -- components/legal/legal-crm-performance.tsx components/legal/legal-crm-performance.test.tsx components/legal/legal-dashboard.test.ts 'app/(dashboard)/painel/juridico/page.tsx'
```

---

### Task 8: Integration, accessibility, and release-quality verification

**Files:**
- Modify only files that fail a check because of this feature.
- Record results through `scripts/obsidian-log.ps1` once before final handoff.

**Interfaces:**
- Consumes all prior tasks.
- Produces verified local behavior; no remote deployment.

- [ ] **Step 1: Apply migration only to the configured local Supabase**

Run: `npx --no-install supabase status -o json`

Confirm the reported API URL is local. Then run:

`npx --no-install supabase migration up --local`

Expected: migration 0080 applies without resetting or deleting local data.

- [ ] **Step 2: Run integration and focused test suites**

Run: `npm run test:integration -- test/integration/legal-crm-metrics.test.ts`

Run: `npx vitest run lib/crm/pipeline-stage.test.ts lib/law/legal-crm-metrics.test.ts lib/law/legal-crm-data.test.ts lib/law/legal-acquisition-cost.test.ts components/legal/legal-loss-reason-dialog.test.tsx components/legal/legal-crm-performance.test.tsx components/legal/legal-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 3: Run the complete static and build gates**

Run each command separately:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0. Do not describe skipped integration or browser
checks as passing.

- [ ] **Step 4: Verify the authenticated UI at desktop and mobile widths**

At `/painel/juridico`, verify 1440×900 and 390×844:

- no overlap or horizontal overflow;
- metric band has no repeated divider grid;
- funnel remains primary and readable;
- denied financial permission does not render CAC/LTV data;
- empty WhatsApp and missing-cost states are honest;
- cost drawer and loss dialog support keyboard, Escape, focus return, pending,
  success, and error;
- browser console has no errors.

At `/painel/funil`, move a legal deal to lost, cancel once, then confirm with a
reason. Verify cancel keeps the original stage and confirm persists the reason.

- [ ] **Step 5: Inspect the final diff and record the development session**

Run:

```powershell
git diff --check
git status --short
git log --oneline -8
```

Confirm unrelated existing changes and user-staged logo files remain outside
feature commits. Record concise outcome, tests, files, decisions, and remaining
risks with `scripts/obsidian-log.ps1`. Do not include secrets or customer data.

---

## Final Acceptance Checklist

- [ ] All seven commercial readings use real data or an explicit unavailable state.
- [ ] Stage conversions exclude baselines and use the same cohort.
- [ ] IA counts as first response and remains identifiable.
- [ ] CAC aligns costs and wins to the same civil months.
- [ ] Received and contracted LTV remain separate and permission-safe.
- [ ] Multi-tenant RLS and financial roles pass local integration tests.
- [ ] Main dashboard has the approved A-v2 hierarchy without excess cards or lines.
- [ ] Existing legal operations remain intact below the commercial section.
- [ ] Desktop and mobile browser checks show no overlap or horizontal overflow.
- [ ] No remote migration or deployment was performed.
- [ ] Functional rollback can remove the UI without deleting captured analytics data.
