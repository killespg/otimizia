"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { parseCsv } from "@/lib/utils/csv";
import { importReceivablesCsv, type ImportReceivableRow } from "../../juridico/actions";

const TARGET_FIELDS: { key: keyof ImportReceivableRow | "ignore"; label: string }[] = [
  { key: "description", label: "Descrição (obrigatório)" },
  { key: "contactName", label: "Cliente" },
  { key: "amount", label: "Valor total (obrigatório)" },
  { key: "dueDate", label: "Vencimento (obrigatório)" },
  { key: "paidAmount", label: "Valor já pago" },
  { key: "category", label: "Categoria" },
  { key: "notes", label: "Observações" },
  { key: "ignore", label: "Não importar" },
];

function guessMapping(header: string): keyof ImportReceivableRow | "ignore" {
  const h = header.trim().toLowerCase();
  if (/pago|recebido|baixad/.test(h)) return "paidAmount";
  if (/descri|servi[cç]o|honor/.test(h)) return "description";
  if (/cliente|contato|nome/.test(h)) return "contactName";
  if (/categoria/.test(h)) return "category";
  if (/valor|total|pre[cç]o/.test(h)) return "amount";
  if (/vencimento|data/.test(h)) return "dueDate";
  if (/obs|nota/.test(h)) return "notes";
  return "ignore";
}

export function FinanceCsvImporter() {
  const router = useRouter();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<number, keyof ImportReceivableRow | "ignore">>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const header = rows?.[0] ?? [];
  const dataRows = useMemo(() => rows?.slice(1) ?? [], [rows]);
  const hasRequiredMapped =
    Object.values(mapping).includes("description") &&
    Object.values(mapping).includes("amount") &&
    Object.values(mapping).includes("dueDate");

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo maior que 5 MB — divida em partes menores.");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("Não achei linhas de dados nesse arquivo (só o cabeçalho, ou vazio).");
      return;
    }
    setRows(parsed);
    setMapping(Object.fromEntries(parsed[0].map((h, i) => [i, guessMapping(h)])));
  }

  function confirmImport() {
    if (!rows) return;
    setError(null);
    const columnByField = new Map<keyof ImportReceivableRow, number>();
    for (const [indexStr, field] of Object.entries(mapping)) {
      if (field !== "ignore") columnByField.set(field, Number(indexStr));
    }
    const descCol = columnByField.get("description");
    const amountCol = columnByField.get("amount");
    const dueDateCol = columnByField.get("dueDate");
    if (descCol === undefined || amountCol === undefined || dueDateCol === undefined) {
      setError('Mapeie "Descrição", "Valor total" e "Vencimento" antes de importar.');
      return;
    }

    const parsedRows: ImportReceivableRow[] = dataRows.map((row) => ({
      description: row[descCol]?.trim() ?? "",
      amount: row[amountCol],
      dueDate: row[dueDateCol],
      contactName: columnByField.has("contactName") ? row[columnByField.get("contactName")!] : undefined,
      category: columnByField.has("category") ? row[columnByField.get("category")!] : undefined,
      paidAmount: columnByField.has("paidAmount") ? row[columnByField.get("paidAmount")!] : undefined,
      notes: columnByField.has("notes") ? row[columnByField.get("notes")!] : undefined,
    }));

    startTransition(async () => {
      try {
        const outcome = await importReceivablesCsv(parsedRows);
        setResult(outcome);
        router.refresh();
      } catch {
        setError("Não deu para importar agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <div className="panel space-y-4 p-5 sm:p-6">
      <div>
        <label className="label" htmlFor="finance-csv-file">
          Arquivo CSV
        </label>
        <input
          id="finance-csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="field mt-1.5"
        />
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          Primeira linha deve ser o cabeçalho. Até 500 contas por importação. Datas em dd/mm/aaaa
          ou aaaa-mm-dd.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-bold text-danger-700">
          {error}
        </p>
      )}

      {result && (
        <p className="rounded-md border border-success-200 bg-success-50 px-3 py-2 text-sm font-bold text-success-700">
          {result.imported} {result.imported === 1 ? "conta importada" : "contas importadas"}
          {result.skipped > 0 ? ` · ${result.skipped} com dado obrigatório inválido, ignoradas` : ""}.
        </p>
      )}

      {rows && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-black text-ink">Mapeie as colunas</p>
            <p className="text-xs font-medium text-ink-muted">
              {dataRows.length} {dataRows.length === 1 ? "linha encontrada" : "linhas encontradas"}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {header.map((h, i) => (
                    <th key={i} className="border-b border-line px-2 py-2 text-left">
                      <p className="truncate text-xs font-bold text-ink-muted">{h}</p>
                      <select
                        value={mapping[i] ?? "ignore"}
                        onChange={(event) =>
                          setMapping((prev) => ({
                            ...prev,
                            [i]: event.target.value as keyof ImportReceivableRow | "ignore",
                          }))
                        }
                        className="field mt-1 !py-1 text-xs"
                      >
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {header.map((_, ci) => (
                      <td key={ci} className="truncate border-b border-line px-2 py-1.5 text-xs text-ink-soft">
                        {row[ci]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={confirmImport}
            disabled={!hasRequiredMapped || isPending}
            className="btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Importando…" : `Importar ${dataRows.length} contas`}
          </button>
        </div>
      )}
    </div>
  );
}
