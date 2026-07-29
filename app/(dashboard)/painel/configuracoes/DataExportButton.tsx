"use client";

export function DataExportButton() {
  return (
    <a href="/api/account/export" download="meus-dados-otimizia.json" className="btn-soft inline-flex w-fit items-center gap-1.5">
      Baixar meus dados (JSON)
    </a>
  );
}
