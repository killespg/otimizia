import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password");
  const isProtected =
    path.startsWith("/painel") ||
    path.startsWith("/painel/contatos") ||
    path.startsWith("/painel/funil") ||
    path.startsWith("/painel/tarefas") ||
    path.startsWith("/painel/calendario") ||
    path.startsWith("/painel/assistente") ||
    path.startsWith("/painel/whatsapp") ||
    path.startsWith("/painel/configuracoes") ||
    path.startsWith("/painel/equipe") ||
    path.startsWith("/painel/financeiro") ||
    path.startsWith("/painel/juridico/processos") ||
    path.startsWith("/painel/imoveis") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/upgrade");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", requestedPath);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
