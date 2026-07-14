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
});
