import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  getLocalSupabaseConfig,
  getPersonalOrgId,
} from "./helpers";

const config = getLocalSupabaseConfig();
if (!config) {
  throw new Error(
    "Supabase local indisponível. Rode `npx --no-install supabase start` antes da integração.",
  );
}

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

describe("instrumentação das métricas comerciais jurídicas", () => {
  let admin: SupabaseClient;
  let owner: TestUser;
  let outsider: TestUser;
  let lawyer: TestUser;
  let finance: TestUser;
  let organizationId: string;
  const personalOrganizationIds: string[] = [];

  beforeAll(async () => {
    admin = adminClient(config);
    owner = await createTestUser(config, admin);
    outsider = await createTestUser(config, admin);
    lawyer = await createTestUser(config, admin);
    finance = await createTestUser(config, admin);

    organizationId = await getPersonalOrgId(admin, owner.userId);
    personalOrganizationIds.push(
      organizationId,
      await getPersonalOrgId(admin, outsider.userId),
      await getPersonalOrgId(admin, lawyer.userId),
      await getPersonalOrgId(admin, finance.userId),
    );

    const { error: membershipError } = await admin.from("organization_members").insert([
      {
        org_id: organizationId,
        user_id: lawyer.userId,
        role: "member",
        job_role: "lawyer",
      },
      {
        org_id: organizationId,
        user_id: finance.userId,
        role: "member",
        job_role: "finance",
      },
    ]);
    expect(membershipError).toBeNull();
  });

  afterAll(async () => {
    if (!admin) return;

    if (organizationId) {
      await admin
        .from("law_acquisition_costs")
        .delete()
        .eq("org_id", organizationId)
        .eq("workspace_key", "law_office");
      await admin.from("whatsapp_conversations").delete().eq("org_id", organizationId);
      await admin
        .from("deals")
        .delete()
        .eq("org_id", organizationId)
        .eq("workspace_key", "law_office");
      await admin
        .from("contacts")
        .delete()
        .eq("org_id", organizationId)
        .eq("workspace_key", "law_office");
    }

    for (const user of [owner, outsider, lawyer, finance]) {
      if (user?.userId) await deleteTestUser(admin, user.userId);
    }
    for (const orgId of personalOrganizationIds) {
      await admin.from("organizations").delete().eq("id", orgId);
    }
  });

  it("registra somente inserts e mudanças reais de etapa legal com o ator seguro", async () => {
    const { data: contact, error: contactError } = await owner.client
      .from("contacts")
      .insert({
        owner_id: owner.userId,
        org_id: organizationId,
        workspace_key: "law_office",
        name: "Cliente trabalhista",
      })
      .select("id")
      .single();
    expect(contactError).toBeNull();

    const { data: deal, error: dealError } = await owner.client
      .from("deals")
      .insert({
        owner_id: owner.userId,
        org_id: organizationId,
        workspace_key: "law_office",
        contact_id: contact!.id,
        title: "Consulta trabalhista",
        stage: "novo",
      })
      .select("id")
      .single();
    expect(dealError).toBeNull();

    const stageUpdate = await owner.client
      .from("deals")
      .update({ stage: "em_contato" })
      .eq("id", deal!.id)
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(stageUpdate.error).toBeNull();

    const noOpUpdate = await owner.client
      .from("deals")
      .update({ stage: "em_contato" })
      .eq("id", deal!.id)
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(noOpUpdate.error).toBeNull();

    const { data: history, error: historyError } = await owner.client
      .from("deal_stage_history")
      .select("id,contact_id,from_stage,to_stage,actor_id,is_baseline")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .eq("deal_id", deal!.id)
      .order("occurred_at")
      .order("id");
    expect(historyError).toBeNull();
    expect(history).toEqual([
      {
        id: expect.any(String),
        contact_id: contact!.id,
        from_stage: null,
        to_stage: "novo",
        actor_id: owner.userId,
        is_baseline: false,
      },
      {
        id: expect.any(String),
        contact_id: contact!.id,
        from_stage: "novo",
        to_stage: "em_contato",
        actor_id: owner.userId,
        is_baseline: false,
      },
    ]);

    const { data: otherWorkspaceDeal, error: otherWorkspaceError } = await owner.client
      .from("deals")
      .insert({
        owner_id: owner.userId,
        org_id: organizationId,
        workspace_key: "autonomous_seller",
        title: "Negócio fora do jurídico",
        stage: "novo",
      })
      .select("id")
      .single();
    expect(otherWorkspaceError).toBeNull();

    const { data: otherHistory, error: otherHistoryError } = await owner.client
      .from("deal_stage_history")
      .select("id")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .eq("deal_id", otherWorkspaceDeal!.id);
    expect(otherHistoryError).toBeNull();
    expect(otherHistory).toEqual([]);
  });

  it("mantém o histórico somente leitura para membros e invisível fora da organização", async () => {
    const { data: deal, error: dealError } = await owner.client
      .from("deals")
      .insert({
        owner_id: owner.userId,
        org_id: organizationId,
        workspace_key: "law_office",
        title: "Histórico imutável",
        stage: "novo",
      })
      .select("id")
      .single();
    expect(dealError).toBeNull();

    const { data: history, error: historyError } = await owner.client
      .from("deal_stage_history")
      .select("id")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .eq("deal_id", deal!.id)
      .single();
    expect(historyError).toBeNull();

    const forgedRow = {
      org_id: organizationId,
      workspace_key: "law_office",
      deal_id: deal!.id,
      to_stage: "ganho",
      occurred_at: "2026-08-14T12:00:00.000Z",
    };
    expect((await owner.client.from("deal_stage_history").insert(forgedRow)).error).not.toBeNull();
    expect((await outsider.client.from("deal_stage_history").insert(forgedRow)).error).not.toBeNull();
    expect(
      (
        await owner.client
          .from("deal_stage_history")
          .update({ to_stage: "ganho" })
          .eq("id", history!.id)
          .eq("org_id", organizationId)
          .eq("workspace_key", "law_office")
      ).error,
    ).not.toBeNull();
    expect(
      (
        await owner.client
          .from("deal_stage_history")
          .delete()
          .eq("id", history!.id)
          .eq("org_id", organizationId)
          .eq("workspace_key", "law_office")
      ).error,
    ).not.toBeNull();

    const { data: outsiderHistory, error: outsiderReadError } = await outsider.client
      .from("deal_stage_history")
      .select("id")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .eq("deal_id", deal!.id);
    expect(outsiderReadError).toBeNull();
    expect(outsiderHistory).toEqual([]);
  });

  it("recalcula primeira entrada e primeira resposta em inserts, updates e deletes", async () => {
    const suffix = owner.userId.replace(/\D/g, "").slice(0, 8).padEnd(8, "0");
    const { data: conversation, error: conversationError } = await owner.client
      .from("whatsapp_conversations")
      .insert({
        org_id: organizationId,
        phone_number: `5511${suffix}`,
        contact_name: "Contato de resposta",
      })
      .select("id")
      .single();
    expect(conversationError).toBeNull();

    const readMarkers = async () => {
      const result = await owner.client
        .from("whatsapp_conversations")
        .select("first_inbound_at,first_response_at,first_response_sent_by")
        .eq("org_id", organizationId)
        .eq("id", conversation!.id)
        .single();
      expect(result.error).toBeNull();
      return result.data;
    };

    const { data: inbound, error: inboundError } = await owner.client
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation!.id,
        org_id: organizationId,
        direction: "inbound",
        sent_by: "contact",
        content: "Preciso de orientação",
        created_at: "2026-08-14T12:00:00.000Z",
      })
      .select("id")
      .single();
    expect(inboundError).toBeNull();
    expect(await readMarkers()).toEqual({
      first_inbound_at: "2026-08-14T12:00:00+00:00",
      first_response_at: null,
      first_response_sent_by: null,
    });

    const systemInsert = await owner.client.from("whatsapp_messages").insert({
      conversation_id: conversation!.id,
      org_id: organizationId,
      direction: "outbound",
      sent_by: "system",
      content: "Mensagem operacional",
      created_at: "2026-08-14T12:01:00.000Z",
    });
    expect(systemInsert.error).toBeNull();
    expect((await readMarkers())?.first_response_at).toBeNull();

    const { data: aiMessage, error: aiError } = await owner.client
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation!.id,
        org_id: organizationId,
        direction: "outbound",
        sent_by: "ai",
        content: "Resposta da IA",
        created_at: "2026-08-14T12:05:00.000Z",
      })
      .select("id")
      .single();
    expect(aiError).toBeNull();
    expect(await readMarkers()).toEqual({
      first_inbound_at: "2026-08-14T12:00:00+00:00",
      first_response_at: "2026-08-14T12:05:00+00:00",
      first_response_sent_by: "ai",
    });

    const { data: humanMessage, error: humanError } = await owner.client
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation!.id,
        org_id: organizationId,
        direction: "outbound",
        sent_by: "human",
        content: "Resposta humana anterior",
        created_at: "2026-08-14T12:03:00.000Z",
      })
      .select("id")
      .single();
    expect(humanError).toBeNull();
    expect((await readMarkers())?.first_response_sent_by).toBe("human");

    const aiUpdate = await owner.client
      .from("whatsapp_messages")
      .update({ created_at: "2026-08-14T12:02:00.000Z" })
      .eq("id", aiMessage!.id)
      .eq("org_id", organizationId);
    expect(aiUpdate.error).toBeNull();
    expect(await readMarkers()).toMatchObject({
      first_response_at: "2026-08-14T12:02:00+00:00",
      first_response_sent_by: "ai",
    });

    const aiDelete = await owner.client
      .from("whatsapp_messages")
      .delete()
      .eq("id", aiMessage!.id)
      .eq("org_id", organizationId);
    expect(aiDelete.error).toBeNull();
    expect(await readMarkers()).toMatchObject({
      first_response_at: "2026-08-14T12:03:00+00:00",
      first_response_sent_by: "human",
    });

    const humanUpdate = await owner.client
      .from("whatsapp_messages")
      .update({ sent_by: "system" })
      .eq("id", humanMessage!.id)
      .eq("org_id", organizationId);
    expect(humanUpdate.error).toBeNull();
    expect((await readMarkers())?.first_response_at).toBeNull();

    const inboundDelete = await owner.client
      .from("whatsapp_messages")
      .delete()
      .eq("id", inbound!.id)
      .eq("org_id", organizationId);
    expect(inboundDelete.error).toBeNull();
    expect(await readMarkers()).toEqual({
      first_inbound_at: null,
      first_response_at: null,
      first_response_sent_by: null,
    });

    const forgedMarkers = await owner.client
      .from("whatsapp_conversations")
      .update({ first_response_at: "2026-08-14T12:00:30.000Z" })
      .eq("id", conversation!.id)
      .eq("org_id", organizationId);
    expect(forgedMarkers.error).not.toBeNull();
  });

  it("autoriza custos somente para quem pode gerenciar finanças e isola tenants", async () => {
    const ownerCost = await owner.client.from("law_acquisition_costs").insert({
      org_id: organizationId,
      workspace_key: "law_office",
      month: "2026-08-01",
      marketing_cents: 50_000,
      commercial_cents: 30_000,
      created_by: owner.userId,
      updated_by: owner.userId,
    });
    expect(ownerCost.error).toBeNull();

    const financeCost = await finance.client.from("law_acquisition_costs").insert({
      org_id: organizationId,
      workspace_key: "law_office",
      month: "2026-09-01",
      marketing_cents: 10_000,
      commercial_cents: 5_000,
      created_by: finance.userId,
      updated_by: finance.userId,
    });
    expect(financeCost.error).toBeNull();

    const lawyerWrite = await lawyer.client.from("law_acquisition_costs").insert({
      org_id: organizationId,
      workspace_key: "law_office",
      month: "2026-10-01",
      marketing_cents: 1,
      commercial_cents: 1,
      created_by: lawyer.userId,
      updated_by: lawyer.userId,
    });
    expect(lawyerWrite.error).not.toBeNull();

    const { data: lawyerRead, error: lawyerReadError } = await lawyer.client
      .from("law_acquisition_costs")
      .select("id")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(lawyerReadError).toBeNull();
    expect(lawyerRead).toEqual([]);

    const { data: outsiderRead, error: outsiderReadError } = await outsider.client
      .from("law_acquisition_costs")
      .select("id")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(outsiderReadError).toBeNull();
    expect(outsiderRead).toEqual([]);

    const { data: financeRead, error: financeReadError } = await finance.client
      .from("law_acquisition_costs")
      .select("month")
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .order("month");
    expect(financeReadError).toBeNull();
    expect(financeRead).toEqual([{ month: "2026-08-01" }, { month: "2026-09-01" }]);
  });
});
