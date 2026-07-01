export default function AuthLoading() {
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_43%,#0bbfe8_100%)] p-2 sm:p-5 md:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-1rem)] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_32px_90px_-42px_rgba(7,8,28,0.85)] md:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden animate-pulse bg-[#f8fbff] p-8 lg:block">
          <div className="h-10 w-48 rounded-md bg-line" />
          <div className="mt-16 h-16 w-80 rounded-md bg-line" />
          <div className="mt-5 h-5 w-96 max-w-full rounded-md bg-line" />
          <div className="mt-12 space-y-3">
            <div className="h-20 rounded-lg bg-white" />
            <div className="h-20 rounded-lg bg-white" />
            <div className="h-20 rounded-lg bg-white" />
          </div>
        </div>
        <div className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px] animate-pulse">
            <div className="mx-auto mb-8 h-10 w-48 rounded-md bg-line lg:hidden" />
            <div className="panel overflow-hidden">
              <div className="border-b border-line px-6 py-6 sm:px-8">
                <div className="h-8 w-36 rounded-md bg-line" />
                <div className="mt-3 h-4 w-56 rounded-md bg-line" />
              </div>
              <div className="space-y-4 px-6 py-6 sm:px-8">
                <div className="h-11 rounded-md bg-surface-2" />
                <div className="h-11 rounded-md bg-surface-2" />
                <div className="h-12 rounded-lg bg-brand-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
