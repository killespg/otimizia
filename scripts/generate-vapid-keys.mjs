// Gera o par de chaves VAPID usado pelo Web Push. Rode uma vez:
//   node scripts/generate-vapid-keys.mjs
// Copie a saída para VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /
// NEXT_PUBLIC_VAPID_PUBLIC_KEY no .env.local (e nas env vars de produção).
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
