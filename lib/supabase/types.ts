export type DealStage =
  | "novo"
  | "em_contato"
  | "negociacao"
  | "ganho"
  | "perdido";

export const DEAL_STAGES: { key: DealStage; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "em_contato", label: "Em contato" },
  { key: "negociacao", label: "Proposta" },
  { key: "ganho", label: "Ganho" },
  { key: "perdido", label: "Perdido" },
];

export type Profile = {
  id: string;
  name: string | null;
  profession_type: string;
  profession_types: string[];
  cpf: string | null;
  terms_accepted_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "pro";
  plan_status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  owner_id: string;
  workspace_key: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  details: Record<string, string>;
  created_at: string;
};

export type Deal = {
  id: string;
  owner_id: string;
  workspace_key: string;
  contact_id: string | null;
  title: string;
  value_cents: number;
  stage: DealStage;
  position: number;
  details: Record<string, string>;
  created_at: string;
  closed_at: string | null;
};

export type Task = {
  id: string;
  owner_id: string;
  workspace_key: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
};

export type Interaction = {
  id: string;
  owner_id: string;
  workspace_key: string;
  contact_id: string;
  body: string;
  created_at: string;
};
