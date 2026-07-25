export function Avatar({
  name,
  className = "h-10 w-10 text-[13px]",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "Cliente";
  const initials =
    safeName
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <span
      aria-hidden="true"
      className={
        "grid shrink-0 place-items-center rounded-full bg-brand-700 font-mono font-black uppercase text-white " +
        className
      }
    >
      {initials}
    </span>
  );
}
