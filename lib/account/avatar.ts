export const PROFILE_PHOTOS_BUCKET = "profile-photos";

/** 4 MB — mesmo teto declarado no bucket pela migration 0081. */
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * URL pública da foto de perfil.
 *
 * O perfil guarda o caminho no Storage, não a URL. Montar a URL aqui — em vez
 * de chamar `storage.getPublicUrl` — evita instanciar um client Supabase só
 * para concatenar string, o que importa porque o avatar é desenhado no layout
 * de toda tela do painel.
 */
export function avatarPublicUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}/${path}`;
}

/**
 * Iniciais de quem não tem foto.
 *
 * Estava reimplementado em quatro lugares — topbar, sidebar, configurações
 * rápidas e cabeçalho do painel imobiliário — com regras levemente diferentes
 * (uns pegavam as duas primeiras palavras, outros a primeira e a última). Agora
 * é uma só: primeira e última palavra, que é o que identifica alguém chamado
 * "Mariana Costa Andrade".
 */
export function avatarInitials(name: string | null | undefined, fallback = "OT"): string {
  const parts = (typeof name === "string" ? name : "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || fallback;
}
