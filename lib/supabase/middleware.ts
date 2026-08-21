import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canonicalizeDashboardPath, isDashboardPath } from "@/lib/workspace/app-routes";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password");
  const isProtected =
    isDashboardPath(path) ||
    path.startsWith("/onboarding") ||
    path.startsWith("/upgrade");

  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request });
  }

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

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const requestedPath = canonicalizeDashboardPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", requestedPath);
    return NextResponse.redirect(url);
  }

  // Login por Google não pede CPF no fluxo (não tem como injetar campo extra
  // no consentimento do provedor). Em vez de travar o cadastro, deixa entrar
  // e intercepta aqui: qualquer rota protegida com `profiles.cpf` vazio
  // redireciona pro preenchimento antes de continuar. Não roda pra login por
  // senha, já que ali o CPF é obrigatório desde o formulário de cadastro.
  if (user && isProtected && !path.startsWith("/onboarding/cpf")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("cpf")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && !profile.cpf) {
      const url = request.nextUrl.clone();
      const requestedPath = canonicalizeDashboardPath(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      url.pathname = "/onboarding/cpf";
      url.search = "";
      url.searchParams.set("next", requestedPath);
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
