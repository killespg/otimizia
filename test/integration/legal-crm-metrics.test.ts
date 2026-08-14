import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
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

function localDatabaseContainer() {
  const configFile = readFileSync("supabase/config.toml", "utf8");
  const projectId = configFile.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId) throw new Error("project_id local não encontrado em supabase/config.toml");
  return `supabase_db_${projectId}`;
}

function localSql(sql: string) {
  return execFileSync(
    "docker",
    ["exec", localDatabaseContainer(), "psql", "-U", "postgres", "-d", "postgres", "-At", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

async function waitFor(
  condition: () => boolean,
  description: string,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout esperando ${description}`);
}

async function waitForOutput(
  process: ChildProcessWithoutNullStreams,
  marker: string,
  timeoutMs = 8_000,
) {
  let output = "";
  const onData = (chunk: Buffer) => {
    output += chunk.toString();
  };
  process.stdout.on("data", onData);
  try {
    await waitFor(() => output.includes(marker), marker, timeoutMs);
  } finally {
    process.stdout.off("data", onData);
  }
}

async function holdConversationLock(orgId: string, conversationId: string) {
  const process = spawn(
    "docker",
    [
      "exec",
      "-i",
      localDatabaseContainer(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      `org_id=${orgId}`,
      "-v",
      `conversation_id=${conversationId}`,
      "-At",
    ],
    { stdio: "pipe" },
  );
  process.stdin.write(
    "begin;\n" +
      "select id from public.whatsapp_conversations " +
      "where org_id = :'org_id'::uuid and id = :'conversation_id'::uuid for update;\n" +
      "\\echo CONVERSATION_LOCKED\n",
  );
  await waitForOutput(process, "CONVERSATION_LOCKED");
  return process;
}

function blockedWhatsappWrites() {
  return Number(
    localSql(
      "select count(*) from pg_catalog.pg_stat_activity " +
        "where wait_event_type = 'Lock' " +
        "and query ilike '%whatsapp_messages%' " +
        "and query not ilike '%pg_stat_activity%'",
    ),
  );
}

async function releaseConversationLock(process: ChildProcessWithoutNullStreams) {
  const exited = new Promise<void>((resolve, reject) => {
    process.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql de lock terminou com código ${code}`));
    });
  });
  process.stdin.end("commit;\n\\q\n");
  await exited;
}

describe("instrumentação das métricas comerciais jurídicas", () => {
  let admin: SupabaseClient;
  let owner: TestUser;
  let outsider: TestUser;
  let lawyer: TestUser;
  let finance: TestUser;
  let organizationId: string;
  let outsiderOrganizationId: string;
  let financeOrganizationId: string;
  const personalOrganizationIds: string[] = [];

  beforeAll(async () => {
    admin = adminClient(config);
    owner = await createTestUser(config, admin);
    outsider = await createTestUser(config, admin);
    lawyer = await createTestUser(config, admin);
    finance = await createTestUser(config, admin);

    organizationId = await getPersonalOrgId(admin, owner.userId);
    outsiderOrganizationId = await getPersonalOrgId(admin, outsider.userId);
    const lawyerOrganizationId = await getPersonalOrgId(admin, lawyer.userId);
    financeOrganizationId = await getPersonalOrgId(admin, finance.userId);
    personalOrganizationIds.push(
      organizationId,
      outsiderOrganizationId,
      lawyerOrganizationId,
      financeOrganizationId,
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

  it("impede que stage seja alterado junto com workspace ou organização", async () => {
    const createDeal = async (title: string) => {
      const result = await owner.client
        .from("deals")
        .insert({
          owner_id: owner.userId,
          org_id: organizationId,
          workspace_key: "law_office",
          title,
          stage: "novo",
        })
        .select("id")
        .single();
      expect(result.error).toBeNull();
      return result.data!;
    };

    const workspaceDeal = await createDeal("Tenancy imutável por workspace");
    const workspaceEscape = await owner.client
      .from("deals")
      .update({ stage: "ganho", workspace_key: "autonomous_seller" })
      .eq("id", workspaceDeal.id)
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(workspaceEscape.error).not.toBeNull();

    const orgDeal = await createDeal("Tenancy imutável por organização");
    const orgEscape = await finance.client
      .from("deals")
      .update({ stage: "perdido", org_id: financeOrganizationId })
      .eq("id", orgDeal.id)
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office");
    expect(orgEscape.error).not.toBeNull();

    for (const dealId of [workspaceDeal.id, orgDeal.id]) {
      const { data: persisted, error: persistedError } = await owner.client
        .from("deals")
        .select("org_id,workspace_key,stage")
        .eq("id", dealId)
        .eq("org_id", organizationId)
        .eq("workspace_key", "law_office")
        .single();
      expect(persistedError).toBeNull();
      expect(persisted).toEqual({
        org_id: organizationId,
        workspace_key: "law_office",
        stage: "novo",
      });

      const { data: history, error: historyError } = await owner.client
        .from("deal_stage_history")
        .select("from_stage,to_stage")
        .eq("org_id", organizationId)
        .eq("workspace_key", "law_office")
        .eq("deal_id", dealId);
      expect(historyError).toBeNull();
      expect(history).toEqual([{ from_stage: null, to_stage: "novo" }]);
    }
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

  it("impede marcadores forjados no insert da conversa", async () => {
    const suffix = owner.userId.replace(/\D/g, "").slice(-8).padStart(8, "1");
    const forgedConversation = await owner.client.from("whatsapp_conversations").insert({
      org_id: organizationId,
      phone_number: `5521${suffix}`,
      contact_name: "Conversa com marcador inventado",
      first_inbound_at: "2026-08-14T12:00:00.000Z",
      first_response_at: "2026-08-14T12:01:00.000Z",
      first_response_sent_by: "human",
    });
    expect(forgedConversation.error).not.toBeNull();
  });

  it("rejeita mensagem ligada a conversa de outra organização", async () => {
    const suffix = outsider.userId.replace(/\D/g, "").slice(0, 8).padEnd(8, "2");
    const { data: victimConversation, error: conversationError } = await outsider.client
      .from("whatsapp_conversations")
      .insert({
        org_id: outsiderOrganizationId,
        phone_number: `5531${suffix}`,
        contact_name: "Conversa da organização vítima",
      })
      .select("id")
      .single();
    expect(conversationError).toBeNull();

    const forgedMessage = await owner.client.from("whatsapp_messages").insert({
      org_id: organizationId,
      conversation_id: victimConversation!.id,
      direction: "inbound",
      sent_by: "contact",
      content: "Tentativa cross-tenant",
      created_at: "2026-08-14T12:00:00.000Z",
    });
    expect(forgedMessage.error).not.toBeNull();

    const { data: victimMarkers, error: markerError } = await admin
      .from("whatsapp_conversations")
      .select("first_inbound_at,first_response_at,first_response_sent_by")
      .eq("org_id", outsiderOrganizationId)
      .eq("id", victimConversation!.id)
      .single();
    expect(markerError).toBeNull();
    expect(victimMarkers).toEqual({
      first_inbound_at: null,
      first_response_at: null,
      first_response_sent_by: null,
    });
  });

  it("serializa respostas concorrentes fora de ordem pela conversa", async () => {
    const suffix = owner.userId.replace(/\D/g, "").slice(2, 10).padEnd(8, "3");
    const { data: conversation, error: conversationError } = await owner.client
      .from("whatsapp_conversations")
      .insert({
        org_id: organizationId,
        phone_number: `5541${suffix}`,
        contact_name: "Conversa concorrente",
      })
      .select("id")
      .single();
    expect(conversationError).toBeNull();

    const inbound = await owner.client.from("whatsapp_messages").insert({
      org_id: organizationId,
      conversation_id: conversation!.id,
      direction: "inbound",
      sent_by: "contact",
      content: "Mensagem inicial",
      created_at: "2026-08-14T12:00:00.000Z",
    });
    expect(inbound.error).toBeNull();

    let lockProcess: ChildProcessWithoutNullStreams | null = await holdConversationLock(
      organizationId,
      conversation!.id,
    );
    try {
      const earlierResponse = Promise.resolve(
        owner.client.from("whatsapp_messages").insert({
          org_id: organizationId,
          conversation_id: conversation!.id,
          direction: "outbound",
          sent_by: "human",
          content: "Resposta mais cedo",
          created_at: "2026-08-14T12:02:00.000Z",
        }),
      );
      await waitFor(() => blockedWhatsappWrites() >= 1, "primeiro insert bloqueado");

      const laterResponse = Promise.resolve(
        owner.client.from("whatsapp_messages").insert({
          org_id: organizationId,
          conversation_id: conversation!.id,
          direction: "outbound",
          sent_by: "ai",
          content: "Resposta mais tarde",
          created_at: "2026-08-14T12:05:00.000Z",
        }),
      );
      await waitFor(() => blockedWhatsappWrites() >= 2, "dois inserts concorrentes bloqueados");

      await releaseConversationLock(lockProcess);
      lockProcess = null;
      const [earlierResult, laterResult] = await Promise.all([earlierResponse, laterResponse]);
      expect(earlierResult.error).toBeNull();
      expect(laterResult.error).toBeNull();
    } finally {
      if (lockProcess) {
        lockProcess.stdin.end("rollback;\n\\q\n");
        lockProcess.kill();
      }
    }

    const { data: markers, error: markerError } = await owner.client
      .from("whatsapp_conversations")
      .select("first_response_at,first_response_sent_by")
      .eq("org_id", organizationId)
      .eq("id", conversation!.id)
      .single();
    expect(markerError).toBeNull();
    expect(markers).toEqual({
      first_response_at: "2026-08-14T12:02:00+00:00",
      first_response_sent_by: "human",
    });
  }, 30_000);

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

  it("carimba atores financeiros e preserva o criador contra falsificação", async () => {
    const { data: created, error: createError } = await finance.client
      .from("law_acquisition_costs")
      .insert({
        org_id: organizationId,
        workspace_key: "law_office",
        month: "2026-11-01",
        marketing_cents: 20_000,
        commercial_cents: 10_000,
        created_by: outsider.userId,
        updated_by: outsider.userId,
      })
      .select("id,created_by,updated_by")
      .single();
    expect(createError).toBeNull();
    expect(created).toMatchObject({
      created_by: finance.userId,
      updated_by: finance.userId,
    });

    const { data: updated, error: updateError } = await finance.client
      .from("law_acquisition_costs")
      .update({
        notes: "Atualização com atores forjados",
        created_by: owner.userId,
        updated_by: outsider.userId,
      })
      .eq("id", created!.id)
      .eq("org_id", organizationId)
      .eq("workspace_key", "law_office")
      .select("created_by,updated_by")
      .single();
    expect(updateError).toBeNull();
    expect(updated).toEqual({
      created_by: finance.userId,
      updated_by: finance.userId,
    });
  });

  it("revoga execução direta de todas as funções internas da instrumentação", () => {
    const privileges = localSql(`
      select pg_catalog.concat_ws('|',
        case when pg_catalog.has_function_privilege(
          'authenticated', function_oid, 'execute'
        ) then 'true' else 'false' end,
        case when pg_catalog.has_function_privilege(
          'anon', function_oid, 'execute'
        ) then 'true' else 'false' end,
        case when pg_catalog.has_function_privilege(
          'public', function_oid, 'execute'
        ) then 'true' else 'false' end
      )
      from pg_catalog.unnest(array[
        'public.capture_legal_deal_stage_history()'::pg_catalog.regprocedure::oid,
        'public.recalculate_whatsapp_response_markers(uuid,uuid)'::pg_catalog.regprocedure::oid,
        'public.refresh_whatsapp_response_markers_from_message()'::pg_catalog.regprocedure::oid,
        'public.stamp_law_acquisition_cost_actors()'::pg_catalog.regprocedure::oid,
        'public.touch_law_office_record()'::pg_catalog.regprocedure::oid
      ]) as function_oid
      order by function_oid
    `);
    expect(privileges.split("\n")).toEqual(Array(5).fill("false|false|false"));
  });
});
