const CASE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLegalCaseUuid(value: string) {
  return CASE_UUID.test(value);
}

export function slugifyLegalCaseTitle(raw: string) {
  let slug = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 72)
    .replace(/-+$/g, "");
  if (!slug) slug = "caso";
  if (isLegalCaseUuid(slug)) slug = `caso-${slug}`;
  return slug;
}

export function legalCaseHref(slug?: string | null, id?: string | null) {
  const token = slug || id;
  if (!token) return "/juridico/processos";
  return `/juridico/processos/${token}`;
}

export function legalCaseHrefOrSearch(slug?: string | null, id?: string | null) {
  if (!slug && !id) return "/juridico/processos#datajud";
  return legalCaseHref(slug, id);
}
