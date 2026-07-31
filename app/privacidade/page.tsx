import type { Metadata } from "next";
import Link from "next/link";
import { BrandName } from "@/components/design-system/BrandName";
import { CookiePreferencesLink } from "@/components/site/CookieConsent";

export const metadata: Metadata = {
  title: "Política de Privacidade | OtimizIA",
  description:
    "Quais dados o OtimizIA coleta, para quê, por quanto tempo guarda e como exercer seus direitos de titular sob a LGPD.",
};

const UPDATED_AT = "29 de julho de 2026";

export default function PrivacidadePage() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fbff] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="nav-item inline-flex items-center gap-2 text-sm font-black text-ink-muted hover:text-brand-700"
        >
          Voltar
        </Link>

        <div className="panel space-y-6 p-6 sm:p-8">
          <header>
            <p className="text-sm font-black text-ink"><BrandName /></p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink sm:text-3xl">
              Política de Privacidade
            </h1>
            <p className="mt-2 text-sm font-medium text-ink-muted">
              Última atualização: {UPDATED_AT}. Escrita conforme a Lei nº 13.709/2018 (LGPD).
            </p>
          </header>

          <Section title="1. Quem é o controlador">
            <p>
              O <BrandName /> é o controlador dos dados tratados nesta plataforma. Para
              qualquer assunto de privacidade — inclusive os pedidos descritos no item 7 —
              o canal é{" "}
              <a className="font-black text-brand-700" href="mailto:privacidade@useotimizia.com">
                privacidade@useotimizia.com
              </a>
              , com resposta em até 15 dias.
            </p>
            <p>
              Quando você cadastra dados dos <em>seus</em> clientes na plataforma, os papéis se
              invertem: você é o controlador desses dados e o <BrandName /> atua como operador,
              tratando-os apenas para executar o serviço e seguindo suas instruções.
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <List
              items={[
                "Cadastro: nome, e-mail, senha (armazenada apenas como hash) e CPF, usado para identificar o titular da conta.",
                "Uso do produto: contatos, negociações, tarefas, lembretes, documentos e conversas que você registra.",
                "Pagamento: dados de assinatura processados pela Stripe. Número de cartão nunca passa pelos nossos servidores.",
                "Técnicos: endereço IP, navegador e registros de acesso, mantidos para segurança e para cumprir o art. 15 do Marco Civil da Internet.",
                "Comunicação: mensagens trocadas com o suporte e, se você conectar o WhatsApp, o conteúdo necessário para exibir e responder as conversas.",
              ]}
            />
          </Section>

          <Section title="3. Para que usamos e com qual base legal">
            <List
              items={[
                "Executar o contrato (art. 7º, V): criar e manter sua conta, entregar as funções do produto e cobrar a assinatura.",
                "Cumprir obrigação legal (art. 7º, II): emissão fiscal, guarda de registros de acesso e resposta a autoridades.",
                "Legítimo interesse (art. 7º, IX): segurança, prevenção a fraude e melhorias no produto, sempre com o mínimo de dados necessário.",
                "Consentimento (art. 7º, I): cookies não essenciais, comunicações de marketing e recursos de inteligência artificial opcionais. Pode ser revogado a qualquer momento.",
              ]}
            />
          </Section>

          <Section title="4. Com quem compartilhamos">
            <p>
              Não vendemos dados. Compartilhamos apenas com operadores necessários para o serviço
              funcionar, cada um limitado à sua finalidade: Supabase (banco de dados e
              autenticação), Vercel (hospedagem), Stripe (pagamentos), Resend (e-mails
              transacionais), Cloudflare (proteção contra abuso), Anthropic e OpenAI (assistente de
              IA), Autentique (assinatura eletrônica, no módulo jurídico) e, mediante seu
              consentimento, Google e Meta (medição de uso e anúncios).
            </p>
            <p>
              Parte desses serviços está fora do Brasil. A transferência internacional segue o
              art. 33 da LGPD, amparada em cláusulas contratuais com garantias equivalentes.
            </p>
            <p>
              Os seus dados <strong>não</strong> são usados para treinar modelos de inteligência
              artificial de terceiros.
            </p>
          </Section>

          <Section title="5. Cookies">
            <p>
              Cookies essenciais mantêm sua sessão e protegem o login — sem eles a plataforma não
              funciona e por isso não dependem de consentimento. Cookies de medição de uso e de
              publicidade só são gravados depois do seu &quot;sim&quot; explícito no banner, e cada
              escolha fica registrada com data e hora para que você possa contestá-la.
            </p>
            <p>
              <CookiePreferencesLink className="font-black text-brand-700 underline underline-offset-2" />{" "}
              — mude ou revogue sua escolha quando quiser.
            </p>
          </Section>

          <Section title="6. Por quanto tempo guardamos">
            <List
              items={[
                "Dados da conta e conteúdo: enquanto a conta existir. Após a exclusão, são apagados em até 30 dias.",
                "Registros de acesso: 6 meses, conforme o Marco Civil da Internet.",
                "Documentos fiscais e financeiros: 5 anos, por obrigação legal.",
                "Registros de consentimento: enquanto o consentimento valer e por 5 anos depois, como prova de que ele existiu.",
              ]}
            />
          </Section>

          <Section title="7. Seus direitos">
            <p>
              A LGPD garante confirmação de tratamento, acesso, correção, anonimização, portabilidade,
              eliminação e revogação do consentimento. Dois deles já estão disponíveis sem precisar
              falar com ninguém, em <strong>Configurações</strong>: exportar o perfil, as preferências
              e os registros operacionais diretamente vinculados à sua conta em formato aberto, ou
              excluir a conta em definitivo. A exportação pessoal não funciona como backup da
              organização e não inclui dados pertencentes aos seus colegas. Os demais direitos,
              peça pelo e-mail do item 1.
            </p>
            <p>
              Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Section>

          <Section title="8. Segurança">
            <p>
              Os dados trafegam sempre cifrados (TLS) e ficam isolados por organização no banco,
              com regras de acesso aplicadas no próprio servidor — não apenas na interface. Senhas
              são guardadas como hash e nunca podem ser lidas por nós. Em caso de incidente com
              risco relevante, comunicamos você e a ANPD.
            </p>
          </Section>

          <Section title="9. Mudanças nesta política">
            <p>
              Se mudarmos o que é coletado ou com quem é compartilhado, avisamos por e-mail e, no
              caso dos cookies, o banner volta a aparecer para uma nova escolha. Continuar usando a
              plataforma depois disso não substitui o consentimento — ele é sempre pedido de novo.
            </p>
          </Section>

          <p className="text-sm font-medium text-ink-muted">
            Veja também os{" "}
            <Link href="/termos" className="font-black text-brand-700">
              Termos de Uso
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-black tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-sm font-medium leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
