export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      Otimiz<span className="text-brand-600 dark:text-brand-300">IA</span>
    </span>
  );
}
