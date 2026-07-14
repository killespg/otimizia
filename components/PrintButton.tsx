"use client";

export function PrintButton({ label = "Imprimir / Salvar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-soft print-hide">
      {label}
    </button>
  );
}
