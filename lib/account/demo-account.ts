export const BROKER_DEMO_LOGIN = "corretor@corretor";
export const BROKER_DEMO_PASSWORD = "1";

// Supabase Auth aplica as mesmas regras de e-mail e senha das contas reais.
// O login curto acima e traduzido no servidor para esta identidade interna,
// mantendo as regras normais intactas para todos os demais usuarios.
//
// A senha NAO tem valor padrao de proposito. Enquanto ela ficou fixa neste
// arquivo, o par e-mail + senha estava publicado num repositorio publico e
// funcionava na tela de login normal de producao — a trava de ambiente logo
// abaixo so protege o atalho curto, nao as credenciais reais. Sem a variavel
// definida, o atalho simplesmente nao funciona (falha fechada).
export const BROKER_DEMO_AUTH_EMAIL =
  process.env.BROKER_DEMO_AUTH_EMAIL ?? "corretor.demo.otimizia@gmail.com";
export const BROKER_DEMO_AUTH_PASSWORD = process.env.BROKER_DEMO_AUTH_PASSWORD ?? "";

// O atalho serve para acelerar o teste manual em desenvolvimento e nunca deve
// valer no ambiente publicado: como o arquivo e versionado num repositorio
// publico, qualquer pessoa que o leia teria uma sessao autenticada no ar, com
// acesso ao assistente (que consome as chaves de IA da empresa) e ao envio de
// WhatsApp pela instancia da Evolution.
//
// A trava e por ambiente, nao por valor: trocar a senha fecharia esta porta,
// mas a proxima pessoa que precisar de um atalho reabriria o mesmo buraco sem
// perceber.
const DEMO_LOGIN_AVAILABLE = process.env.NODE_ENV !== "production";

export function resolveDemoCredentials(email: string, password: string) {
  if (!DEMO_LOGIN_AVAILABLE) return null;
  if (!BROKER_DEMO_AUTH_PASSWORD) return null;

  if (email.toLowerCase() !== BROKER_DEMO_LOGIN || password !== BROKER_DEMO_PASSWORD) {
    return null;
  }

  return {
    email: BROKER_DEMO_AUTH_EMAIL,
    password: BROKER_DEMO_AUTH_PASSWORD,
  };
}
