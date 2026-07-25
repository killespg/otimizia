"use client";

import { useState } from "react";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/usePdfAttachment";
import { useVoiceCall } from "@/lib/ai/useVoiceCall";
import type { PendingImage } from "@/components/ChatImageAttach";
import { VoicePanel } from "@/components/VoicePanel";
import { TimHeader } from "@/components/tim/TimHeader";
import { TimConversation } from "@/components/tim/TimConversation";
import { TimComposer } from "@/components/tim/TimComposer";
import { TimContextPanel } from "@/components/tim/TimContextPanel";
import { TimTodayPanel } from "@/components/tim/TimTodayPanel";
import { useLockedHeight } from "@/components/tim/useLockedHeight";
import type { Organization } from "@/lib/supabase/types";

type TaskRow = { id: string; title: string; due_at: string | null; done: boolean };

export function AssistantPageClient({
  firstName,
  org,
  isAdmin,
  summary,
  overdueTasks,
  todayTasks,
}: {
  firstName?: string;
  org: Organization | null;
  isAdmin: boolean;
  summary: { total_contatos: number; ganho_no_mes_centavos: number; lembretes_atrasados: number } | null;
  overdueTasks: TaskRow[];
  todayTasks: TaskRow[];
}) {
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const { messages, status, sending, send } = useAssistantChat();
  const attachment = usePdfAttachment();
  const voice = useVoiceCall();
  const { ref: shellRef, height } = useLockedHeight<HTMLDivElement>();

  // O painel "Hoje" só aparece quando tem o que mostrar. Sem tarefas
  // atrasadas, sem prazo pra hoje e sem números, ele viraria uma coluna
  // vazia à direita — melhor sumir e deixar o chat ocupar tudo.
  const hasTodayContent =
    overdueTasks.length > 0 ||
    todayTasks.length > 0 ||
    (summary != null && (summary.total_contatos > 0 || summary.ganho_no_mes_centavos > 0));

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
    <div
      ref={shellRef}
      style={{ height: height ?? undefined }}
      className="assistant-page-shell -mx-4 -mt-4 -mb-6 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#1e1d22] md:-mx-8 md:-mt-8 md:-mb-8"
    >
      <TimHeader status={status} onPersonalize={() => setPersonalizeOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {/* A coluna do chat preenche toda a largura até o painel lateral. As
            bolhas encostam nas bordas (Tim à esquerda, usuário à direita) com
            um teto em px — enche a moldura como um app de chat de verdade em
            vez de flutuar uma coluna estreita no meio do vazio. */}
        <div className="flex w-full min-h-0 flex-1 flex-col">
          <TimConversation
            className="px-4 py-4 sm:px-8 lg:px-16"
            messages={messages}
            status={status}
            firstName={firstName}
            onSuggestion={submit}
            onPersonalize={() => setPersonalizeOpen(true)}
          />

          <VoicePanel {...voice} />

          <div className="shrink-0 bg-white/[0.03] px-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
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
        </div>

        {hasTodayContent ? (
          <TimTodayPanel summary={summary} overdueTasks={overdueTasks} todayTasks={todayTasks} />
        ) : null}
      </div>

      <TimContextPanel open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} org={org} isAdmin={isAdmin} />
    </div>
  );
}
