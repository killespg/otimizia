import { Paperclip, Send, Sparkles } from "lucide-react";

/**
 * Tim em ação. As tools em lib/ai/tools escrevem no banco (create_contact,
 * create_deal, move_deal, schedule_property_visit), por isso os exemplos
 * misturam pergunta e ordem: assistente que só sugere é commodity.
 */
const ORDENS = [
  "Quem eu preciso chamar hoje?",
  "Cadastra a Carla e abre uma negociação",
  "Move o negócio do João pra proposta",
  "Agenda visita no apartamento do Sumaré sexta às 15h",
];

export function Assistant() {
  return (
    <div className="oz-tim-grid">
      <div>
        <h3 className="oz-h2" style={{ fontSize: "clamp(26px, 3vw, 36px)" }}>
          Tim em ação
        </h3>
        <ul className="oz-orders oz-rows" style={{ marginTop: 24 }}>
          {ORDENS.map((ordem) => (
            <li key={ordem}>
              <Sparkles size={15} strokeWidth={2} aria-hidden />
              {ordem}
            </li>
          ))}
        </ul>
      </div>

      <div className="oz-card oz-composer">
        <div className="oz-chat-inner" style={{ paddingBottom: 4 }}>
          <h3>Como posso ajudar hoje?</h3>
          <p>Pergunte sobre clientes, vendas ou lembretes</p>
          <div className="oz-chat-body" style={{ paddingTop: 20 }}>
            <p className="oz-bubble oz-bubble-me">Cadastra a Carla e abre uma negociação</p>
            <div className="oz-bubble oz-bubble-tim">
              <span className="oz-label" style={{ display: "block", marginBottom: 4, letterSpacing: "0.12em" }}>
                Tim
              </span>
              Cadastrei a Carla e abri uma negociação nova em Qualificação.
            </div>
          </div>
          <div className="oz-chat-input" aria-hidden="true">
            <span style={{ background: "none", padding: 0, fontWeight: 400 }}>Mensagem para o Tim…</span>
            <span>
              <Paperclip size={14} /> Enviar <Send size={13} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
