"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function WorkspaceSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-od-accent px-4 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:shadow-focus disabled:opacity-70 sm:w-auto"
    >
      {pending ? (
        <LoaderCircle
          size={16}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <ArrowRight size={16} aria-hidden="true" />
      )}
      {pending ? "Ativando…" : label}
    </button>
  );
}
