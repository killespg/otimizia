import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe webhook] assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string | null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(supabase, customerId, subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(supabase, subscription.customer as string, subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("profiles")
        .update({ plan: "free", plan_status: "canceled", stripe_subscription_id: null })
        .eq("stripe_customer_id", subscription.customer as string);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string,
  subscription: Stripe.Subscription
) {
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const plan = activeStatuses.has(subscription.status) ? "pro" : "free";
  const periodEndSeconds = subscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEndSeconds
    ? new Date(periodEndSeconds * 1000).toISOString()
    : null;

  await supabase
    .from("profiles")
    .update({
      plan,
      plan_status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
    })
    .eq("stripe_customer_id", customerId);
}
