"use client";

import { useState } from "react";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/hooks/usePdfAttachment";
import { useVoiceCall } from "@/lib/ai/hooks/useVoiceCall";
import type { PendingImage } from "@/components/tim/ChatImageAttach";
import { VoicePanel } from "@/components/tim/VoicePanel";
import { TimHeader } from "@/components/tim/TimHeader";
import { TimHistoryPanel } from "@/components/tim/TimHistoryPanel";
import { TimConversation } from "@/components/tim/TimConversation";
import { TimComposer } from "@/components/tim/TimComposer";
import { TimContextPanel } from "@/components/tim/TimContextPanel";
import { useLockedHeight } from "@/components/tim/useLockedHeight";
import type { Organization } from "@/lib/supabase/types";

export function AssistantPageClient({
  firstName,
  org,
  isAdmin,
}: {
  firstName?: string;
  org: Organization | null;
  isAdmin: boolean;
}) {
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { messages, status, sending, send, newChat } = useAssistantChat();
  const attachment = usePdfAttachment();
  const voice = useVoiceCall();
  const { ref: shellRef, height } = useLockedHeight<HTMLDivElement>();

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
      className="assistant-page-shell -mx-5 -mt-4 -mb-6 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-od-surface md:-mx-8 md:-mt-8 md:-mb-8"
    >
      <h1 className="sr-only">Tim, seu assistente de negócios</h1>
      <TimHeader
        status={status}
        onHistory={() => setHistoryOpen(true)}
        onNewChat={newChat}
        onPersonalize={() => setPersonalizeOpen(true)}
      />

      {/* O chat ocupa a largura inteira da moldura — sem coluna lateral. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <TimConversation
          className="px-4 py-4 sm:px-8 lg:px-16"
          messages={messages}
          status={status}
          firstName={firstName}
          onSuggestion={submit}
          onPersonalize={() => setPersonalizeOpen(true)}
        />

        <VoicePanel {...voice} />

        <div className="shrink-0 border-t border-od-border bg-white/[0.03] px-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
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

      <TimContextPanel open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} org={org} isAdmin={isAdmin} />
      <TimHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
