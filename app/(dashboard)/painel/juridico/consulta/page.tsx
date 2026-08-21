import { redirect } from "next/navigation";

/** A consulta DataJud passou a viver na aba Processos. */
export default function DatajudSearchPage() {
  redirect("/juridico/processos");
}
