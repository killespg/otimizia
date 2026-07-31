export type PersonalExportDataset = {
  key: string;
  table: string;
  userColumn: "owner_id" | "user_id";
  select: string;
};

/**
 * Exportação LGPD da conta, não backup da organização.
 *
 * Cada conjunto precisa ter vínculo direto e verificável com o usuário
 * autenticado. Colunas de autenticação do navegador, tokens públicos, segredos
 * de integração e registros pertencentes a colegas ficam fora do contrato.
 */
export const PERSONAL_EXPORT_DATASETS: PersonalExportDataset[] = [
  {
    key: "contacts",
    table: "contacts",
    userColumn: "owner_id",
    select:
      "id,owner_id,org_id,workspace_key,name,phone,email,company,source,notes,details,instagram,whatsapp_opt_out,whatsapp_opt_out_at,created_at",
  },
  {
    key: "deals",
    table: "deals",
    userColumn: "owner_id",
    select:
      "id,owner_id,org_id,workspace_key,contact_id,title,value_cents,stage,position,details,closed_at,assignee_id,pending_assignee_id,created_at",
  },
  {
    key: "tasks",
    table: "tasks",
    userColumn: "owner_id",
    select:
      "id,owner_id,org_id,workspace_key,contact_id,deal_id,title,due_at,done,assignee_id,pending_assignee_id,reviewer_id,review_status,submitted_at,reviewed_at,review_note,recurrence,recurrence_spawned,created_at",
  },
  {
    key: "interactions",
    table: "interactions",
    userColumn: "owner_id",
    select:
      "id,owner_id,org_id,workspace_key,contact_id,body,created_at",
  },
  {
    key: "assistant_messages",
    table: "assistant_messages",
    userColumn: "user_id",
    select: "id,org_id,user_id,role,content,created_at",
  },
  {
    key: "voice_sessions",
    table: "voice_sessions",
    userColumn: "owner_id",
    select:
      "id,owner_id,started_at,last_heartbeat_at,closed_at",
  },
  {
    key: "voice_usage",
    table: "voice_usage",
    userColumn: "owner_id",
    select: "owner_id,year_month,seconds_used,updated_at",
  },
  {
    key: "notification_preferences",
    table: "notification_preferences",
    userColumn: "user_id",
    select:
      "user_id,daily_push,daily_summary_email,stalled_deal_email,updated_at",
  },
  {
    key: "consent_history",
    table: "cookie_consent_logs",
    userColumn: "user_id",
    select:
      "id,visitor_id,user_id,policy_version,action,analytics,marketing,user_agent,created_at",
  },
  {
    key: "browser_devices",
    table: "push_subscriptions",
    userColumn: "user_id",
    select: "id,user_id,user_agent,created_at",
  },
  {
    key: "legal_case_memberships",
    table: "legal_case_members",
    userColumn: "user_id",
    select: "case_id,user_id,role,created_at",
  },
];

export const ACCOUNT_PROFILE_COLUMNS = [
  "id",
  "name",
  "email",
  "profession_type",
  "profession_types",
  "cpf",
  "terms_accepted_at",
  "plan",
  "plan_status",
  "trial_ends_at",
  "current_period_end",
  "active_org_id",
  "dashboard_preferences",
  "checklist_dismissed_at",
  "favorite_tribunals",
  "real_estate_v2_intro_dismissed_at",
  "welcome_email_sent_at",
  "created_at",
].join(",");

// Identificação da afiliação apenas. Contexto comercial, instruções da IA,
// preferências do workspace e identificadores de cobrança são dados da empresa.
export const ORGANIZATION_AFFILIATION_COLUMNS =
  "id,name,created_at";
