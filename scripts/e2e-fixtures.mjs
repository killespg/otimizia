import { randomBytes } from "node:crypto";

const SELLER_MODULES = [
  "catalog",
  "inventory",
  "orders",
  "warranties",
  "delivery",
];

function password() {
  return `E2E-${randomBytes(24).toString("base64url")}`;
}

async function createUser(admin, prefix, metadata) {
  const email = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}@example.test`;
  const userPassword = password();
  let lastError;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        terms_accepted: true,
      },
    });
    lastError = error;
    if (!error && data.user?.id) {
      return { id: data.user.id, email, password: userPassword };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `Não foi possível criar a conta ${prefix}: ${lastError?.message ?? "usuário ausente"}`,
  );
}

async function personalOrgId(admin, userId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { data, error } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!error && data?.org_id) return data.org_id;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("A organização pessoal da fixture E2E não foi criada.");
}

function ensure(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export async function createE2EFixtures(admin, prefix) {
  const seller = await createUser(admin, `${prefix}-seller`, {
    name: "E2E vendedor",
    profession_type: "autonomous_seller",
    profession_types: ["autonomous_seller", "real_estate_broker"],
  });
  const restricted = await createUser(admin, `${prefix}-restricted`, {
    name: "E2E acesso restrito",
    profession_type: "real_estate_broker",
    profession_types: ["real_estate_broker"],
  });

  const [sellerOrgId, restrictedOrgId] = await Promise.all([
    personalOrgId(admin, seller.id),
    personalOrgId(admin, restricted.id),
  ]);

  ensure(
    (
      await admin
        .from("profiles")
        .update({
          profession_type: "autonomous_seller",
          profession_types: ["autonomous_seller", "real_estate_broker"],
        })
        .eq("id", seller.id)
    ).error,
    "Não foi possível preparar o workspace do vendedor",
  );
  ensure(
    (
      await admin
        .from("profiles")
        .update({
          profession_type: "real_estate_broker",
          profession_types: ["real_estate_broker"],
        })
        .eq("id", restricted.id)
    ).error,
    "Não foi possível preparar o workspace restrito",
  );
  ensure(
    (
      await admin
        .from("organization_members")
        .update({ role: "member", job_role: "staff" })
        .eq("org_id", restrictedOrgId)
        .eq("user_id", restricted.id)
    ).error,
    "Não foi possível limitar o cargo imobiliário",
  );
  ensure(
    (
      await admin.from("organization_members").upsert({
        org_id: sellerOrgId,
        user_id: restricted.id,
        role: "member",
        job_role: "staff",
      })
    ).error,
    "Não foi possível criar a colaboração usada no teste de exportação",
  );
  ensure(
    (
      await admin.from("seller_business_profiles").upsert({
        org_id: sellerOrgId,
        workspace_key: "autonomous_seller",
        sales_models: ["durable"],
        enabled_modules: SELLER_MODULES,
        default_warranty_days: 365,
        low_stock_threshold: 3,
        allow_negative_stock: false,
      })
    ).error,
    "Não foi possível habilitar os módulos do vendedor E2E",
  );

  const sharedContactName = `Contato de colega ${randomBytes(5).toString("hex")}`;
  ensure(
    (
      await admin.from("contacts").insert({
        owner_id: restricted.id,
        org_id: sellerOrgId,
        workspace_key: "autonomous_seller",
        name: sharedContactName,
      })
    ).error,
    "Não foi possível criar o dado compartilhado de controle",
  );

  return {
    seller,
    restricted,
    sharedContactName,
    orgIds: [restrictedOrgId, sellerOrgId],
    userIds: [restricted.id, seller.id],
  };
}

export async function deleteE2EFixtures(admin, userIds, orgIds = []) {
  const failures = [];

  if (orgIds.length > 0) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ active_org_id: null })
      .in("id", userIds);
    if (profileError) failures.push(profileError);

    const { error } = await admin.from("organizations").delete().in("id", orgIds);
    if (error) failures.push(error);
  }

  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(error);
  }
  if (failures.length > 0) {
    throw new Error("Não foi possível remover todas as contas E2E efêmeras.");
  }
}
