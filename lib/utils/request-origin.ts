// Atrás de um proxy (Vercel, load balancer) o host/protocolo "reais" vêm nos
// cabeçalhos x-forwarded-*, não em request.url. Usado tanto por Server
// Actions (headers() do next/headers) quanto por Route Handlers
// (request.headers) — ambos implementam a mesma interface Headers.
//
// Esses cabeçalhos vêm do cliente e podem ser forjados se o proxy na frente
// não os sobrescrever — e esse valor vira o destino de redirecionamentos
// sensíveis (link de reset de senha, success/cancel_url do Stripe Checkout,
// return_url do Portal). Por isso, em produção SITE_URL é a fonte de
// verdade e os headers nunca chegam a ser usados; eles só entram como
// fallback em dev, quando SITE_URL normalmente não está configurado.
// Para o que é gerado fora do ciclo de uma requisição do usuário (sitemap,
// robots, metadataBase): não há header confiável para consultar, então SITE_URL
// é a única fonte. Sem ela, em dev, cai em localhost.
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function resolveOrigin(headers: { get(name: string): string | null }): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const protocol =
    headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
