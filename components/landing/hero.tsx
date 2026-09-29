import Image from "next/image";
import { ArrowRight, Check, Send, Paperclip } from "lucide-react";
import { HeroScene } from "./scene";

/**
 * Conversa com o Tim, em vidro. O pitch do hero entra na fala: ele diz que já
 * respondeu a Carla no WhatsApp; embaixo, o recibo do que já está na conta.
 */
const ACOES = ["Contato · Carla Nogueira", "Negociação · Qualificação", "Visita · amanhã, 15h"];

function TimChat() {
  return (
    <div className="oz-card oz-chat" role="img" aria-label="Conversa com o Tim: ele responde a Carla no WhatsApp, cria o contato e marca a visita">
      <div className="oz-chat-inner" aria-hidden="true">
        <div className="oz-chat-top">
          <Image src="/otimizia-mark-2026-dark.png" alt="" width={24} height={24} unoptimized />
          Tim
        </div>
        <div className="oz-chat-body">
          <p className="oz-bubble oz-bubble-me">Quem eu preciso chamar hoje?</p>
          <div className="oz-bubble oz-bubble-tim">
            A Carla mandou no WhatsApp agora perguntando do apartamento do Sumaré. Já respondi, criei o contato e deixei a
            visita marcada pra amanhã às 15h.
            <ul className="oz-recibo">
              {ACOES.map((acao) => (
                <li key={acao}>
                  <Check size={14} strokeWidth={2.5} />
                  {acao}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="oz-chat-input">
          <span>Mensagem para o Tim…</span>
          <span>
            <Paperclip size={14} /> Enviar <Send size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="oz-hero">
      <HeroScene />
      <div className="oz-container oz-hero-grid">
        <div>
          <p className="oz-eyebrow">CRM do solo ao time, com WhatsApp e IA</p>
          <h1 className="oz-h1" style={{ marginTop: 24 }}>
            A IA atende seu WhatsApp. <em>Você entra quando importa.</em>
          </h1>
          <p className="oz-lead" style={{ marginTop: 24, maxWidth: 560 }}>
            Ela responde na hora, identifica quem está pronto para fechar e abre a negociação no seu funil. Você acompanha
            tudo e assume quando quiser.
          </p>
          <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a id="hero-cta" href="/signup" className="oz-btn" style={{ minHeight: 52 }}>
              Começar grátis
              <ArrowRight size={16} aria-hidden />
            </a>
            <a href="#painel" className="oz-btn-ghost" style={{ minHeight: 52 }}>
              Conhecer o painel
            </a>
          </div>
          <ul className="oz-checks" style={{ marginTop: 32 }}>
            {["Sem cartão", "Configuração guiada", "Cancele quando quiser"].map((item) => (
              <li key={item}>
                <Check size={16} strokeWidth={2.5} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <TimChat />
      </div>
    </section>
  );
}
