import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesLink } from "@/components/site/CookieConsent";

export function Footer() {
  return (
    <footer className="oz-footer">
      <div className="oz-container">
        <div className="oz-footer-grid">
          <div style={{ maxWidth: 320 }}>
            <Image src="/otimizia-logo-2026-dark.png" alt="OtimizIA" width={111} height={24} unoptimized style={{ height: 24, width: "auto" }} />
            <p className="oz-small" style={{ marginTop: 14 }}>
              CRM para quem trabalha sozinho ou com equipe, com o painel da sua profissão.
            </p>
          </div>
          <div className="oz-footer-cols">
            <div>
              <p className="oz-label">Produto</p>
              <ul>
                <li><Link href="#recursos">Recursos</Link></li>
                <li><Link href="#painel">O painel</Link></li>
                <li><Link href="#planos">Planos</Link></li>
                <li><Link href="#sobre">Sobre nós</Link></li>
              </ul>
            </div>
            <div>
              <p className="oz-label">Conta</p>
              <ul>
                <li><Link href="/login">Entrar</Link></li>
                <li><Link href="/signup">Criar conta</Link></li>
                <li><Link href="/termos">Termos de uso</Link></li>
                <li><Link href="/privacidade">Privacidade</Link></li>
                <li>
                  <CookiePreferencesLink className="inline-flex min-h-11 items-center text-left" />
                </li>
              </ul>
            </div>
            {/* SAC como mailto de verdade: no celular, endereço que não abre o app de e-mail vira copiar e colar. */}
            <div>
              <p className="oz-label">Atendimento</p>
              <ul>
                <li>
                  <a href="mailto:venancio@useotimizia.com" style={{ wordBreak: "break-all" }}>
                    venancio@useotimizia.com
                  </a>
                </li>
                <li><Link href="#duvidas">Perguntas frequentes</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p className="oz-copy">© {new Date().getFullYear()} OtimizIA. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
