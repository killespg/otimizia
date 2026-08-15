"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { parseCsv } from "@/lib/utils/csv";
import { importContacts, type ImportContactRow } from "../../actions";

const TARGET_FIELDS: { key: keyof ImportContactRow | "ignore"; label: string }[] = [
  { key: "name", label: "Nome (obrigatório)" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "company", label: "Empresa" },
  { key: "source", label: "Origem" },
  { key: "notes", label: "Observações" },
  { key: "ignore", label: "Não importar" },
];

function guessMapping(header: string): keyof ImportContactRow | "ignore" {
  const h = header.trim().toLowerCase();
  if (/nome|name/.test(h)) return "name";
  if (/telefone|celular|whats|phone|fone/.test(h)) return "phone";
  if (/e-?mail/.test(h)) return "email";
  if (/empresa|company|organiza/.test(h)) return "company";
  if (/origem|source|fonte/.test(h)) return "source";
  if (/obs|nota|note/.test(h)) return "notes";
  return "ignore";
}

export function ContactsCsvImporter() {
  const router = useRouter();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<number, keyof ImportContactRow | "ignore">>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const header = rows?.[0] ?? [];
  const dataRows = useMemo(() => rows?.slice(1) ?? [], [rows]);
  const hasNameMapped = Object.values(mapping).includes("name");

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
    const columnByField = new Map<keyof ImportContactRow, number>();
    for (const [indexStr, field] of Object.entries(mapping)) {
      if (field !== "ignore") columnByField.set(field, Number(indexStr));
    }
    const nameCol = columnByField.get("name");
    if (nameCol === undefined) {
      setError('Mapeie ao menos a coluna "Nome" antes de importar.');
      return;
    }

    const parsedRows: ImportContactRow[] = dataRows
      .map((row) => ({
        name: row[nameCol]?.trim() ?? "",
        phone: columnByField.has("phone") ? row[columnByField.get("phone")!] : undefined,
        email: columnByField.has("email") ? row[columnByField.get("email")!] : undefined,
        company: columnByField.has("company") ? row[columnByField.get("company")!] : undefined,
        source: columnByField.has("source") ? row[columnByField.get("source")!] : undefined,
        notes: columnByField.has("notes") ? row[columnByField.get("notes")!] : undefined,
      }))
      .filter((row) => row.name.length > 0);

    startTransition(async () => {
      try {
        const outcome = await importContacts(parsedRows);
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
        <label className="label" htmlFor="csv-file">
          Arquivo CSV
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="field mt-1.5"
        />
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          Primeira linha deve ser o cabeçalho. Até 500 contatos por importação.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-bold text-danger-700">
          {error}
        </p>
      )}

      {result && (
        <p className="rounded-md border border-success-200 bg-success-50 px-3 py-2 text-sm font-bold text-success-700">
          {result.imported} {result.imported === 1 ? "contato importado" : "contatos importados"}
          {result.skipped > 0 ? ` · ${result.skipped} sem nome, ignorados` : ""}.
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
            <table className="w-full min-w-[480px] border-collapse text-sm">
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
                            [i]: event.target.value as keyof ImportContactRow | "ignore",
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
            disabled={!hasNameMapped || isPending}
            className="btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Importando…" : `Importar ${dataRows.length} contatos`}
          </button>
        </div>
      )}
    </div>
  );
}
