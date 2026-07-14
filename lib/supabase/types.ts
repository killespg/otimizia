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
  calendar_ics_token: string;
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
  | "staff"
  | "broker"
  | "agent"
  | "assistant";

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
  real_estate_v2_enabled: boolean;
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
  datajud_sync_failed_count: number;
  datajud_next_sync_after: string | null;
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
  completed_at: string | null; notes: string | null; client_visible: boolean; created_at: string; updated_at: string;
};

export type LegalCaseEvent = {
  id: string; org_id: string; case_id: string; created_by: string;
  event_type: "update" | "filing" | "decision" | "hearing" | "communication" | "note";
  title: string; description: string | null; occurred_at: string; client_visible: boolean; created_at: string;
  external_ref: string | null;
};

export type LegalWatchedProcess = {
  id: string;
  org_id: string;
  tribunal_alias: string;
  case_number: string;
  case_id: string | null;
  label: string | null;
  last_movement_nome: string | null;
  last_movement_at: string | null;
  last_synced_at: string | null;
  datajud_sync_failed_count: number;
  datajud_next_sync_after: string | null;
  seen_at: string | null;
  created_by: string;
  created_at: string;
};

export type LegalExpense = {
  id: string; org_id: string; case_id: string | null; contact_id: string | null; created_by: string;
  description: string; category: "court_fee" | "travel" | "registry" | "expert" | "correspondent" | "copy" | "other";
  amount_cents: number; expense_date: string; reimbursable: boolean; reimbursed: boolean; notes: string | null; created_at: string;
};

export type LegalCaseMember = { case_id: string; user_id: string; role: "lead" | "collaborator" | "viewer"; created_at: string };

export type LegalCaseShareLink = {
  id: string; org_id: string; case_id: string; token: string; created_by: string; label: string | null;
  revoked_at: string | null; expires_at: string | null; last_accessed_at: string | null; view_count: number; created_at: string;
};

export type LegalDocument = {
  id: string; org_id: string; case_id: string; uploaded_by: string; name: string;
  document_type: "petition" | "contract" | "evidence" | "decision" | "power_of_attorney" | "client_document" | "other";
  storage_path: string | null; external_url: string | null; content: string | null; generated_by_ai: boolean; version: number;
  status: "draft" | "review" | "approved" | "filed" | "archived"; notes: string | null; client_visible: boolean; created_at: string; updated_at: string;
};

export type LegalDocumentSignature = {
  id: string; org_id: string; document_id: string; autentique_document_id: string;
  status: "pending" | "viewed" | "signed" | "rejected" | "delivery_failed";
  signer_name: string; signer_email: string; signed_file_url: string | null;
  sent_by: string; created_at: string; updated_at: string;
};

export type RealEstatePropertyType =
  | "apartamento" | "casa" | "cobertura" | "terreno" | "comercial" | "sala" | "galpao" | "rural" | "outro";
export type RealEstateTransactionType = "venda" | "aluguel" | "venda_aluguel";
export type RealEstatePropertyStatus = "rascunho" | "ativo" | "reservado" | "vendido" | "alugado" | "inativo";

export type AiSuggestedField = { value: string; source: string; confidence?: number; suggested_at?: string };

export type RealEstateProperty = {
  id: string;
  org_id: string;
  workspace_key: "real_estate_broker";
  created_by: string;
  assignee_id: string | null;
  owner_contact_id: string | null;
  captured_by: string | null;
  capture_source: string | null;
  exclusive_listing: boolean;
  exclusive_until: string | null;
  commission_percent: number | null;
  registration_number: string | null;
  occupancy_status: string | null;
  key_location: string | null;
  listing_quality_score: number | null;
  title: string;
  property_type: RealEstatePropertyType;
  transaction_type: RealEstateTransactionType;
  status: RealEstatePropertyStatus;
  price_cents: number | null;
  rent_price_cents: number | null;
  condo_fee_cents: number | null;
  iptu_cents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  area_m2: number | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  ai_suggested_fields: Record<string, AiSuggestedField>;
  extra_features: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type RealEstatePropertyMedia = {
  id: string;
  org_id: string;
  property_id: string;
  storage_path: string;
  position: number;
  created_by: string;
  created_at: string;
};

export type RealEstateShareCollection = {
  id: string;
  org_id: string;
  workspace_key: "real_estate_broker";
  token: string;
  created_by: string;
  title: string;
  client_contact_id: string | null;
  deal_id: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  view_count: number;
  created_at: string;
};

export type RealEstateShareCollectionItem = {
  id: string;
  collection_id: string;
  org_id: string;
  property_id: string;
  position: number;
  created_at: string;
};

export type RealEstatePropertyReaction = "interessado" | "sem_interesse" | "quero_visitar";
export type RealEstatePropertyReactionRow = {
  id: string;
  org_id: string;
  collection_id: string;
  property_id: string;
  reaction: RealEstatePropertyReaction;
  created_at: string;
  updated_at: string;
};

export type RealEstateMatchCriterion = { points: number; max: number; reason: string };
export type RealEstateMatchExplanation = Record<string, RealEstateMatchCriterion>;

export type RealEstateLeadPreferences = {
  id: string;
  org_id: string;
  contact_id: string;
  deal_id: string | null;
  transaction_type: RealEstateTransactionType | null;
  property_types: RealEstatePropertyType[];
  min_price_cents: number | null;
  max_price_cents: number | null;
  neighborhoods: string[];
  cities: string[];
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  min_parking_spots: number | null;
  min_area_m2: number | null;
  required_features: Record<string, string>;
  desired_features: Record<string, string>;
  financing_needed: boolean | null;
  move_deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RealEstateDealPropertyStatus =
  | "suggested" | "selected" | "sent" | "viewed" | "interested" | "rejected" | "visit_scheduled" | "offer" | "won";
export type RealEstateDealPropertySource = "manual" | "ai_match" | "share_collection";

export type RealEstateDealProperty = {
  id: string;
  org_id: string;
  deal_id: string;
  property_id: string;
  match_score: number | null;
  match_explanation: RealEstateMatchExplanation;
  status: RealEstateDealPropertyStatus;
  source: RealEstateDealPropertySource;
  sent_at: string | null;
  viewed_at: string | null;
  reaction: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
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
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrence_spawned: boolean;
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

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  daily_push: boolean;
  daily_summary_email: boolean;
  stalled_deal_email: boolean;
  updated_at: string;
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
