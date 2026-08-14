const POSTGRES_INTEGER_MAX = 2_147_483_647;
const PT_BR_MONEY = /^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/;

export type LegalAcquisitionCostInput = {
  month: string;
  marketingCents: number;
  commercialCents: number;
  notes: string | null;
};

export type LegalAcquisitionCostFormValues = {
  month: string;
  marketing: string;
  commercial: string;
  notes: string;
};

export type LegalAcquisitionCostActionState = {
  status: "idle" | "success" | "error";
  message: string;
  revision: number;
  values: LegalAcquisitionCostFormValues;
};

export const initialLegalAcquisitionCostState: LegalAcquisitionCostActionState = {
  status: "idle",
  message: "",
  revision: 0,
  values: {
    month: "",
    marketing: "",
    commercial: "",
    notes: "",
  },
};

function parseMonth(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Informe o mês.");
  }

  const month = value.trim();
  const match = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error("Informe um mês válido.");
  return `${month}-01`;
}

function parseMoney(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== "string") {
    throw new Error(`Informe um valor válido para ${label}.`);
  }

  const raw = value.trim();
  if (!PT_BR_MONEY.test(raw)) {
    throw new Error(`Informe um valor válido para ${label}.`);
  }

  const [integerPart, decimalPart = ""] = raw.split(",");
  const cents = Number(integerPart.replaceAll(".", "")) * 100
    + Number(decimalPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > POSTGRES_INTEGER_MAX) {
    throw new Error(`Informe um valor válido para ${label}.`);
  }
  return cents;
}

function parseNotes(value: FormDataEntryValue | null) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("As observações são inválidas.");
  }

  const notes = value.trim();
  if (notes.length > 500) {
    throw new Error("As observações podem ter no máximo 500 caracteres.");
  }
  return notes || null;
}

export function parseLegalAcquisitionCost(
  formData: FormData,
): LegalAcquisitionCostInput {
  return {
    month: parseMonth(formData.get("month")),
    marketingCents: parseMoney(formData.get("marketing"), "Marketing"),
    commercialCents: parseMoney(
      formData.get("commercial"),
      "Operação comercial",
    ),
    notes: parseNotes(formData.get("notes")),
  };
}
