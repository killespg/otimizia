import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Completa a conta demo do corretor (corretor@corretor / Mariana Costa
// Imoveis) que scripts/seed-real-estate-demo.mjs ja cria: sobe a quantidade
// de fotos por imovel (reaproveitando os arquivos reais ja enviados, via
// storage.copy, sem depender de nenhuma fonte externa de imagem) e cria mais
// conversas de WhatsApp com historico de mensagens, pra cada contato que
// ainda nao tinha uma. Usa a service role (bypassa RLS) porque nao dependemos
// da senha da conta demo, so das chaves de projeto ja configuradas.
loadEnvFile(join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// auth.admin.listUsers (API de admin do GoTrue) nao aceita ainda a chave
// nova sb_secret_...; profiles/storage/PostgREST aceitam normalmente. Como
// ja resolvemos o par org/usuario da conta demo por SQL direto (MCP), so
// confirmamos aqui que o perfil ainda bate com o e-mail esperado.
const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id, active_org_id, name")
  .eq("active_org_id", "4795cb5e-0741-447f-b57e-cb69824dc387")
  .eq("id", "208a7fd1-8533-4a3a-a353-380ef79ff590")
  .single();
if (profileError || !profile?.active_org_id) throw new Error(`Perfil demo nao encontrado ou mudou: ${profileError?.message ?? "?"}`);
if (profile.name !== "Mariana Costa") throw new Error(`Perfil inesperado (nome ${profile.name}), abortando por seguranca.`);
const orgId = profile.active_org_id;
const userId = profile.id;

// --- 1. Fotos: sobe a galeria de todo imovel pra pelo menos 5, copiando
//     arquivos reais ja enviados por OUTROS imoveis (nao inventa arquivo). ---

const { data: existingMedia, error: mediaError } = await admin
  .from("real_estate_property_media")
  .select("property_id, storage_path, position")
  .eq("org_id", orgId)
  .order("position");
if (mediaError) throw new Error(`Nao foi possivel ler as fotos existentes: ${mediaError.message}`);

const byProperty = new Map();
for (const row of existingMedia) {
  if (!byProperty.has(row.property_id)) byProperty.set(row.property_id, []);
  byProperty.get(row.property_id).push(row.storage_path);
}

const allPaths = existingMedia.map((row) => row.storage_path);
const TARGET_PHOTOS = 5;
let photosAdded = 0;
let sourceCursor = 0;

for (const [propertyId, paths] of byProperty.entries()) {
  const need = Math.max(0, TARGET_PHOTOS - paths.length);
  if (need === 0) continue;
  const nextPosition0 = paths.length;
  const inserts = [];
  for (let i = 0; i < need; i++) {
    // Sempre copia de uma foto de OUTRO imovel (variedade visual), nunca da
    // propria galeria do imovel de destino.
    let source;
    for (let tries = 0; tries < allPaths.length; tries++) {
      const candidate = allPaths[(sourceCursor + tries) % allPaths.length];
      if (!candidate.includes(`/${propertyId}/`)) {
        source = candidate;
        sourceCursor = (sourceCursor + tries + 1) % allPaths.length;
        break;
      }
    }
    if (!source) continue;
    const ext = source.slice(source.lastIndexOf("."));
    const destination = `${orgId}/${propertyId}/${randomUUID()}${ext}`;
    const { error: copyError } = await admin.storage.from("property-photos").copy(source, destination);
    if (copyError) throw new Error(`Falha ao copiar foto pra ${propertyId}: ${copyError.message}`);
    inserts.push({ org_id: orgId, property_id: propertyId, storage_path: destination, position: nextPosition0 + i, created_by: userId });
  }
  if (inserts.length) {
    const { error: insertError } = await admin.from("real_estate_property_media").insert(inserts);
    if (insertError) throw new Error(`Falha ao gravar fotos de ${propertyId}: ${insertError.message}`);
    photosAdded += inserts.length;
  }
}

// --- 2. WhatsApp: conversa + historico de mensagens pra contatos que ainda
//     nao tinham uma, cobrindo os cenarios comuns de atendimento imobiliario. ---

const { data: candidates, error: candidatesError } = await admin
  .from("contacts")
  .select("id, name, phone")
  .eq("org_id", orgId)
  .not("phone", "is", null)
  .order("created_at", { ascending: false });
if (candidatesError) throw new Error(`Nao foi possivel listar contatos: ${candidatesError.message}`);

const { data: existingConversations, error: convError } = await admin
  .from("whatsapp_conversations")
  .select("contact_id")
  .eq("org_id", orgId);
if (convError) throw new Error(`Nao foi possivel listar conversas existentes: ${convError.message}`);
const contactsWithThread = new Set(existingConversations.map((c) => c.contact_id));

const targets = candidates.filter((c) => !contactsWithThread.has(c.id)).slice(0, 14);

const { data: properties } = await admin
  .from("real_estate_properties")
  .select("title, address_neighborhood")
  .eq("org_id", orgId)
  .limit(18);
const propertyRef = (i) => properties[i % properties.length];

const scenarios = [
  (p) => [
    ["contact", "inbound", `Oi Mariana, vi o anuncio do "${p.title}" no Instagram. Ainda esta disponivel?`],
    ["ai", "outbound", `Oi! Sim, esta disponivel sim. Fica no ${p.address_neighborhood}. Quer que eu te mande mais fotos e o valor certinho?`],
    ["contact", "inbound", "Quero sim, manda por favor."],
    ["ai", "outbound", "Te mandei a ficha completa por aqui. Da pra agendar uma visita ainda essa semana, qual dia fica melhor pra voce?"],
    ["contact", "inbound", "Sabado de manha consigo."],
    ["human", "outbound", "Perfeito, vou confirmar e te aviso o horario certinho por aqui."],
  ],
  (p) => [
    ["contact", "inbound", `Boa tarde! Ainda ta rolando negociacao no imovel de ${p.address_neighborhood}?`],
    ["ai", "outbound", "Boa tarde! Esse ainda esta em aberto sim, sem proposta fechada ainda."],
    ["contact", "inbound", "Consegue me mandar o valor do condominio e IPTU tambem?"],
    ["ai", "outbound", "Consigo sim, um minuto que eu confirmo os valores atualizados com o proprietario."],
    ["human", "outbound", "Confirmado: condominio e IPTU dentro da media da regiao, te chamo daqui a pouco com os numeros exatos."],
  ],
  (p) => [
    ["contact", "inbound", "Oi, gostaria de agendar uma visita para este fim de semana."],
    ["ai", "outbound", `Claro! Pra qual imovel seria, o "${p.title}"?`],
    ["contact", "inbound", "Isso mesmo."],
    ["ai", "outbound", "Tenho horario sabado as 10h ou domingo as 15h, qual prefere?"],
    ["contact", "inbound", "Domingo as 15h fica otimo."],
    ["human", "outbound", "Combinado, te mando o endereco exato e meu contato direto na sexta."],
  ],
  (p) => [
    ["contact", "inbound", "Bom dia! Fiz uma simulacao de financiamento e queria entender se da pra encaixar nesse imovel."],
    ["ai", "outbound", `Bom dia! Manda os detalhes da simulacao que eu confirmo se o valor do "${p.title}" encaixa certinho.`],
    ["contact", "inbound", "Consegui aprovacao de ate 850 mil pelo banco."],
    ["human", "outbound", "Perfeito, esse valor cobre tranquilo. Vamos seguir com a documentacao?"],
    ["contact", "inbound", "Vamos sim, pode me orientar sobre os proximos passos."],
  ],
  (p) => [
    ["contact", "inbound", `Voce ainda tem imoveis parecidos com o "${p.title}" na regiao?`],
    ["ai", "outbound", "Tenho sim, algumas opcoes proximas com metragem parecida. Quer que eu monte uma selecao pra voce comparar?"],
    ["contact", "inbound", "Quero, manda por favor."],
    ["ai", "outbound", "Montei uma vitrine com as melhores opcoes, te mando o link agora."],
    ["contact", "inbound", "Recebi, vou dar uma olhada com calma e te retorno."],
  ],
];

let conversationsAdded = 0;
let messagesAdded = 0;

for (let i = 0; i < targets.length; i++) {
  const contact = targets[i];
  const property = propertyRef(i);
  const script = scenarios[i % scenarios.length](property);
  const startHoursAgo = 6 + i * 9;
  const lastMessageAt = new Date(Date.now() - (startHoursAgo - script.length) * 3600000);

  const { data: conversation, error: conversationError } = await admin
    .from("whatsapp_conversations")
    .insert({
      org_id: orgId,
      contact_id: contact.id,
      phone_number: contact.phone,
      contact_name: contact.name,
      ia_active: i % 3 !== 0,
      last_message_at: lastMessageAt.toISOString(),
    })
    .select()
    .single();
  if (conversationError) throw new Error(`Falha ao criar conversa com ${contact.name}: ${conversationError.message}`);
  conversationsAdded++;

  const messages = script.map(([sentBy, direction, content], index) => ({
    conversation_id: conversation.id,
    org_id: orgId,
    direction,
    message_type: "text",
    content,
    sent_by: sentBy,
    created_at: new Date(Date.now() - (startHoursAgo - index) * 3600000).toISOString(),
    read_at: direction === "inbound" ? new Date(Date.now() - (startHoursAgo - index - 0.1) * 3600000).toISOString() : null,
  }));
  const { error: messagesError } = await admin.from("whatsapp_messages").insert(messages);
  if (messagesError) throw new Error(`Falha ao gravar mensagens com ${contact.name}: ${messagesError.message}`);
  messagesAdded += messages.length;
}

console.log(JSON.stringify({ org_id: orgId, fotos_adicionadas: photosAdded, conversas_adicionadas: conversationsAdded, mensagens_adicionadas: messagesAdded }, null, 2));

function loadEnvFile(path) {
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
