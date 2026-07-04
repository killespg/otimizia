// Cria o produto "OtimizIA Pro" e um preço recorrente mensal no Stripe.
// Rode uma vez, depois de preencher STRIPE_SECRET_KEY em .env.local:
//   node scripts/create-stripe-price.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    console.error(`Não achei ${envPath}. Crie o .env.local antes de rodar este script.`);
    process.exit(1);
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "STRIPE_SECRET_KEY não encontrada em .env.local. Preencha com sua secret key do Stripe (modo teste) antes de rodar este script."
  );
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  const product = await stripe.products.create({
    name: "OtimizIA Pro",
    description: "Plano Pro do OtimizIA — CRM com IA para autônomos e pequenos negócios.",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 3990,
    currency: "brl",
    recurring: { interval: "month" },
  });

  console.log("Produto criado:", product.id);
  console.log("Preço mensal (R$ 39,90) criado:", price.id);
  console.log("\nCole isso no seu .env.local:");
  console.log(`STRIPE_PRICE_ID_PRO=${price.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
