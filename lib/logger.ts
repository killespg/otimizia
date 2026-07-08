// Logger mínimo e sem dependências externas: emite uma linha JSON por erro
// para stdout/stderr. Isso já é o suficiente para qualquer log drain
// (Vercel Logs, Datadog, Logtail...) indexar por "scope" e alertar — trocar
// por um provedor específico (Sentry etc) depois é só mudar esta função.
export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const payload = {
    level: "error" as const,
    scope,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}
