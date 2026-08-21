export const DASHBOARD_HOME = "/painel";

export const APP_SECTIONS = [
  "assistente",
  "calendario",
  "configuracoes",
  "contatos",
  "equipe",
  "financeiro",
  "funil",
  "produtos",
  "pedidos",
  "colecoes",
  "pos-venda",
  "imoveis",
  "juridico",
  "metricas",
  "tarefas",
  "whatsapp",
  "workspaces",
  "operacao",
  "vendas",
] as const;

export type AppSection = (typeof APP_SECTIONS)[number];

export function isDashboardPath(pathname: string) {
  if (pathname === DASHBOARD_HOME || pathname.startsWith(`${DASHBOARD_HOME}/`)) return true;
  return APP_SECTIONS.some(
    (section) => pathname === `/${section}` || pathname.startsWith(`/${section}/`),
  );
}

export function isDashboardHref(href: string) {
  const path = href.split(/[?#]/)[0] ?? "";
  return isDashboardPath(path);
}

/** `/painel/contatos` → `/contatos`. Exact `/painel` stays the overview. */
export function canonicalizeDashboardPath(path: string) {
  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : path.slice(suffixIndex);
  if (!pathname.startsWith(`${DASHBOARD_HOME}/`)) return path;
  const publicPath = pathname.slice(DASHBOARD_HOME.length);
  const section = publicPath.slice(1).split("/")[0] ?? "";
  if ((APP_SECTIONS as readonly string[]).includes(section)) {
    return `${publicPath}${suffix}`;
  }
  return path;
}

/** File-tree path used by App Router pages that still live under `/painel`. */
export function internalDashboardPath(pathname: string) {
  if (pathname === DASHBOARD_HOME || pathname.startsWith(`${DASHBOARD_HOME}/`)) {
    return pathname;
  }
  if (isDashboardPath(pathname)) return `${DASHBOARD_HOME}${pathname}`;
  return pathname;
}
