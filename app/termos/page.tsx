import Link from "next/link";
import { BrandName } from "@/components/BrandName";

export default function TermosPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fbff] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/signup"
          className="nav-item inline-flex items-center gap-2 text-sm font-black text-ink-muted hover:text-brand-700"
        >
          Voltar
        </Link>

        <div className="panel space-y-6 p-6 sm:p-8">
          <header>
            <p className="text-sm font-black text-ink"><BrandName /></p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink sm:text-3xl">
              Termos de Uso e Contrato de Prestação de Serviço
            </h1>
          </header>

          <Section title="1. Objeto">
            Este contrato regula o uso da plataforma <BrandName />, um sistema de CRM
            (gestão de contatos, negócios e lembretes) oferecido como software
            como serviço (SaaS) para profissionais autônomos e pequenos negócios.
          </Section>

          <Section title="2. Cadastro">
            Para criar uma conta, o usuário deve fornecer nome, e-mail e CPF
            válidos. O CPF é utilizado para identificação do titular da conta e
            não pode ser compartilhado entre contas diferentes. O usuário é
            responsável pela veracidade das informações cadastradas e pela
            guarda de sua senha.
          </Section>

          <Section title="3. Uso de dados e privacidade">
            Os dados cadastrados (contatos, negócios, conversas e informações do
            perfil) pertencem ao usuário e são tratados conforme a Lei Geral de
            Proteção de Dados (LGPD, Lei nº 13.709/2018). Esses dados são
            utilizados exclusivamente para operar a plataforma e não são vendidos
            a terceiros.
          </Section>

          <Section title="4. Responsabilidades do usuário">
            O usuário é responsável pelo conteúdo inserido na plataforma,
            incluindo dados de seus próprios clientes, e deve garantir que possui
            base legal para tratar essas informações.
          </Section>

          <Section title="5. Cancelamento">
            O usuário pode encerrar sua conta a qualquer momento. O cancelamento
            não exclui automaticamente registros que a lei exija manter por
            período determinado.
          </Section>

          <Section title="6. Limitação de responsabilidade">
            A plataforma é fornecida &quot;como está&quot;. Na medida permitida por lei, o
            <BrandName /> não se responsabiliza por decisões de negócio tomadas com
            base nas informações ou sugestões apresentadas pelo sistema.
          </Section>

          <Section title="7. Foro e legislação aplicável">
            Este contrato é regido pelas leis da República Federativa do Brasil.
            Fica eleito o foro do domicílio do usuário para dirimir eventuais
            controvérsias, salvo disposição legal em contrário.
          </Section>

          <p className="text-sm font-medium text-ink-muted">
            Ao marcar a caixa de aceite no cadastro, o usuário declara ter lido e
            concordado com estes termos.
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
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
        {children}
      </p>
    </section>
  );
}
