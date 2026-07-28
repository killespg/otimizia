import "server-only";

import { logError } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncOrganizationSeats(orgId: string): Promise<void> {
  const admin = createAdminClient();
  const [{ data: org }, { count }] = await Promise.all([
    admin
      .from("organizations")
      .select("stripe_subscription_id")
      .eq("id", orgId)
      .maybeSingle(),
    admin
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);
  if (!org?.stripe_subscription_id) return;

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) return;

    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: item.id, quantity: Math.max(count ?? 1, 1) }],
    });
  } catch (error) {
    logError("billing.sync-organization-seats", error, { orgId });
  }
}
