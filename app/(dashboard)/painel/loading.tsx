export default function LoadingPainel() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando módulo">
      <div className="skeleton h-8 w-56 rounded-md" />
      <div className="grid gap-px border-y border-white/[0.08] sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="px-5 py-6"><div className="skeleton h-7 w-20 rounded-md" /><div className="skeleton mt-3 h-3 w-28 rounded-md" /></div>)}
      </div>
      <div className="skeleton h-64 w-full rounded-lg" />
    </div>
  );
}
