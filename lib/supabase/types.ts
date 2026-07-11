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
  email: string | null;
  profession_type: string;
  profession_types: string[];
  is_admin: boolean;
  cpf: string | null;
  terms_accepted_at: string | null;
  active_org_id: string | null;
  checklist_dismissed_at: string | null;
  dashboard_preferences: Record<string, unknown>;
  favorite_tribunals: string[];
  created_at: string;
};

export type OrgRole = "admin" | "member";
export type JobRole =
  | "owner"
  | "managing_partner"
  | "lawyer"
  | "paralegal"
  | "finance"
  | "receptionist"
  | "intern"
  | "staff";

export type Organization = {
  id: string;
  name: string;
  workspace_preferences: Record<string, unknown>;
  business_context: string | null;
  business_priorities: string | null;
  ai_tone: string | null;
  ai_instructions: string | null;
  industry: string | null;
  region: string | null;
  team_size: string | null;
  website: string | null;
  extra_notes: string | null;
  onboarded_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "pro";
  plan_status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

export type OrganizationMember = {
  org_id: string;
  user_id: string;
  role: OrgRole;
  job_role: JobRole;
  created_at: string;
};

export type LegalCaseStatus = "intake" | "active" | "waiting" | "suspended" | "closed" | "archived";
export type LegalCase = {
  id: string;
  org_id: string;
  workspace_key: "law_office";
  contact_id: string | null;
  deal_id: string | null;
  responsible_id: string | null;
  created_by: string;
  title: string;
  case_number: string | null;
  area: string | null;
  court: string | null;
  jurisdiction: string | null;
  opposing_party: string | null;
  status: LegalCaseStatus;
  risk_level: "low" | "standard" | "high" | "critical";
  confidentiality: "team" | "restricted";
  next_deadline_at: string | null;
  summary: string | null;
  datajud_tribunal_alias: string | null;
  datajud_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FeeAgreement = {
  id: string;
  org_id: string;
  contact_id: string | null;
  case_id: string | null;
  deal_id: string | null;
  title: string;
  fee_type: "fixed" | "recurring" | "stage" | "hourly" | "success" | "consultation";
  total_cents: number;
  success_percent: number | null;
  success_basis: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  signed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Receivable = {
  id: string;
  org_id: string;
  agreement_id: string | null;
  contact_id: string | null;
  case_id: string | null;
  description: string;
  category: "office_fee" | "success_fee" | "consultation" | "reimbursement" | "client_funds";
  installment_number: number | null;
  installment_total: number | null;
  original_cents: number;
  paid_cents: number;
  due_date: string;
  status: "pending" | "partial" | "paid" | "cancelled";
  notes: string | null;
  created_at: string;
};

export type LegalDeadline = {
  id: string; org_id: string; case_id: string; assigned_to: string | null; created_by: string;
  title: string; deadline_type: "procedural" | "hearing" | "internal" | "client" | "administrative";
  due_at: string; status: "pending" | "completed" | "cancelled"; priority: "low" | "normal" | "high" | "critical";
  completed_at: string | null; notes: string | null; created_at: string; updated_at: string;
};

export type LegalCaseEvent = {
  id: string; org_id: string; case_id: string; created_by: string;
  event_type: "update" | "filing" | "decision" | "hearing" | "communication" | "note";
  title: string; description: string | null; occurred_at: string; created_at: string;
  external_ref: string | null;
};

export type LegalDocument = {
  id: string; org_id: string; case_id: string; uploaded_by: string; name: string;
  document_type: "petition" | "contract" | "evidence" | "decision" | "power_of_attorney" | "client_document" | "other";
  storage_path: string | null; external_url: string | null; version: number;
  status: "draft" | "review" | "approved" | "filed" | "archived"; notes: string | null; created_at: string; updated_at: string;
};

export type Contact = {
  id: string;
  owner_id: string;
  org_id: string;
  workspace_key: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  details: Record<string, string>;
  created_at: string;
};

export type Deal = {
  id: string;
  owner_id: string;
  org_id: string;
  workspace_key: string;
  contact_id: string | null;
  assignee_id: string | null;
  pending_assignee_id: string | null;
  title: string;
  value_cents: number | null;
  stage: DealStage;
  position: number;
  details: Record<string, string>;
  created_at: string;
  closed_at: string | null;
};

export type Task = {
  id: string;
  owner_id: string;
  org_id: string;
  workspace_key: string;
  assignee_id: string | null;
  pending_assignee_id: string | null;
  reviewer_id: string | null;
  review_status: "not_required" | "in_progress" | "submitted" | "changes_requested" | "approved";
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
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
  org_id: string;
  workspace_key: string;
  contact_id: string;
  body: string;
  created_at: string;
};

export type WhatsappInstanceStatus = "pendente" | "conectado" | "desconectado";
export type WhatsappInstance = {
  id: string;
  org_id: string;
  instance_name: string;
  status: WhatsappInstanceStatus;
  phone_number: string | null;
  created_at: string;
};

export type WhatsappConversation = {
  id: string;
  org_id: string;
  contact_id: string | null;
  phone_number: string;
  contact_name: string | null;
  ia_active: boolean;
  last_message_at: string;
  created_at: string;
};

export type WhatsappMessageDirection = "inbound" | "outbound";
export type WhatsappMessageType = "text" | "image" | "audio" | "document" | "unsupported";
export type WhatsappSentBy = "ai" | "human" | "contact";
export type WhatsappMessage = {
  id: string;
  conversation_id: string;
  org_id: string;
  direction: WhatsappMessageDirection;
  message_type: WhatsappMessageType;
  content: string | null;
  media_url: string | null;
  sent_by: WhatsappSentBy;
  read_at: string | null;
  created_at: string;
};
