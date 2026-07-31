import {
  ACCOUNT_PROFILE_COLUMNS,
  ORGANIZATION_AFFILIATION_COLUMNS,
  PERSONAL_EXPORT_DATASETS,
  type PersonalExportDataset,
} from "@/lib/account/account-export";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId } from "@/lib/workspace/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE_SIZE = 500;
const DATASET_BATCH_SIZE = 4;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function readAllByUser(
  supabase: Supabase,
  dataset: PersonalExportDataset,
  userId: string,
) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(dataset.table)
      .select(dataset.select)
      .eq(dataset.userColumn, userId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Não foi possível exportar ${dataset.key}.`);
    }
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  return rows;
}

async function readPersonalData(
  supabase: Supabase,
  userId: string,
) {
  const result: Record<string, unknown[]> = {};
  for (
    let index = 0;
    index < PERSONAL_EXPORT_DATASETS.length;
    index += DATASET_BATCH_SIZE
  ) {
    const batch = PERSONAL_EXPORT_DATASETS.slice(
      index,
      index + DATASET_BATCH_SIZE,
    );
    const entries = await Promise.all(
      batch.map(async (dataset) => [
        dataset.key,
        await readAllByUser(supabase, dataset, userId),
      ] as const),
    );
    for (const [key, rows] of entries) result[key] = rows;
  }
  return result;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const activeOrganizationId = await getActiveOrgId(supabase, user.id);
    const { data: memberships, error: membershipsError } = await supabase
      .from("organization_members")
      .select("org_id, role, job_role, created_at")
      .eq("user_id", user.id);
    if (membershipsError) {
      throw new Error("Não foi possível exportar suas organizações.");
    }

    const orgIds = Array.from(new Set(
      (memberships ?? []).map((membership) => membership.org_id as string),
    ));
    const [profile, organizations, personalData] = await Promise.all([
      supabase
        .from("profiles")
        .select(ACCOUNT_PROFILE_COLUMNS)
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select(ORGANIZATION_AFFILIATION_COLUMNS)
        .in("id", orgIds),
      readPersonalData(supabase, user.id),
    ]);

    if (profile.error || organizations.error) {
      throw new Error("Não foi possível preparar os dados da conta.");
    }

    // notification_log é service-role only por design. O filtro fixo pelo
    // usuário autenticado mantém a exportação pessoal sem abrir essa tabela
    // para o navegador.
    const { data: notificationHistory, error: notificationHistoryError } =
      await createAdminClient()
        .from("notification_log")
        .select("id,user_id,kind,sent_for_date,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
    if (notificationHistoryError) {
      throw new Error("Não foi possível exportar o histórico de notificações.");
    }

    const payload = {
      schema_version: 3,
      exported_at: new Date().toISOString(),
      scope:
        "Dados pessoais da conta e registros operacionais diretamente vinculados a ela como proprietária ou autora.",
      account: {
        id: user.id,
        email: user.email,
        phone: user.phone || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        active_organization_id: activeOrganizationId,
      },
      profile: profile.data,
      affiliations: {
        active_organization_id: activeOrganizationId,
        memberships: memberships ?? [],
        organizations: organizations.data ?? [],
      },
      personal_data: {
        ...personalData,
        notification_history: notificationHistory ?? [],
      },
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="meus-dados-otimizia.json"',
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logError("api/account/export", error, { userId: user.id });
    return Response.json(
      {
        error:
          "Não foi possível preparar sua exportação completa agora. Tente novamente.",
      },
      { status: 500 },
    );
  }
}
