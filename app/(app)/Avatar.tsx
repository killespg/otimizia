/* Avatar de iniciais — quadrado (editorial), mono, fio nítido. */

export function Avatar({
  name,
  className = "h-10 w-10 text-[13px]",
}: {
  name: string;
  className?: string;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <span
      aria-hidden="true"
      className={
        "grid shrink-0 place-items-center rounded-sm border border-line bg-surface-2 font-mono font-semibold uppercase text-ink-soft " +
        className
      }
    >
      {initials}
    </span>
  );
}
