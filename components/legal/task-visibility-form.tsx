import { PendingButton } from "@/components/ui/PendingButton";
import { updateMyTaskVisibility } from "@/app/(dashboard)/painel/equipe/actions";
import { TASK_VISIBILITY_OPTIONS, type TaskVisibilityMode } from "@/lib/law/task-visibility";

export function TaskVisibilityForm({
  currentMode,
  locked,
}: {
  currentMode: TaskVisibilityMode;
  locked: boolean;
}) {
  return (
    <form action={updateMyTaskVisibility} className="grid gap-3">
      {locked ? (
        <p
          role="status"
          className="rounded-[var(--radius-inner)] border border-od-border bg-white/[0.03] px-4 py-3 text-xs leading-5 text-od-text-2"
        >
          Essa opção foi escolhida pela organização. Só o dono ou sócio pode alterar em Equipe.
        </p>
      ) : (
        <p className="text-xs leading-5 text-od-text-3">
          Vale para as suas tarefas e lembretes, e também para o que você vê da equipe. A fila de outra pessoa só aparece se a
          dela não estiver privada.
        </p>
      )}
      <fieldset disabled={locked} className="grid gap-3">
        <legend className="sr-only">Visibilidade de tarefas e lembretes</legend>
        {TASK_VISIBILITY_OPTIONS.map((option, index) => {
          const selected = currentMode === option.value;
          return (
            <label
              key={option.value}
              className={
                "flex min-h-11 items-start gap-3 rounded-[var(--radius-inner)] border px-4 py-3 " +
                (selected ? "border-od-accent/40 bg-od-accent/5" : "border-od-border") +
                (locked ? " cursor-not-allowed opacity-75" : "")
              }
            >
              <input type="radio" name="task_visibility" value={option.value} defaultChecked={selected} className="mt-1" />
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {index + 1}. {option.label}
                  </span>
                  {locked && selected ? (
                    <span className="rounded-full border border-od-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-od-text-3">
                      Escolhida pela organização
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs leading-5 text-od-text-3">{option.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {locked ? null : (
        <div className="flex justify-end">
          <PendingButton className="btn-soft" pendingLabel="Salvando">
            Salvar
          </PendingButton>
        </div>
      )}
    </form>
  );
}
