/** @type {import('next').NextConfig} */
const nextConfig = {
  // Some o balão de indicador do Next em desenvolvimento, a pedido. Ele só
  // existe em dev e nunca chegou a ir para produção, então isto não muda o
  // que o visitante vê. O custo é real, porém: erro de hidratação e falha de
  // Server Action deixam de se anunciar sozinhos na tela. Continuam aparecendo
  // no console do navegador e no terminal do `next dev`.
  devIndicators: false,
  images: {
    // Fotos de imóveis vivem no Storage público do Supabase. Sem liberar o
    // host aqui, next/image (usado no detalhe do imóvel e no gerenciador de
    // fotos) quebra a imagem. A Carteira/Vitrines usam <img> e não dependem
    // disto, mas a galeria do imóvel sim.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    // Dashboard pages are authenticated and therefore dynamic. Keep their
    // prefetched RSC payloads in the client router so module switches do not
    // repeat the Supabase roundtrip. Server Actions already revalidate every
    // affected route after a mutation.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Next 16.2 normally requests each route segment separately. The dashboard
    // has one persistent shell, so one inlined prefetch response is cheaper.
    prefetchInlining: true,
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/painel", permanent: true },
      { source: "/contacts/import", destination: "/painel/contatos/importar", permanent: true },
      { source: "/contacts/:path*", destination: "/painel/contatos/:path*", permanent: true },
      { source: "/pipeline/report", destination: "/painel/funil/relatorio", permanent: true },
      { source: "/pipeline/:path*", destination: "/painel/funil/:path*", permanent: true },
      { source: "/whatsapp/:path*", destination: "/painel/whatsapp/:path*", permanent: true },
      { source: "/tasks/:path*", destination: "/painel/tarefas/:path*", permanent: true },
      { source: "/calendar/:path*", destination: "/painel/calendario/:path*", permanent: true },
      { source: "/assistant/:path*", destination: "/painel/assistente/:path*", permanent: true },
      { source: "/team/:path*", destination: "/painel/equipe/:path*", permanent: true },
      { source: "/settings/:path*", destination: "/painel/configuracoes/:path*", permanent: true },
      { source: "/finance/import", destination: "/painel/financeiro/importar", permanent: true },
      { source: "/finance/:path*", destination: "/painel/financeiro/:path*", permanent: true },
      { source: "/dev/:path*", destination: "/painel/metricas/:path*", permanent: true },
      { source: "/law/consulta", destination: "/painel/juridico/consulta", permanent: true },
      { source: "/law/deadlines/calendar", destination: "/painel/juridico/prazos/calendario", permanent: true },
      { source: "/law/deadlines/:path*", destination: "/painel/juridico/prazos/:path*", permanent: true },
      { source: "/law/:path*", destination: "/painel/juridico/processos/:path*", permanent: true },
      { source: "/imoveis/colecoes/nova", destination: "/painel/imoveis/colecoes/nova", permanent: true },
      { source: "/imoveis/:path*", destination: "/painel/imoveis/:path*", permanent: true },
      { source: "/dashboard-juridico/core/funil", destination: "/painel/funil", permanent: true },
      { source: "/dashboard-juridico/core/whatsapp", destination: "/painel/whatsapp", permanent: true },
      { source: "/dashboard-juridico/core/calendario", destination: "/painel/calendario", permanent: true },
      { source: "/dashboard-juridico/core/tarefas", destination: "/painel/tarefas", permanent: true },
      { source: "/dashboard-juridico/processos/:path*", destination: "/painel/juridico/processos/:path*", permanent: true },
      { source: "/dashboard-juridico/consulta-datajud", destination: "/painel/juridico/consulta", permanent: true },
      { source: "/dashboard-juridico/agenda/calculadora", destination: "/painel/juridico/prazos/calculadora", permanent: true },
      { source: "/dashboard-juridico/agenda/:path*", destination: "/painel/juridico/prazos/:path*", permanent: true },
      { source: "/dashboard-juridico/documentos/:path*", destination: "/painel/juridico/documentos/:path*", permanent: true },
      { source: "/dashboard-juridico/clientes/:path*", destination: "/painel/contatos/:path*", permanent: true },
      { source: "/dashboard-juridico/equipe/:path*", destination: "/painel/equipe/:path*", permanent: true },
      { source: "/dashboard-juridico/financeiro/:path*", destination: "/painel/financeiro/:path*", permanent: true },
      { source: "/dashboard-juridico/socio-assistente/:path*", destination: "/painel/assistente/:path*", permanent: true },
      { source: "/dashboard-juridico/configuracoes/:path*", destination: "/painel/configuracoes/:path*", permanent: true },
      { source: "/dashboard-juridico/workspaces/:path*", destination: "/painel/workspaces/:path*", permanent: true },
      { source: "/dashboard-juridico", destination: "/painel/juridico", permanent: true },
    ];
  },
};

export default nextConfig;
