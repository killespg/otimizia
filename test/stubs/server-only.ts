// Substituto de `server-only` nos testes. O pacote real não exporta nada: ele
// existe para o build do Next falhar quando um módulo de servidor é importado
// por um componente de cliente. Sob vitest, em node, essa proteção não se
// aplica e o import precisa apenas resolver.
export {};
