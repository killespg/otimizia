import type { ReactNode } from "react";

// A visibilidade do conteúdo principal não pode depender de JavaScript,
// requestAnimationFrame ou preferências de movimento. O provider do Tim vive
// no layout (acima daqui), então a conversa continua sem reiniciar nas rotas.
export default function PainelTemplate({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
