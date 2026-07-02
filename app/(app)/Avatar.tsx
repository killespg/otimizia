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
        "grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#7b3ff2,#4b16c8)] font-mono font-black uppercase text-white shadow-[0_12px_28px_-18px_rgba(92,34,232,0.8)] " +
        className
      }
    >
      {initials}
    </span>
  );
}
