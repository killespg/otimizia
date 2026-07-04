import Stripe from "stripe";

let cached: Stripe | null = null;

// Construção adiada: process.env.STRIPE_SECRET_KEY pode não existir ainda
// durante `next build` (coleta de dados das rotas) — só precisa existir
// quando uma rota de billing roda de verdade.
export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cached;
}
