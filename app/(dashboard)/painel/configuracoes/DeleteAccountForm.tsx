"use client";

import { useState } from "react";
import { PendingButton } from "@/components/PendingButton";
import { IconTrash } from "../icons";

export function DeleteAccountForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [value, setValue] = useState("");
  const confirmed = value.trim().toUpperCase() === "EXCLUIR";

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="delete-current-password">
          Senha atual
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> obrigatorio</span>
        </label>
        <input
          id="delete-current-password"
          name="current_password"
          type="password"
          required
          minLength={6}
          maxLength={200}
          autoComplete="current-password"
          className="field mt-1.5"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmation">
          Digite <strong>EXCLUIR</strong> para confirmar
        </label>
        <input
          id="confirmation"
          name="confirmation"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          className="field mt-1.5"
        />
      </div>
      <PendingButton
        disabled={!confirmed}
        className="press inline-flex items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3.5 py-2 text-sm font-black text-danger-700 hover:bg-danger-50 disabled:cursor-not-allowed disabled:opacity-50"
        pendingLabel="Excluindo"
      >
        <IconTrash className="h-4 w-4" />
        Excluir conta permanentemente
      </PendingButton>
    </form>
  );
}
