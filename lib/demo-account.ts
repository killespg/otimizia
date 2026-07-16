export const BROKER_DEMO_LOGIN = "corretor@corretor";
export const BROKER_DEMO_PASSWORD = "1";

// Supabase Auth aplica as mesmas regras de e-mail e senha das contas reais.
// O login curto acima e traduzido no servidor para esta identidade interna,
// mantendo as regras normais intactas para todos os demais usuarios.
export const BROKER_DEMO_AUTH_EMAIL = "corretor.demo.otimizia@gmail.com";
export const BROKER_DEMO_AUTH_PASSWORD = "OtimizIA-demo-corretor-2026!";

export function resolveDemoCredentials(email: string, password: string) {
  if (email.toLowerCase() !== BROKER_DEMO_LOGIN || password !== BROKER_DEMO_PASSWORD) {
    return null;
  }

  return {
    email: BROKER_DEMO_AUTH_EMAIL,
    password: BROKER_DEMO_AUTH_PASSWORD,
  };
}
