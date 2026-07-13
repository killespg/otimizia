import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  // Next 15 mantém a API síncrona durante a transição. Mantemos esse client
  // síncrono para não transformar todos os Server Components em factories
  // assíncronas; a migração completa para cookies() assíncrono fica isolada.
  const cookieStore = cookies() as unknown as {
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string, options?: Record<string, unknown>) => void;
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component — pode ser ignorado se houver
            // middleware atualizando a sessão.
          }
        },
      },
    }
  );
}
