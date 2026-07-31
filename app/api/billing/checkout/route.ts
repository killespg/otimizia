import { NextResponse } from "next/server";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { resolveOrigin } from "@/lib/utils/request-origin";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    return NextResponse.redirect(new URL("/painel/configuracoes?checkout=forbidden", request.url));
  }

  const [{ data: org }, { count: seatCount }] = await Promise.all([
    supabase.from("organizations").select("stripe_customer_id").eq("id", orgId).maybeSingle(),
    supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  let customerId = org?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_org_id: orgId },
    });
    customerId = customer.id;
    const { error } = await createAdminClient()
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", orgId);
    if (error) {
      logError("billing/checkout.link-customer", error, { userId: user.id });
      return NextResponse.redirect(new URL("/painel/configuracoes?checkout=error", request.url));
    }
  }

  const origin = resolveOrigin(request.headers);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: orgId,
    metadata: { supabase_org_id: orgId },
    subscription_data: {
      metadata: { supabase_org_id: orgId },
    },
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO!, quantity: Math.max(seatCount ?? 1, 1) }],
    // Dados fiscais coletados no próprio checkout: sem CPF/CNPJ e endereço não
    // há como emitir nota fiscal, e cobrar antes de ter esses campos é correr
    // atrás do cliente depois. tax_id_collection aceita CPF e CNPJ nos
    // formatos br_cpf / br_cnpj.
    tax_id_collection: { enabled: true, required: "if_supported" },
    billing_address_collection: "required",
    // Sem isso o Stripe guarda os dados só na sessão; com isso eles sobem para
    // o Customer e passam a sair impressos em toda fatura seguinte.
    customer_update: { name: "auto", address: "auto" },
    success_url: `${origin}/painel/configuracoes?checkout=success`,
    cancel_url: `${origin}/painel/configuracoes?checkout=cancel`,
  });

  if (!session.url) {
    return NextResponse.redirect(new URL("/painel/configuracoes?checkout=error", request.url));
  }
  return NextResponse.redirect(session.url, 303);
}
