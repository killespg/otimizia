import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  getLocalSupabaseConfig,
  getPersonalOrgId,
} from "./helpers";

const config = getLocalSupabaseConfig();

// Toda a suíte pula (em vez de falhar) se não houver Supabase local rodando
// — é assim que `npm test` continua funcionando sem Docker, e quem quiser
// rodar de verdade usa `npm run test:integration` com `supabase start` de pé.
describe.skipIf(!config)("RLS multi-tenancy (contra Supabase local)", () => {
  let admin: SupabaseClient;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    admin = adminClient(config!);
    userA = await createTestUser(config!, admin);
    userB = await createTestUser(config!, admin);
    orgA = await getPersonalOrgId(admin, userA.userId);
    orgB = await getPersonalOrgId(admin, userB.userId);
  });

  afterAll(async () => {
    await deleteTestUser(admin, userA.userId);
    await deleteTestUser(admin, userB.userId);
  });

  it("cria organizações pessoais distintas para cada novo usuário", () => {
    expect(orgA).not.toEqual(orgB);
  });

  it("impede ler contatos de outra organização", async () => {
    const { data: contact, error: insertError } = await userA.client
      .from("contacts")
      .insert({
        owner_id: userA.userId,
        org_id: orgA,
        workspace_key: "autonomous_seller",
        name: "Contato da organização A",
      })
      .select()
      .single();
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client
      .from("contacts")
      .select("*")
      .eq("id", contact!.id)
      .maybeSingle();
    expect(seenByB).toBeNull();

    const { data: seenByA } = await userA.client
      .from("contacts")
      .select("*")
      .eq("id", contact!.id)
      .maybeSingle();
    expect(seenByA?.id).toEqual(contact!.id);
  });

  it("impede inserir contato em org da qual não é membro", async () => {
    const { error } = await userB.client.from("contacts").insert({
      owner_id: userB.userId,
      org_id: orgA,
      workspace_key: "autonomous_seller",
      name: "Tentativa de invasão",
    });
    expect(error).not.toBeNull();
  });

  it("compartilha dados entre membros da mesma organização", async () => {
    await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member" });

    const { data: contact } = await userA.client
      .from("contacts")
      .insert({
        owner_id: userA.userId,
        org_id: orgA,
        workspace_key: "autonomous_seller",
        name: "Contato compartilhado",
      })
      .select()
      .single();

    const { data: seenByB } = await userB.client
      .from("contacts")
      .select("*")
      .eq("id", contact!.id)
      .maybeSingle();
    expect(seenByB?.id).toEqual(contact!.id);

    await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
  });

  it("bloqueia update direto de assignee_id em tasks (só via RPC)", async () => {
    const { data: task } = await userA.client
      .from("tasks")
      .insert({
        owner_id: userA.userId,
        org_id: orgA,
        workspace_key: "autonomous_seller",
        title: "Tarefa de teste",
      })
      .select()
      .single();

    const { error } = await userA.client
      .from("tasks")
      .update({ assignee_id: userA.userId })
      .eq("id", task!.id);
    expect(error).not.toBeNull();
  });

  it("push_subscriptions e notification_preferences só são visíveis pro próprio dono", async () => {
    const { error: insertError } = await userA.client.from("push_subscriptions").insert({
      user_id: userA.userId,
      endpoint: `https://example.com/push/${userA.userId}`,
      p256dh: "test-p256dh",
      auth: "test-auth",
    });
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userA.userId);
    expect(seenByB).toEqual([]);

    const { data: prefsSeenByB } = await userB.client
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userA.userId);
    expect(prefsSeenByB).toEqual([]);
  });

  it("notification_log não é acessível por clientes autenticados (só service role)", async () => {
    const { data, error } = await userA.client.from("notification_log").select("*").limit(1);
    // RLS habilitada sem nenhuma policy: consulta não estoura erro, só
    // sempre devolve vazio, seja lá o que exista na tabela.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe.skipIf(!config)("RLS vertical imobiliário (contra Supabase local)", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let orgA: string;
  let propertyId: string;

  beforeAll(async () => {
    admin = adminClient(config!);
    anon = createClient(config!.apiUrl, config!.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    userA = await createTestUser(config!, admin);
    userB = await createTestUser(config!, admin);
    orgA = await getPersonalOrgId(admin, userA.userId);

    const { data: property } = await userA.client
      .from("real_estate_properties")
      .insert({
        org_id: orgA,
        workspace_key: "real_estate_broker",
        created_by: userA.userId,
        title: "Apartamento de teste",
        property_type: "apartamento",
        transaction_type: "venda",
      })
      .select("id")
      .single();
    propertyId = property!.id;
  });

  afterAll(async () => {
    await deleteTestUser(admin, userA.userId);
    await deleteTestUser(admin, userB.userId);
  });

  it("impede membro de outra organização ler ou inserir imóveis", async () => {
    const { data: seenByB } = await userB.client
      .from("real_estate_properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle();
    expect(seenByB).toBeNull();

    const { error } = await userB.client.from("real_estate_properties").insert({
      org_id: orgA,
      workspace_key: "real_estate_broker",
      created_by: userB.userId,
      title: "Tentativa de invasão",
      property_type: "casa",
      transaction_type: "venda",
    });
    expect(error).not.toBeNull();
  });

  it("job_role check aceita broker/agent/assistant e rejeita valor arbitrário", async () => {
    await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "assistant" });
    const { error: invalidError } = await admin
      .from("organization_members")
      .update({ job_role: "corretor-chefe-supremo" })
      .eq("org_id", orgA)
      .eq("user_id", userB.userId);
    expect(invalidError).not.toBeNull();
    await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
  });

  it("job_role=assistant lê mas não escreve; job_role=agent lê e escreve", async () => {
    await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "assistant" });

    const { data: seenAsAssistant } = await userB.client
      .from("real_estate_properties")
      .select("*")
      .eq("id", propertyId)
      .maybeSingle();
    expect(seenAsAssistant?.id).toEqual(propertyId);

    // RLS bloqueando um UPDATE não gera erro — o Postgres só casa 0 linhas
    // com a cláusula USING e o PostgREST devolve sucesso vazio. Por isso o
    // jeito certo de detectar o bloqueio é pedir .select() de volta e
    // conferir que veio vazio (ou reler com o client admin), não checar
    // "error" (que só aparece em INSERT/violação de FK/check).
    const { data: updateAsAssistant, error: updateAsAssistantError } = await userB.client
      .from("real_estate_properties")
      .update({ title: "Editado pelo assistente" })
      .eq("id", propertyId)
      .select();
    expect(updateAsAssistantError).toBeNull();
    expect(updateAsAssistant).toEqual([]);

    await admin.from("organization_members").update({ job_role: "agent" }).eq("org_id", orgA).eq("user_id", userB.userId);

    const { error: updateAsAgent } = await userB.client
      .from("real_estate_properties")
      .update({ title: "Editado pelo corretor associado" })
      .eq("id", propertyId);
    expect(updateAsAgent).toBeNull();

    await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
  });

  it("rejeita media/item de coleção cujo property_id pertence a outra organização mesmo com org_id falsificado", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: propertyB } = await userB.client
      .from("real_estate_properties")
      .insert({
        org_id: orgB,
        workspace_key: "real_estate_broker",
        created_by: userB.userId,
        title: "Imóvel da organização B",
        property_type: "casa",
        transaction_type: "venda",
      })
      .select("id")
      .single();

    // org_id aponta pra própria org do atacante, mas property_id é de outra
    // organização — a FK composta (org_id, property_id) barra isso mesmo com
    // o org_id "certo" do ponto de vista de quem está inserindo.
    const { error: mediaError } = await userB.client.from("real_estate_property_media").insert({
      org_id: orgB,
      property_id: propertyId,
      storage_path: `${orgB}/invasao.jpg`,
      created_by: userB.userId,
    });
    expect(mediaError).not.toBeNull();

    const { data: collection } = await userA.client
      .from("real_estate_share_collections")
      .insert({ org_id: orgA, workspace_key: "real_estate_broker", created_by: userA.userId, title: "Vitrine de teste" })
      .select("id, token")
      .single();

    const { error: itemError } = await userB.client.from("real_estate_share_collection_items").insert({
      collection_id: collection!.id,
      org_id: orgB,
      property_id: propertyB!.id,
    });
    expect(itemError).not.toBeNull();

    await userA.client.from("real_estate_share_collection_items").insert({
      collection_id: collection!.id,
      org_id: orgA,
      property_id: propertyId,
    });

    await admin.from("real_estate_properties").delete().eq("id", propertyB!.id);
  });

  it("insert/update direto em real_estate_property_reactions falha para authenticated e anon; só a função RPC funciona", async () => {
    const { data: collection } = await userA.client
      .from("real_estate_share_collections")
      .select("id, token")
      .eq("org_id", orgA)
      .limit(1)
      .single();

    const { error: directInsertError } = await userA.client.from("real_estate_property_reactions").insert({
      org_id: orgA,
      collection_id: collection!.id,
      property_id: propertyId,
      reaction: "interessado",
    });
    expect(directInsertError).not.toBeNull();

    const { error: anonDirectInsertError } = await anon.from("real_estate_property_reactions").insert({
      org_id: orgA,
      collection_id: collection!.id,
      property_id: propertyId,
      reaction: "interessado",
    });
    expect(anonDirectInsertError).not.toBeNull();

    const { error: rpcError } = await anon.rpc("record_property_reaction", {
      p_token: collection!.token,
      p_property_id: propertyId,
      p_reaction: "quero_visitar",
    });
    expect(rpcError).toBeNull();

    // Trocar de reação no mesmo (collection, property) deve fazer upsert —
    // uma linha só, não acumular.
    await anon.rpc("record_property_reaction", {
      p_token: collection!.token,
      p_property_id: propertyId,
      p_reaction: "interessado",
    });
    const { data: reactions } = await admin
      .from("real_estate_property_reactions")
      .select("*")
      .eq("collection_id", collection!.id)
      .eq("property_id", propertyId);
    expect(reactions).toHaveLength(1);
    expect(reactions?.[0].reaction).toEqual("interessado");
  });

  it("get_shared_property_collection via client anônimo: token válido retorna dado, revogado/expirado/inexistente retorna null", async () => {
    const { data: collection } = await userA.client
      .from("real_estate_share_collections")
      .select("id, token")
      .eq("org_id", orgA)
      .limit(1)
      .single();

    const { data: shared, error: sharedError } = await anon.rpc("get_shared_property_collection", { p_token: collection!.token });
    expect(sharedError).toBeNull();
    expect(shared).not.toBeNull();

    const { data: nonExistent } = await anon.rpc("get_shared_property_collection", { p_token: "00000000-0000-0000-0000-000000000000" });
    expect(nonExistent).toBeNull();

    await userA.client.from("real_estate_share_collections").update({ revoked_at: new Date().toISOString() }).eq("id", collection!.id);
    const { data: revoked } = await anon.rpc("get_shared_property_collection", { p_token: collection!.token });
    expect(revoked).toBeNull();
  });

  // RE-001 (Fase 0): owner_contact_id, captured_by, capture_source e afins
  // (0056_real_estate_capture_fields.sql) não têm policy própria — são
  // colunas na mesma linha de real_estate_properties, então já herdam o
  // isolamento por org das policies de 0052 (RLS é por linha, não por
  // coluna). Estes dois testes provam isso na prática em vez de confiar só
  // na leitura do schema.
  it("owner_contact_id só aceita contato da mesma organização do imóvel (FK composta)", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);

    const { data: contactA } = await userA.client
      .from("contacts")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", name: "Proprietário de teste" })
      .select("id")
      .single();
    const { data: contactB } = await userB.client
      .from("contacts")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", name: "Proprietário de outra org" })
      .select("id")
      .single();

    // Contato da mesma organização do imóvel: aceito.
    const { error: sameOrgError } = await userA.client
      .from("real_estate_properties")
      .update({ owner_contact_id: contactA!.id })
      .eq("id", propertyId);
    expect(sameOrgError).toBeNull();

    // owner_contact_id apontando pra contato de outra organização: a FK
    // composta (org_id, owner_contact_id) -> contacts(org_id, id) barra,
    // mesmo sendo o próprio dono do imóvel fazendo o update — não é um caso
    // de RLS cross-org, é integridade referencial dentro da própria org.
    const { error: crossOrgError } = await userA.client
      .from("real_estate_properties")
      .update({ owner_contact_id: contactB!.id })
      .eq("id", propertyId);
    expect(crossOrgError).not.toBeNull();

    await admin.from("real_estate_properties").update({ owner_contact_id: null }).eq("id", propertyId);
    await admin.from("contacts").delete().eq("id", contactB!.id);
    await admin.from("contacts").delete().eq("id", contactA!.id);
  });

  it("captured_by/capture_source/exclusive_listing/commission_percent seguem o mesmo isolamento por org do resto da tabela", async () => {
    const { error: updateError } = await userA.client
      .from("real_estate_properties")
      .update({
        captured_by: userA.userId,
        capture_source: "Indicação",
        exclusive_listing: true,
        commission_percent: 6,
      })
      .eq("id", propertyId);
    expect(updateError).toBeNull();

    const { data: seenByB } = await userB.client
      .from("real_estate_properties")
      .select("captured_by, capture_source, exclusive_listing, commission_percent")
      .eq("id", propertyId)
      .maybeSingle();
    expect(seenByB).toBeNull();

    const { data: seenByA } = await userA.client
      .from("real_estate_properties")
      .select("captured_by, capture_source, exclusive_listing, commission_percent")
      .eq("id", propertyId)
      .maybeSingle();
    expect(seenByA?.capture_source).toEqual("Indicação");
    expect(seenByA?.exclusive_listing).toEqual(true);
  });

  it("commission_percent e listing_quality_score rejeitam valores fora do intervalo 0-100", async () => {
    const { error: commissionError } = await userA.client
      .from("real_estate_properties")
      .update({ commission_percent: 150 })
      .eq("id", propertyId);
    expect(commissionError).not.toBeNull();

    const { error: scoreError } = await userA.client
      .from("real_estate_properties")
      .update({ listing_quality_score: -1 })
      .eq("id", propertyId);
    expect(scoreError).not.toBeNull();
  });

  // RE-1xx (Fase 1): real_estate_lead_preferences e real_estate_deal_properties
  // são tabelas novas (0058) — RLS própria (can_view_realestate/can_manage_realestate,
  // mesmo padrão de 0052), testada aqui do zero em vez de só herdar da
  // real_estate_properties como as colunas da Fase 0.
  it("real_estate_lead_preferences: isolamento cross-org e um preferência por atendimento", async () => {
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Atendimento de teste" })
      .select("id")
      .single();

    const { data: contactA } = await userA.client
      .from("contacts")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", name: "Lead de teste" })
      .select("id")
      .single();
    const { data: prefRow, error: insertError } = await userA.client
      .from("real_estate_lead_preferences")
      .insert({ org_id: orgA, contact_id: contactA!.id, deal_id: dealA!.id, transaction_type: "venda" })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    // Segunda preferência pro MESMO deal_id: índice único parcial barra.
    const { error: duplicateError } = await userA.client
      .from("real_estate_lead_preferences")
      .insert({ org_id: orgA, contact_id: contactA!.id, deal_id: dealA!.id, transaction_type: "aluguel" });
    expect(duplicateError).not.toBeNull();

    const { data: seenByB } = await userB.client
      .from("real_estate_lead_preferences")
      .select("*")
      .eq("id", prefRow!.id)
      .maybeSingle();
    expect(seenByB).toBeNull();

    const { error: crossOrgInsertError } = await userB.client
      .from("real_estate_lead_preferences")
      .insert({ org_id: orgA, contact_id: contactA!.id, deal_id: dealA!.id, transaction_type: "aluguel" });
    expect(crossOrgInsertError).not.toBeNull();

    await admin.from("real_estate_lead_preferences").delete().eq("id", prefRow!.id);
    await admin.from("contacts").delete().eq("id", contactA!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
  });

  it("real_estate_deal_properties: isolamento cross-org e FK composta rejeita deal/imóvel de outra organização", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Atendimento pra match" })
      .select("id")
      .single();
    const { data: dealB } = await userB.client
      .from("deals")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", title: "Atendimento de outra org" })
      .select("id")
      .single();

    const { data: linkRow, error: insertError } = await userA.client
      .from("real_estate_deal_properties")
      .insert({ org_id: orgA, deal_id: dealA!.id, property_id: propertyId, match_score: 80, match_explanation: { total: { points: 80, max: 100, reason: "teste" } } })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    expect(linkRow!.id).toBeDefined();

    // org_id da própria org do atacante (orgB), mas deal_id pertence à
    // organização A — a FK composta (org_id, deal_id) -> deals(org_id, id) barra.
    const { error: forgedDealError } = await userB.client.from("real_estate_deal_properties").insert({
      org_id: orgB,
      deal_id: dealA!.id,
      property_id: propertyId,
      match_score: 50,
    });
    expect(forgedDealError).not.toBeNull();

    // Mesmo teste pro lado do property_id: deal de B, imóvel de A.
    const { error: forgedPropertyError } = await userB.client.from("real_estate_deal_properties").insert({
      org_id: orgB,
      deal_id: dealB!.id,
      property_id: propertyId,
      match_score: 50,
    });
    expect(forgedPropertyError).not.toBeNull();

    const { data: seenByB } = await userB.client
      .from("real_estate_deal_properties")
      .select("*")
      .eq("id", linkRow!.id)
      .maybeSingle();
    expect(seenByB).toBeNull();

    await admin.from("real_estate_deal_properties").delete().eq("id", linkRow!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
    await admin.from("deals").delete().eq("id", dealB!.id);
  });

  // RE-2xx (Fase 2): vitrine vinculada a atendimento (0059) — FK composta
  // de deal_id e o efeito colateral das RPCs públicas (get_shared_property_collection
  // avança 'viewed', record_property_reaction avança 'interested'/'rejected')
  // sobre real_estate_deal_properties.
  it("real_estate_share_collections.deal_id: FK composta rejeita deal de outra organização", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: dealB } = await userB.client
      .from("deals")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", title: "Atendimento de B" })
      .select("id")
      .single();

    const { error: forgedError } = await userA.client.from("real_estate_share_collections").insert({
      org_id: orgA,
      workspace_key: "real_estate_broker",
      created_by: userA.userId,
      title: "Vitrine com deal forjado",
      deal_id: dealB!.id,
    });
    expect(forgedError).not.toBeNull();

    await admin.from("deals").delete().eq("id", dealB!.id);
  });

  it("abrir a vitrine pública avança 'viewed' e reagir avança 'interested'/'rejected' no atendimento vinculado, de forma idempotente", async () => {
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Atendimento pra vitrine" })
      .select("id")
      .single();
    const { data: collection } = await userA.client
      .from("real_estate_share_collections")
      .insert({ org_id: orgA, workspace_key: "real_estate_broker", created_by: userA.userId, title: "Vitrine com atendimento", deal_id: dealA!.id })
      .select("id, token")
      .single();
    await userA.client.from("real_estate_share_collection_items").insert({ collection_id: collection!.id, org_id: orgA, property_id: propertyId });
    await admin
      .from("real_estate_deal_properties")
      .upsert({ org_id: orgA, deal_id: dealA!.id, property_id: propertyId, status: "sent" }, { onConflict: "deal_id,property_id" });

    const { error: viewError } = await anon.rpc("get_shared_property_collection", { p_token: collection!.token });
    expect(viewError).toBeNull();

    const { data: afterView } = await admin
      .from("real_estate_deal_properties")
      .select("status, viewed_at")
      .eq("deal_id", dealA!.id)
      .eq("property_id", propertyId)
      .single();
    expect(afterView!.status).toEqual("viewed");
    const firstViewedAt = afterView!.viewed_at;
    expect(firstViewedAt).not.toBeNull();

    // Reabrir não deve trocar o timestamp da primeira visualização.
    await anon.rpc("get_shared_property_collection", { p_token: collection!.token });
    const { data: afterSecondView } = await admin
      .from("real_estate_deal_properties")
      .select("viewed_at")
      .eq("deal_id", dealA!.id)
      .eq("property_id", propertyId)
      .single();
    expect(afterSecondView!.viewed_at).toEqual(firstViewedAt);

    const { error: reactionError } = await anon.rpc("record_property_reaction", {
      p_token: collection!.token,
      p_property_id: propertyId,
      p_reaction: "interessado",
    });
    expect(reactionError).toBeNull();

    const { data: afterReaction } = await admin
      .from("real_estate_deal_properties")
      .select("status, reaction")
      .eq("deal_id", dealA!.id)
      .eq("property_id", propertyId)
      .single();
    expect(afterReaction!.status).toEqual("interested");
    expect(afterReaction!.reaction).toEqual("interessado");

    await admin.from("real_estate_deal_properties").delete().eq("deal_id", dealA!.id);
    await admin.from("real_estate_share_collections").delete().eq("id", collection!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
  });

  // RE-3xx (Fase 3): real_estate_visits é tabela nova (0060) — RLS própria
  // testada do zero, mesmo padrão das outras tabelas do vertical.
  it("real_estate_visits: isolamento cross-org e FK composta rejeita contato/imóvel de outra organização", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: contactA } = await userA.client
      .from("contacts")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", name: "Cliente da visita" })
      .select("id")
      .single();
    const { data: contactB } = await userB.client
      .from("contacts")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", name: "Cliente de outra org" })
      .select("id")
      .single();

    const { data: visit, error: insertError } = await userA.client
      .from("real_estate_visits")
      .insert({ org_id: orgA, contact_id: contactA!.id, property_id: propertyId, broker_id: userA.userId, status: "requested" })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client.from("real_estate_visits").select("*").eq("id", visit!.id).maybeSingle();
    expect(seenByB).toBeNull();

    // contact_id de outra organização — FK composta (org_id, contact_id) barra.
    const { error: forgedContactError } = await userA.client
      .from("real_estate_visits")
      .insert({ org_id: orgA, contact_id: contactB!.id, property_id: propertyId, broker_id: userA.userId, status: "requested" });
    expect(forgedContactError).not.toBeNull();

    await admin.from("real_estate_visits").delete().eq("id", visit!.id);
    await admin.from("contacts").delete().eq("id", contactA!.id);
    await admin.from("contacts").delete().eq("id", contactB!.id);
  });

  it("reação 'quero_visitar' numa vitrine ligada a atendimento cria solicitação de visita + tarefa urgente automaticamente", async () => {
    const { data: contactA } = await userA.client
      .from("contacts")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", name: "Lead interessado em visitar" })
      .select("id")
      .single();
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", contact_id: contactA!.id, title: "Atendimento pra visita automática" })
      .select("id")
      .single();
    const { data: collection } = await userA.client
      .from("real_estate_share_collections")
      .insert({
        org_id: orgA, workspace_key: "real_estate_broker", created_by: userA.userId,
        title: "Vitrine pra teste de quero_visitar", deal_id: dealA!.id, client_contact_id: contactA!.id,
      })
      .select("id, token")
      .single();
    await userA.client.from("real_estate_share_collection_items").insert({ collection_id: collection!.id, org_id: orgA, property_id: propertyId });

    const { error: reactionError } = await anon.rpc("record_property_reaction", {
      p_token: collection!.token,
      p_property_id: propertyId,
      p_reaction: "quero_visitar",
    });
    expect(reactionError).toBeNull();

    const { data: visit } = await admin
      .from("real_estate_visits")
      .select("*")
      .eq("deal_id", dealA!.id)
      .eq("property_id", propertyId)
      .maybeSingle();
    expect(visit).not.toBeNull();
    expect(visit!.status).toEqual("requested");
    expect(visit!.contact_id).toEqual(contactA!.id);

    const { data: task } = await admin.from("tasks").select("*").eq("deal_id", dealA!.id).maybeSingle();
    expect(task).not.toBeNull();
    expect(task!.title).toContain("Cliente quer visitar");

    const { data: event } = await admin
      .from("crm_domain_events")
      .select("*")
      .eq("event_type", "visit_requested")
      .eq("aggregate_id", visit!.id)
      .maybeSingle();
    expect(event).not.toBeNull();
    expect(event!.processed_at).not.toBeNull();

    // Reagir de novo (mesma coleção/imóvel) não deve duplicar a visita —
    // já existe uma 'requested' pro mesmo par deal/property.
    await anon.rpc("record_property_reaction", { p_token: collection!.token, p_property_id: propertyId, p_reaction: "quero_visitar" });
    const { data: visitsAfterSecondReaction } = await admin
      .from("real_estate_visits")
      .select("id")
      .eq("deal_id", dealA!.id)
      .eq("property_id", propertyId);
    expect(visitsAfterSecondReaction).toHaveLength(1);

    await admin.from("crm_domain_events").delete().eq("aggregate_id", visit!.id);
    await admin.from("tasks").delete().eq("deal_id", dealA!.id);
    await admin.from("real_estate_visits").delete().eq("deal_id", dealA!.id);
    await admin.from("real_estate_deal_properties").delete().eq("deal_id", dealA!.id);
    await admin.from("real_estate_share_collections").delete().eq("id", collection!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
    await admin.from("contacts").delete().eq("id", contactA!.id);
  });

  // RE-4xx (Fase 4): real_estate_offers é tabela nova (0061) — RLS própria
  // e a cadeia de contraproposta via parent_offer_id.
  it("real_estate_offers: isolamento cross-org, FK composta e cadeia de contraproposta (parent_offer_id)", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: contactA } = await userA.client
      .from("contacts")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", name: "Cliente da proposta" })
      .select("id")
      .single();
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", contact_id: contactA!.id, title: "Atendimento pra proposta" })
      .select("id")
      .single();
    const { data: dealB } = await userB.client
      .from("deals")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", title: "Atendimento de outra org" })
      .select("id")
      .single();

    const { data: offer, error: insertError } = await userA.client
      .from("real_estate_offers")
      .insert({ org_id: orgA, contact_id: contactA!.id, deal_id: dealA!.id, property_id: propertyId, created_by: userA.userId, amount_cents: 85000000 })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client.from("real_estate_offers").select("*").eq("id", offer!.id).maybeSingle();
    expect(seenByB).toBeNull();

    // deal_id de outra organização — FK composta (org_id, deal_id) barra.
    const { error: forgedDealError } = await userA.client.from("real_estate_offers").insert({
      org_id: orgA, contact_id: contactA!.id, deal_id: dealB!.id, property_id: propertyId, created_by: userA.userId, amount_cents: 1000,
    });
    expect(forgedDealError).not.toBeNull();

    const { data: counter, error: counterError } = await userA.client
      .from("real_estate_offers")
      .insert({
        org_id: orgA, contact_id: contactA!.id, deal_id: dealA!.id, property_id: propertyId, created_by: userA.userId,
        amount_cents: 82000000, parent_offer_id: offer!.id, status: "sent",
      })
      .select("id, parent_offer_id")
      .single();
    expect(counterError).toBeNull();
    expect(counter!.parent_offer_id).toEqual(offer!.id);

    await admin.from("real_estate_offers").delete().eq("deal_id", dealA!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
    await admin.from("deals").delete().eq("id", dealB!.id);
    await admin.from("contacts").delete().eq("id", contactA!.id);
  });

  // RE-5xx (Fase 5): real_estate_property_documents é tabela nova (0062).
  it("real_estate_property_documents: isolamento cross-org e status só aceita os valores do enum", async () => {
    const { data: doc, error: insertError } = await userA.client
      .from("real_estate_property_documents")
      .insert({ org_id: orgA, property_id: propertyId, document_type: "Matrícula atualizada", created_by: userA.userId })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client.from("real_estate_property_documents").select("*").eq("id", doc!.id).maybeSingle();
    expect(seenByB).toBeNull();

    const { error: invalidStatusError } = await userA.client
      .from("real_estate_property_documents")
      .update({ status: "nao-existe" })
      .eq("id", doc!.id);
    expect(invalidStatusError).not.toBeNull();

    const { error: validStatusError } = await userA.client
      .from("real_estate_property_documents")
      .update({ status: "received" })
      .eq("id", doc!.id);
    expect(validStatusError).toBeNull();

    await admin.from("real_estate_property_documents").delete().eq("id", doc!.id);
  });

  // RE-6xx (Fase 6): real_estate_commissions e real_estate_targets são
  // tabelas novas (0063).
  it("real_estate_commissions: isolamento cross-org e FK composta rejeita atendimento de outra organização", async () => {
    const orgB = await getPersonalOrgId(admin, userB.userId);
    const { data: dealA } = await userA.client
      .from("deals")
      .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Atendimento pra comissão" })
      .select("id")
      .single();
    const { data: dealB } = await userB.client
      .from("deals")
      .insert({ owner_id: userB.userId, org_id: orgB, workspace_key: "real_estate_broker", title: "Atendimento de B" })
      .select("id")
      .single();

    const { data: commission, error: insertError } = await userA.client
      .from("real_estate_commissions")
      .insert({
        org_id: orgA, deal_id: dealA!.id, property_id: propertyId, broker_id: userA.userId,
        gross_sale_value_cents: 85000000, commission_percent: 6, expected_amount_cents: 5100000,
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: seenByB } = await userB.client.from("real_estate_commissions").select("*").eq("id", commission!.id).maybeSingle();
    expect(seenByB).toBeNull();

    const { error: forgedDealError } = await userA.client.from("real_estate_commissions").insert({
      org_id: orgA, deal_id: dealB!.id, property_id: propertyId, broker_id: userA.userId,
      gross_sale_value_cents: 1000, commission_percent: 6, expected_amount_cents: 60,
    });
    expect(forgedDealError).not.toBeNull();

    await admin.from("real_estate_commissions").delete().eq("id", commission!.id);
    await admin.from("deals").delete().eq("id", dealA!.id);
    await admin.from("deals").delete().eq("id", dealB!.id);
  });

  it("real_estate_targets: broker_id nulo (meta de equipe) funciona e isolamento cross-org vale", async () => {
    const { data: target, error: insertError } = await userA.client
      .from("real_estate_targets")
      .insert({ org_id: orgA, broker_id: null, period_start: "2026-01-01", period_end: "2026-01-31", target_amount_cents: 100000000, created_by: userA.userId })
      .select("id, broker_id")
      .single();
    expect(insertError).toBeNull();
    expect(target!.broker_id).toBeNull();

    const { data: seenByB } = await userB.client.from("real_estate_targets").select("*").eq("id", target!.id).maybeSingle();
    expect(seenByB).toBeNull();

    await admin.from("real_estate_targets").delete().eq("id", target!.id);
  });

  // 0.3 (Fase 0): audit_log de mudanças em organization_members
  // (0068_audit_log.sql) — a classe de risco priorizada é vazamento entre
  // membros da MESMA organização, então o teste central aqui não é
  // isolamento cross-org (já coberto acima), é: só admin lê o próprio log,
  // e ninguém escreve nele por fora do trigger.
  describe("audit_log (0.3)", () => {
    it("registra member_added e member_role_changed com before/after em organization_members", async () => {
      await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "assistant" });

      const { data: addedEntries } = await admin
        .from("audit_log")
        .select("*")
        .eq("org_id", orgA)
        .eq("resource_id", userB.userId)
        .eq("action", "member_added");
      expect(addedEntries).toHaveLength(1);
      expect(addedEntries![0].after).toMatchObject({ job_role: "assistant" });
      expect(addedEntries![0].before).toBeNull();

      await admin.from("organization_members").update({ job_role: "agent" }).eq("org_id", orgA).eq("user_id", userB.userId);

      const { data: changedEntries } = await admin
        .from("audit_log")
        .select("*")
        .eq("org_id", orgA)
        .eq("resource_id", userB.userId)
        .eq("action", "member_role_changed");
      expect(changedEntries).toHaveLength(1);
      expect(changedEntries![0].before).toMatchObject({ job_role: "assistant" });
      expect(changedEntries![0].after).toMatchObject({ job_role: "agent" });

      await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);

      const { data: removedEntries } = await admin
        .from("audit_log")
        .select("*")
        .eq("org_id", orgA)
        .eq("resource_id", userB.userId)
        .eq("action", "member_removed");
      expect(removedEntries).toHaveLength(1);
    });

    it("não registra entrada quando um UPDATE não muda role nem job_role", async () => {
      await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "staff" });
      await admin.from("audit_log").delete().eq("org_id", orgA).eq("resource_id", userB.userId);

      // created_at não é role/job_role — não deve gerar member_role_changed.
      await admin
        .from("organization_members")
        .update({ created_at: new Date().toISOString() })
        .eq("org_id", orgA)
        .eq("user_id", userB.userId);

      const { data: entries } = await admin.from("audit_log").select("*").eq("org_id", orgA).eq("resource_id", userB.userId);
      expect(entries).toHaveLength(0);

      await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
    });

    it("só admin da organização lê o audit_log; membro comum não vê nada", async () => {
      await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "staff" });

      const { data: seenByMember } = await userB.client.from("audit_log").select("*").eq("org_id", orgA);
      expect(seenByMember).toEqual([]);

      const { data: seenByAdmin } = await userA.client.from("audit_log").select("*").eq("org_id", orgA).limit(1);
      expect(seenByAdmin!.length).toBeGreaterThan(0);

      await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
    });

    it("rejeita insert/update/delete direto em audit_log por qualquer client autenticado", async () => {
      const { error: insertError } = await userA.client.from("audit_log").insert({
        org_id: orgA,
        action: "forjado",
        resource_table: "organization_members",
      });
      expect(insertError).not.toBeNull();

      const { data: anyRow } = await admin.from("audit_log").select("id").eq("org_id", orgA).limit(1).single();
      const { error: updateError, data: updateData } = await userA.client
        .from("audit_log")
        .update({ action: "adulterado" })
        .eq("id", anyRow!.id)
        .select();
      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);

      const { error: deleteError, data: deleteData } = await userA.client
        .from("audit_log")
        .delete()
        .eq("id", anyRow!.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleteData).toEqual([]);
    });
  });

  // 1.1 (Fase 1): schema de pipelines/pipeline_stages (0069_pipelines.sql).
  // Aditivo — a etapa mais importante a provar não é comportamento novo de
  // produto (não existe ainda), é que o trigger de auto-provisionamento não
  // regride o isolamento por organização que já vale pra deals/contacts.
  describe("pipelines (1.1)", () => {
    it("todo negócio novo nasce com um pipeline_id válido e etapas seedadas", async () => {
      const { data: deal, error } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Negócio de teste 1.1" })
        .select("id, pipeline_id")
        .single();
      expect(error).toBeNull();
      expect(deal!.pipeline_id).not.toBeNull();

      const { data: pipeline } = await userA.client
        .from("pipelines")
        .select("id, org_id, workspace_key, is_default")
        .eq("id", deal!.pipeline_id)
        .single();
      expect(pipeline?.org_id).toEqual(orgA);
      expect(pipeline?.workspace_key).toEqual("real_estate_broker");
      expect(pipeline?.is_default).toEqual(true);

      const { data: stages } = await userA.client
        .from("pipeline_stages")
        .select("key, stage_type, is_deletable")
        .eq("pipeline_id", deal!.pipeline_id)
        .order("position");
      expect(stages?.map((s) => s.key)).toEqual(["novo", "em_contato", "negociacao", "ganho", "perdido"]);
      expect(stages?.every((s) => s.is_deletable === false)).toEqual(true);
      expect(stages?.find((s) => s.key === "ganho")?.stage_type).toEqual("ganho");
      expect(stages?.find((s) => s.key === "perdido")?.stage_type).toEqual("perdido");

      // Um segundo negócio no mesmo org+workspace reaproveita o mesmo
      // pipeline padrão, não cria um novo a cada insert.
      const { data: deal2 } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "real_estate_broker", title: "Negócio de teste 1.1 (b)" })
        .select("id, pipeline_id")
        .single();
      expect(deal2!.pipeline_id).toEqual(deal!.pipeline_id);

      await admin.from("deals").delete().eq("id", deal!.id);
      await admin.from("deals").delete().eq("id", deal2!.id);
    });

    it("isola pipelines e pipeline_stages entre organizações", async () => {
      const { data: dealA } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "autonomous_seller", title: "Negócio A" })
        .select("pipeline_id")
        .single();

      const { data: seenByB } = await userB.client
        .from("pipelines")
        .select("*")
        .eq("id", dealA!.pipeline_id)
        .maybeSingle();
      expect(seenByB).toBeNull();

      const { data: stagesSeenByB } = await userB.client
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", dealA!.pipeline_id);
      expect(stagesSeenByB).toEqual([]);

      await admin.from("deals").delete().eq("org_id", orgA).eq("workspace_key", "autonomous_seller");
    });

    it("rejeita pipeline_stages forjado com org_id de uma organização e pipeline_id de outra", async () => {
      const { data: dealB } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "consultant", title: "Negócio para forjar" })
        .select("pipeline_id")
        .single();
      const orgB = await getPersonalOrgId(admin, userB.userId);

      const { error } = await userB.client.from("pipeline_stages").insert({
        org_id: orgB,
        pipeline_id: dealB!.pipeline_id,
        key: "invasao",
        label: "Invasão",
      });
      expect(error).not.toBeNull();

      await admin.from("deals").delete().eq("org_id", orgA).eq("workspace_key", "consultant");
    });
  });

  // 3.1 (Fase 3): automation_rules/automation_executions
  // (0075_automation_engine.sql) — substitui deal_followup_rules (1.4).
  describe("automation_rules e automation_executions (3.1)", () => {
    it("isola regras entre organizações e todo membro da org pode gerenciar", async () => {
      const { data: ruleRow, error } = await userA.client
        .from("automation_rules")
        .insert({
          org_id: orgA,
          workspace_key: "autonomous_seller",
          trigger_kind: "deal_inactive",
          trigger_params: { inactivity_days: 3 },
          action_type: "create_task",
          action_params: { title_template: "Retomar contato — {{deal.title}}" },
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      const { data: seenByB } = await userB.client.from("automation_rules").select("*").eq("id", ruleRow!.id).maybeSingle();
      expect(seenByB).toBeNull();

      const { data: seenByA } = await userA.client.from("automation_rules").select("*").eq("id", ruleRow!.id).maybeSingle();
      expect(seenByA?.trigger_params).toMatchObject({ inactivity_days: 3 });

      await admin.from("automation_rules").delete().eq("id", ruleRow!.id);
    });

    it("só admin lê automation_executions da própria organização", async () => {
      const { data: rule } = await admin
        .from("automation_rules")
        .insert({
          org_id: orgA,
          workspace_key: "autonomous_seller",
          trigger_kind: "deal_inactive",
          trigger_params: { inactivity_days: 3 },
          action_type: "create_task",
          action_params: {},
        })
        .select("id")
        .single();
      const { data: execution } = await admin
        .from("automation_executions")
        .insert({ org_id: orgA, rule_id: rule!.id, status: "success" })
        .select("id")
        .single();

      await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "staff" });
      const { data: seenByMember } = await userB.client.from("automation_executions").select("*").eq("id", execution!.id);
      expect(seenByMember).toEqual([]);

      const { data: seenByAdmin } = await userA.client.from("automation_executions").select("*").eq("id", execution!.id).maybeSingle();
      expect(seenByAdmin?.status).toEqual("success");

      await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
      await admin.from("automation_executions").delete().eq("id", execution!.id);
      await admin.from("automation_rules").delete().eq("id", rule!.id);
    });

    it("mudança de etapa emite deal.stage_changed em crm_domain_events (o cron do motor consome isso à parte, não testado aqui)", async () => {
      const { data: rule } = await admin
        .from("automation_rules")
        .insert({
          org_id: orgA,
          workspace_key: "autonomous_seller",
          trigger_kind: "deal_stage_changed",
          stage_key: "ganho",
          action_type: "create_task",
          action_params: { title_template: "Comemorar — {{deal.title}}" },
        })
        .select("id")
        .single();

      const { data: deal } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "autonomous_seller", title: "Negócio 3.1" })
        .select("id")
        .single();
      await userA.client.from("deals").update({ stage: "ganho" }).eq("id", deal!.id);

      const { data: event } = await admin
        .from("crm_domain_events")
        .select("id")
        .eq("event_type", "deal.stage_changed")
        .eq("aggregate_id", deal!.id)
        .maybeSingle();
      expect(event).not.toBeNull();

      await admin.from("crm_domain_events").delete().eq("aggregate_id", deal!.id);
      await admin.from("deals").delete().eq("id", deal!.id);
      await admin.from("automation_rules").delete().eq("id", rule!.id);
    });
  });

  // 2.6 (Fase 2): call_logs (0071_call_logs.sql).
  describe("call_logs (2.6)", () => {
    it("isola registros de ligação entre organizações e valida a FK composta de contact_id", async () => {
      const { data: contactA } = await userA.client
        .from("contacts")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "autonomous_seller", name: "Cliente da ligação" })
        .select("id")
        .single();

      const { data: callLog, error } = await userA.client
        .from("call_logs")
        .insert({
          org_id: orgA,
          workspace_key: "autonomous_seller",
          contact_id: contactA!.id,
          created_by: userA.userId,
          duration_minutes: 5,
          outcome: "Vai pensar",
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      const { data: seenByB } = await userB.client.from("call_logs").select("*").eq("id", callLog!.id).maybeSingle();
      expect(seenByB).toBeNull();

      const orgB = await getPersonalOrgId(admin, userB.userId);
      const { error: forgedError } = await userB.client.from("call_logs").insert({
        org_id: orgB,
        workspace_key: "autonomous_seller",
        contact_id: contactA!.id,
        created_by: userB.userId,
        outcome: "Tentativa de invasão",
      });
      expect(forgedError).not.toBeNull();

      await admin.from("call_logs").delete().eq("id", callLog!.id);
      await admin.from("contacts").delete().eq("id", contactA!.id);
    });
  });

  // 2.1 (Fase 2): email_logs (0072_email_contact.sql).
  describe("email_logs (2.1)", () => {
    it("isola registros de e-mail entre organizações e valida a FK composta de contact_id", async () => {
      const { data: contactA } = await userA.client
        .from("contacts")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "autonomous_seller", name: "Cliente do e-mail", email: "cliente@exemplo.com" })
        .select("id")
        .single();

      const { data: emailLog, error } = await userA.client
        .from("email_logs")
        .insert({
          org_id: orgA,
          workspace_key: "autonomous_seller",
          contact_id: contactA!.id,
          created_by: userA.userId,
          subject: "Proposta enviada",
          status: "sent",
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      const { data: seenByB } = await userB.client.from("email_logs").select("*").eq("id", emailLog!.id).maybeSingle();
      expect(seenByB).toBeNull();

      const orgB = await getPersonalOrgId(admin, userB.userId);
      const { error: forgedError } = await userB.client.from("email_logs").insert({
        org_id: orgB,
        workspace_key: "autonomous_seller",
        contact_id: contactA!.id,
        created_by: userB.userId,
        subject: "Tentativa de invasão",
      });
      expect(forgedError).not.toBeNull();

      await admin.from("email_logs").delete().eq("id", emailLog!.id);
      await admin.from("contacts").delete().eq("id", contactA!.id);
    });
  });

  // 2.4 (Fase 2): webhooks de saída + API pública (0074_webhooks_and_api_keys.sql).
  describe("webhooks e API pública (2.4)", () => {
    it("emite deal.created e deal.stage_changed em crm_domain_events, e enfileira entrega pros endpoints ativos que assinam", async () => {
      const { data: endpoint } = await admin
        .from("webhook_endpoints")
        .insert({ org_id: orgA, url: "https://example.com/hook", secret: "whsec_teste", event_types: ["deal.created", "deal.stage_changed"] })
        .select("id")
        .single();

      const { data: deal } = await userA.client
        .from("deals")
        .insert({ owner_id: userA.userId, org_id: orgA, workspace_key: "autonomous_seller", title: "Negócio 2.4" })
        .select("id")
        .single();

      const { data: createdEvent } = await admin
        .from("crm_domain_events")
        .select("id")
        .eq("event_type", "deal.created")
        .eq("aggregate_id", deal!.id)
        .maybeSingle();
      expect(createdEvent).not.toBeNull();

      const { data: createdDelivery } = await admin
        .from("webhook_deliveries")
        .select("id, status")
        .eq("endpoint_id", endpoint!.id)
        .eq("event_id", createdEvent!.id)
        .maybeSingle();
      expect(createdDelivery?.status).toEqual("pending");

      await userA.client.from("deals").update({ stage: "em_contato" }).eq("id", deal!.id);

      const { data: stageEvent } = await admin
        .from("crm_domain_events")
        .select("id")
        .eq("event_type", "deal.stage_changed")
        .eq("aggregate_id", deal!.id)
        .maybeSingle();
      expect(stageEvent).not.toBeNull();

      await admin.from("webhook_deliveries").delete().eq("endpoint_id", endpoint!.id);
      await admin.from("crm_domain_events").delete().eq("aggregate_id", deal!.id);
      await admin.from("webhook_endpoints").delete().eq("id", endpoint!.id);
      await admin.from("deals").delete().eq("id", deal!.id);
    });

    it("só admin gerencia webhook_endpoints e api_keys; membro comum não vê nem escreve", async () => {
      await admin.from("organization_members").insert({ org_id: orgA, user_id: userB.userId, role: "member", job_role: "staff" });

      const { error: insertAsMemberError } = await userB.client.from("webhook_endpoints").insert({
        org_id: orgA,
        url: "https://example.com/tentativa",
        secret: "whsec_x",
        event_types: ["deal.created"],
      });
      expect(insertAsMemberError).not.toBeNull();

      const { data: endpoint } = await userA.client
        .from("webhook_endpoints")
        .insert({ org_id: orgA, url: "https://example.com/admin-only", secret: "whsec_admin", event_types: ["deal.created"] })
        .select("id")
        .single();
      const { data: seenByMember } = await userB.client.from("webhook_endpoints").select("*").eq("id", endpoint!.id).maybeSingle();
      expect(seenByMember).toBeNull();

      const { error: insertKeyAsMemberError } = await userB.client
        .from("api_keys")
        .insert({ org_id: orgA, name: "Tentativa", key_hash: "hash_falso", key_prefix: "otz_fals" });
      expect(insertKeyAsMemberError).not.toBeNull();

      await admin.from("webhook_endpoints").delete().eq("id", endpoint!.id);
      await admin.from("organization_members").delete().eq("org_id", orgA).eq("user_id", userB.userId);
    });

    it("isola webhook_endpoints e api_keys entre organizações", async () => {
      const { data: endpoint } = await userA.client
        .from("webhook_endpoints")
        .insert({ org_id: orgA, url: "https://example.com/orgA", secret: "whsec_a", event_types: ["deal.created"] })
        .select("id")
        .single();
      const { data: seenByB } = await userB.client.from("webhook_endpoints").select("*").eq("id", endpoint!.id).maybeSingle();
      expect(seenByB).toBeNull();

      const { data: key } = await userA.client
        .from("api_keys")
        .insert({ org_id: orgA, name: "Chave A", key_hash: "hash_a", key_prefix: "otz_aaaa" })
        .select("id")
        .single();
      const { data: keySeenByB } = await userB.client.from("api_keys").select("*").eq("id", key!.id).maybeSingle();
      expect(keySeenByB).toBeNull();

      await admin.from("webhook_endpoints").delete().eq("id", endpoint!.id);
      await admin.from("api_keys").delete().eq("id", key!.id);
    });
  });
});
