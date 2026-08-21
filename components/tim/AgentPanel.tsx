"use client";

import { useState } from "react";
import Link from "next/link";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/hooks/usePdfAttachment";
import { useVoiceCall } from "@/lib/ai/hooks/useVoiceCall";
import { IconArrowRight, IconPlus } from "@/app/(dashboard)/painel/icons";
import type { PendingImage } from "./ChatImageAttach";
import { VoicePanel } from "./VoicePanel";
import { TimAvatar } from "@/components/tim/TimAvatar";
import { TimConversation } from "@/components/tim/TimConversation";
import { TimComposer } from "@/components/tim/TimComposer";

const COMPACT_SUGGESTIONS = [
  "Resumir minhas atividades de hoje",
  "Quais clientes estão mais engajados?",
  "Sugerir meus próximos passos",
];

// Painel do Tim embutido dentro de outras telas (widget do dashboard) — é um
// bloco independente e arrastável de propósito, então mantém card próprio,
// diferente das faixas abertas do resto do painel.
export function AgentPanel({ userName }: { userName?: string }) {
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const { messages, status, sending, send, newChat } = useAssistantChat();
  const attachment = usePdfAttachment();
  const voice = useVoiceCall();
  const firstName = userName?.trim().split(/\s+/)[0];

  function submit(text: string) {
    if (!text.trim() && !attachment.file && !pendingImage) return;
    setInput("");
    const image = pendingImage;
    setPendingImage(null);
    const file = attachment.file;
    attachment.clear();
    void send(text, image ?? undefined, file);
  }

  return (
    <section id="agente" className="enter flex h-[min(560px,70vh)] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-od-border bg-od-surface">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TimAvatar size={30} online />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-white">Tim</p>
            <p className="truncate text-xs leading-tight text-od-text-3">{status || "Seu parceiro de negócios"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={newChat}
            aria-label="Começar um novo chat com o Tim"
            title="Novo chat"
            className="grid size-11 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-od-text"
          >
            <IconPlus className="h-3.5 w-3.5" />
          </button>
          <Link
            href="/assistente"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-od-text-2 hover:text-od-text"
          >
            Tela cheia
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <TimConversation
        className="px-3 py-3"
        messages={messages}
        status={status}
        firstName={firstName}
        suggestions={COMPACT_SUGGESTIONS}
        onSuggestion={submit}
      />

      <VoicePanel {...voice} />

      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
        <TimComposer
          value={input}
          onChange={setInput}
          onSubmit={() => submit(input)}
          sending={sending}
          pendingImage={pendingImage}
          onPendingImageChange={setPendingImage}
          pdfAttachment={attachment}
          voiceStatus={voice.voiceStatus}
          onStartVoice={voice.startVoice}
        />
      </div>
    </section>
  );
}
