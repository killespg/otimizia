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
  welcome_email_sent_at: string | null;
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
  real_estate_public_page_enabled: boolean;
  real_estate_public_page_token: string;
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

export type RealEstateVisitStatus = "requested" | "scheduled" | "completed" | "no_show" | "cancelled";
export type RealEstateVisitConfirmationStatus = "pending" | "confirmed" | "declined";

export type RealEstateVisit = {
  id: string;
  org_id: string;
  contact_id: string;
  deal_id: string | null;
  property_id: string;
  broker_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: RealEstateVisitStatus;
  confirmation_status: RealEstateVisitConfirmationStatus;
  client_feedback: string | null;
  broker_notes: string | null;
  reminder_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RealEstateOfferStatus = "draft" | "sent" | "viewed" | "countered" | "accepted" | "declined" | "expired";

export type RealEstateOffer = {
  id: string;
  org_id: string;
  contact_id: string;
  deal_id: string;
  property_id: string;
  created_by: string;
  amount_cents: number;
  down_payment_cents: number | null;
  financing_amount_cents: number | null;
  payment_terms: string | null;
  conditions: string | null;
  expires_at: string | null;
  status: RealEstateOfferStatus;
  sent_at: string | null;
  responded_at: string | null;
  parent_offer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RealEstatePropertyDocumentStatus = "pending" | "received" | "waived";

export type RealEstatePropertyDocument = {
  id: string;
  org_id: string;
  property_id: string;
  document_type: string;
  status: RealEstatePropertyDocumentStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type RealEstateCommissionStatus = "expected" | "partial" | "received" | "cancelled";

export type RealEstateCommission = {
  id: string;
  org_id: string;
  deal_id: string;
  property_id: string;
  broker_id: string;
  gross_sale_value_cents: number;
  commission_percent: number;
  expected_amount_cents: number;
  received_amount_cents: number;
  status: RealEstateCommissionStatus;
  due_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RealEstateTarget = {
  id: string;
  org_id: string;
  broker_id: string | null;
  period_start: string;
  period_end: string;
  target_amount_cents: number;
  created_by: string;
  created_at: string;
};

export type SellerSalesModel =
  | "general"
  | "fashion"
  | "durable"
  | "consumable"
  | "made_to_order"
  | "commercial_representative";

export type SellerModule =
  | "catalog"
  | "collections"
  | "variants"
  | "inventory"
  | "orders"
  | "warranties"
  | "consumables"
  | "made_to_order"
  | "commissions"
  | "delivery";

export type SellerBusinessProfile = {
  org_id: string;
  workspace_key: "autonomous_seller";
  sales_models: SellerSalesModel[];
  enabled_modules: SellerModule[];
  default_warranty_days: number;
  low_stock_threshold: number;
  allow_negative_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerCollection = {
  id: string;
  org_id: string;
  workspace_key: "autonomous_seller";
  name: string;
  status: "draft" | "active" | "archived";
  starts_on: string | null;
  ends_on: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SellerProduct = {
  id: string;
  org_id: string;
  workspace_key: "autonomous_seller";
  collection_id: string | null;
  name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  kind: SellerSalesModel;
  status: "draft" | "active" | "inactive";
  description: string | null;
  base_price_cents: number;
  cost_cents: number | null;
  track_stock: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number | null;
  warranty_days: number;
  requires_serial: boolean;
  reorder_interval_days: number | null;
  default_lead_time_days: number | null;
  default_commission_percent: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SellerProductVariant = {
  id: string;
  org_id: string;
  product_id: string;
  name: string;
  sku: string | null;
  attributes: Record<string, string>;
  price_cents: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerProductMedia = {
  id: string;
  org_id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  position: number;
  created_by: string;
  created_at: string;
};

export type SellerInventoryMovement = {
  id: string;
  org_id: string;
  product_id: string;
  variant_id: string | null;
  order_id: string | null;
  movement_type: "initial" | "sale" | "adjustment" | "return" | "reservation" | "reservation_release";
  quantity_delta: number;
  balance_after: number;
  reason: string | null;
  created_by: string;
  created_at: string;
};

export type SellerOrder = {
  id: string;
  org_id: string;
  workspace_key: "autonomous_seller";
  deal_id: string | null;
  contact_id: string | null;
  order_number: string;
  status: "draft" | "confirmed" | "preparing" | "ready" | "delivered" | "completed" | "cancelled";
  payment_status: "pending" | "partial" | "paid" | "refunded";
  payment_method: "cash" | "pix" | "card" | "installments" | "bank_transfer" | "payment_link" | "other" | null;
  delivery_method: "pickup" | "local_delivery" | "carrier" | "customer_address" | "digital" | "other" | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  notes: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SellerOrderItem = {
  id: string;
  org_id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  variant_snapshot: string | null;
  collection_name_snapshot: string | null;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  warranty_days_snapshot: number;
  serial_number: string | null;
  customization_notes: string | null;
  promised_on: string | null;
  reorder_due_on: string | null;
  commission_percent: number;
  commission_cents: number;
  line_total_cents: number;
  created_at: string;
};

export type SellerWarranty = {
  id: string;
  org_id: string;
  order_item_id: string;
  contact_id: string | null;
  product_id: string | null;
  serial_number: string | null;
  starts_on: string;
  expires_on: string;
  status: "active" | "void";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerWarrantyClaim = {
  id: string;
  org_id: string;
  warranty_id: string;
  title: string;
  issue_description: string;
  status: "open" | "analysis" | "assistance" | "replacement_approved" | "refund_approved" | "resolved" | "cancelled";
  resolution: string | null;
  opened_at: string;
  resolved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SellerCustomerProfile = {
  org_id: string;
  contact_id: string;
  clothing_sizes: Record<string, string>;
  measurements: Record<string, string>;
  preferred_colors: string[];
  style_notes: string | null;
  shoe_size: number | null;
  reorder_interval_days: number | null;
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
  whatsapp_opt_out: boolean;
  whatsapp_opt_out_at: string | null;
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
  visit_reminders_enabled: boolean;
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
  profile_pic_url: string | null;
  ia_active: boolean;
  last_message_at: string;
  created_at: string;
};

export type WhatsappMessageDirection = "inbound" | "outbound";
export type WhatsappMessageType = "text" | "image" | "audio" | "document" | "unsupported";
export type WhatsappSentBy = "ai" | "human" | "contact" | "system";
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
