"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconAlert, IconMessage } from "../icons";

type Status = "nao_conectado" | "pendente" | "conectado" | "desconectado";

export function ConnectWhatsappPanel({
  currentStatus,
  isAdmin,
  flat = false,
}: {
  currentStatus: Status;
  isAdmin: boolean;
  flat?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(currentStatus);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/whatsapp/status");
        const data = await response.json();
        if (data.status === "conectado") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("conectado");
          // Melhor esforço: importa o histórico que o número já tinha antes
          // de conectar. Se falhar, o usuário ainda pode disparar de novo
          // pelo botão "Importar histórico" dentro do inbox.
          fetch("/api/whatsapp/import-history", { method: "POST" }).catch(() => {});
          router.refresh();
        }
      } catch {
        // silencioso — próximo tick tenta de novo
      }
    }, 3000);
  }

  async function connect() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não consegui iniciar a conexão.");
        return;
      }
      setQrcode(data.qrcode);
      setStatus("pendente");
      startPolling();
    } catch {
      setError("Não consegui iniciar a conexão. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className={flat ? "flex flex-col items-center gap-3 border-y border-white/[0.08] py-8 text-center" : "panel enter flex flex-col items-center gap-3 p-10 text-center"}>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
          <IconAlert className="h-7 w-7" />
        </span>
        <p className="text-base font-black text-ink">O WhatsApp ainda não foi conectado</p>
        <p className="max-w-sm text-sm font-medium text-ink-muted">
          Peça a um administrador da organização para conectar o número de WhatsApp em Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className={flat ? "flex flex-col items-center gap-4 border-y border-white/[0.08] py-8 text-center" : "flex flex-col items-center gap-4 border border-white/[0.09] bg-[#1e1d22] p-10 text-center"}>
      <span className="grid size-12 place-items-center rounded-md bg-violet-400/10 text-violet-300">
        <IconMessage className="h-6 w-6" />
      </span>
      <div>
        <p className="text-[15px] font-semibold text-white">Conectar WhatsApp</p>
        <p className="mt-1 max-w-sm text-[11px] leading-5 text-white/45">
          Escaneie o QR Code com o WhatsApp do número que vai atender seus clientes. As mensagens
          passam a aparecer aqui e a IA pode responder automaticamente.
        </p>
      </div>

      {qrcode ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrcode}
            alt="QR Code do WhatsApp"
            className="h-64 w-64 rounded-lg border border-line bg-white p-2"
          />
          <p className="flex items-center gap-2 text-xs font-bold text-ink-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
            Aguardando você escanear...
          </p>
        </div>
      ) : (
        <button type="button" onClick={connect} disabled={loading} className="btn">
          {loading ? "Gerando QR Code..." : "Conectar WhatsApp"}
        </button>
      )}

      {error && <p className="max-w-sm text-sm font-semibold text-danger-700">{error}</p>}
      {status === "desconectado" && !qrcode && (
        <p className="text-xs font-semibold text-danger-700">
          A conexão anterior caiu. Conecte novamente para voltar a receber mensagens.
        </p>
      )}
    </div>
  );
}
