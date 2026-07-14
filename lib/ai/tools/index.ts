import type { SupabaseClient } from "@supabase/supabase-js";
import { CRM_TOOLS, isMutatingTool } from "./definitions";
import {
  getBusinessSummary,
  getContact,
  getWorkspaceCustomization,
  listContacts,
  listDeals,
  listTasks,
} from "./read";
import { createProperty, getProperty, searchProperties, updateProperty } from "./properties";
import {
  attachPropertyToDeal,
  createPropertyShowcase,
  getClientPreferences,
  matchPropertiesForClient,
  updateClientPreferences,
} from "./preferences";
import type { ToolInput } from "./types";
import { str } from "./validation";
import {
  createContact,
  createDeal,
  createTask,
  deleteRow,
  logInteraction,
  moveDeal,
  toggleTask,
  updateContact,
  updateDashboardPreferencesByAi,
  updateOrganizationContextByAi,
  updateWorkspaceLabelsByAi,
} from "./write";

export { CRM_TOOLS, isMutatingTool };

export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  name: string,
  rawInput: unknown
): Promise<string> {
  const input = (rawInput ?? {}) as ToolInput;

  switch (name) {
    case "list_contacts":
      return listContacts(supabase, orgId, workspaceKey, input);
    case "get_contact":
      return getContact(supabase, orgId, workspaceKey, input);
    case "list_deals":
      return listDeals(supabase, orgId, workspaceKey, input);
    case "list_tasks":
      return listTasks(supabase, orgId, workspaceKey, input);
    case "get_business_summary":
      return getBusinessSummary(supabase, orgId, workspaceKey);
    case "get_workspace_customization":
      return getWorkspaceCustomization(supabase, userId, orgId, workspaceKey);
    case "search_properties":
      return searchProperties(supabase, orgId, workspaceKey, input);
    case "get_property":
      return getProperty(supabase, orgId, workspaceKey, input);
    case "create_property":
      return createProperty(supabase, userId, orgId, workspaceKey, input);
    case "update_property":
      return updateProperty(supabase, orgId, workspaceKey, input);
    case "get_client_preferences":
      return getClientPreferences(supabase, orgId, workspaceKey, input);
    case "update_client_preferences":
      return updateClientPreferences(supabase, orgId, workspaceKey, input);
    case "match_properties_for_client":
      return matchPropertiesForClient(supabase, orgId, workspaceKey, input);
    case "attach_property_to_deal":
      return attachPropertyToDeal(supabase, orgId, workspaceKey, input);
    case "create_property_showcase":
      return createPropertyShowcase(supabase, userId, orgId, workspaceKey, input);
    case "create_contact":
      return createContact(supabase, userId, orgId, workspaceKey, input);
    case "update_contact":
      return updateContact(supabase, orgId, workspaceKey, input);
    case "log_interaction":
      return logInteraction(supabase, userId, orgId, workspaceKey, input);
    case "create_deal":
      return createDeal(supabase, userId, orgId, workspaceKey, input);
    case "move_deal":
      return moveDeal(supabase, orgId, workspaceKey, input);
    case "create_task":
      return createTask(supabase, userId, orgId, workspaceKey, input);
    case "toggle_task":
      return toggleTask(supabase, orgId, workspaceKey, input);
    case "update_dashboard_preferences":
      return updateDashboardPreferencesByAi(supabase, userId, workspaceKey, input);
    case "update_workspace_labels":
      return updateWorkspaceLabelsByAi(supabase, orgId, workspaceKey, input);
    case "update_organization_context":
      return updateOrganizationContextByAi(supabase, orgId, input);
    case "delete_contact":
      return deleteRow(supabase, orgId, workspaceKey, "contacts", str(input.contato_id, "contato_id"), "Contato excluído.");
    case "delete_deal":
      return deleteRow(supabase, orgId, workspaceKey, "deals", str(input.venda_id, "venda_id"), "Venda excluída.");
    case "delete_task":
      return deleteRow(supabase, orgId, workspaceKey, "tasks", str(input.lembrete_id, "lembrete_id"), "Lembrete excluído.");
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}
