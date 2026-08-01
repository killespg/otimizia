// Logger mínimo e sem dependências externas: emite uma linha JSON por erro
// para stdout/stderr. Isso já é o suficiente para qualquer log drain
// (Vercel Logs, Datadog, Logtail...) indexar por "scope" e alertar — trocar
// por um provedor específico (Sentry etc) depois é só mudar esta função.

// Nem todo SDK rejeita com uma instância de `Error`. O do Resend devolve um
// objeto puro (`{ statusCode, name, message }`), e ele caía no `String()`, que
// produz a literal "[object Object]". O efeito foi pior que não ter log: o
// alerta `email.send-failed` disparou todos os dias por duas semanas sem dizer
// uma única vez qual era o motivo da recusa.
function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === "object" && error !== null) {
    const objeto = error as { name?: unknown; message?: unknown };

    // O JSON completo é o que interessa: preserva campos que só aquele SDK
    // conhece (statusCode no Resend, code no Postgres) e que são justamente o
    // que diz se a falha é de credencial, de domínio ou de destinatário.
    let serializado: string | undefined;
    try {
      const json = JSON.stringify(error);
      // `{}` acontece quando as propriedades não são enumeráveis. Nesse caso o
      // JSON não acrescenta nada e os campos reconhecíveis dizem mais.
      if (json && json !== "{}") serializado = json;
    } catch {
      // Referência circular. Cai no formato reduzido abaixo.
    }

    if (serializado) return { message: serializado };

    if (objeto.message !== undefined) {
      const nome = objeto.name === undefined ? "Error" : String(objeto.name);
      return { message: `${nome}: ${String(objeto.message)}` };
    }
  }

  return { message: String(error) };
}

export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const { message, stack } = describeError(error);
  const payload = {
    level: "error" as const,
    scope,
    message,
    stack,
    context,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}
