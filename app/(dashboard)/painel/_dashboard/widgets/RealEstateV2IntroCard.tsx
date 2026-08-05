import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import { dismissRealEstateV2Intro } from "../../actions";
import {
  IconBot,
  IconBuilding,
  IconCalendar,
  IconUsers,
  IconWallet,
  IconX,
} from "../../icons";

const REAL_ESTATE_V2_HIGHLIGHTS = [
  { title: "Match de clientes", desc: "A carteira já sugere o imóvel certo pra cada perfil de busca.", href: "/painel/imoveis", icon: IconUsers },
  { title: "Visitas", desc: "Agende, confirme e registre o feedback de cada visita num só lugar.", href: "/painel/imoveis/visitas", icon: IconCalendar },
  { title: "Propostas", desc: "Monte, envie e acompanhe o status de cada proposta até fechar.", href: "/painel/imoveis", icon: IconBuilding },
  { title: "Comissão", desc: "Veja o previsto, o recebido e o que já está vencido.", href: "/painel/imoveis/dashboard", icon: IconWallet },
  { title: "Chat de filtro", desc: "Descreva o que o cliente procura e a IA já filtra a carteira.", href: "/painel/imoveis", icon: IconBot },
];

// Card único de "o que mudou" quando a v2 imobiliária liga pro workspace —
// não é o checklist genérico de primeiros passos (OnboardingChecklist,
// aparece pra todo profissional), é um anúncio pontual desta leva de
// funcionalidades específica. Dispensa permanente por usuário (mesmo padrão
// de dismissChecklist/checklist_dismissed_at), não por organização — cada
// corretor da equipe vê e dispensa a própria vez.
export function RealEstateV2IntroCard() {
  return (
    <section className="enter relative rounded-md border border-brand-200 bg-brand-50 p-5">
      <form action={dismissRealEstateV2Intro} className="absolute right-3 top-3">
        <PendingButton
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-od-text-3 hover:bg-od-surface/60 hover:text-od-text"
          aria-label="Fechar novidades da carteira de imóveis"
          iconOnly
          pendingLabel="Fechando"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </PendingButton>
      </form>

      <p className="text-sm font-black text-brand-800">Novidades na carteira de imóveis</p>
      <h2 className="mt-2 max-w-lg text-2xl font-black tracking-[-0.03em] text-od-text">
        Sua carteira ganhou match, visitas, propostas e comissão.
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {REAL_ESTATE_V2_HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="row-link relative rounded-md border border-brand-200 bg-od-surface p-4 hover:border-brand-400"
            >
              <Icon className="h-6 w-6 text-brand-700" />
              <p className="mt-4 text-sm font-black text-od-text">{item.title}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-od-text-3">{item.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
