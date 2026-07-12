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
