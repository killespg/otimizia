export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Carregando">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="h-4 w-24 rounded-md bg-line" />
          <div className="mt-3 h-10 w-72 max-w-full rounded-md bg-line" />
          <div className="mt-3 h-4 w-96 max-w-full rounded-md bg-line" />
        </div>
        <div className="h-11 w-full rounded-lg bg-white lg:w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <div className="panel h-36 bg-white" />
        <div className="panel h-36 bg-white" />
        <div className="panel h-36 bg-white" />
        <div className="panel hidden h-36 bg-white xl:block" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(23rem,0.72fr)]">
        <div className="panel h-[380px] bg-white" />
        <div className="panel h-[380px] bg-white" />
      </div>
    </div>
  );
}
