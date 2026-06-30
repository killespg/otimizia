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

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  title: string;
  value_cents: number;
  stage: DealStage;
  position: number;
  created_at: string;
  closed_at: string | null;
};

export type Task = {
  id: string;
  owner_id: string;
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
  contact_id: string;
  body: string;
  created_at: string;
};
