import { NextResponse } from "next/server";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { resolveOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  const origin = resolveOrigin(request.headers);
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${origin}/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
