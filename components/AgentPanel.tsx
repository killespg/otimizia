"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { IconArrowRight, IconBot, IconMic } from "@/app/(app)/icons";
import { useAssistantChat } from "@/lib/ai/useAssistantChat";

const PROMPTS = [
  {
    title: "Resumir atividades de hoje",
    desc: "Veja um resumo do seu dia",
  },
  {
    title: "Quais leads estão mais engajados?",
    desc: "Análise de engajamento",
  },
  {
    title: "Sugerir próximos passos",
    desc: "O que fazer agora?",
  },
];

type VoiceSpeaker = "user" | "assistant" | null;
type VoiceLine = { role: "user" | "assistant"; text: string };

function readLevel(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const centered = (data[i] - 128) / 128;
    sumSquares += centered * centered;
  }
  const rms = Math.sqrt(sumSquares / data.length);
  return Math.min(1, rms * 4);
}

function formatCallTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AgentPanel() {
  const [input, setInput] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "connecting" | "live" | "error"
  >("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSpeaker, setVoiceSpeaker] = useState<VoiceSpeaker>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [captions, setCaptions] = useState<VoiceLine[]>([]);
  const [partialCaption, setPartialCaption] = useState<VoiceLine | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const { messages, status, sending, send } = useAssistantChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const assistantTextRef = useRef("");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    const el = captionsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [captions, partialCaption]);

  function submit(text: string) {
    setInput("");
    void send(text);
  }

  function startLevelLoop() {
    function tick() {
      const local = readLevel(localAnalyserRef.current);
      const remote = readLevel(remoteAnalyserRef.current);
      setVoiceLevel(Math.max(local, remote));
      levelFrameRef.current = requestAnimationFrame(tick);
    }
    levelFrameRef.current = requestAnimationFrame(tick);
  }

  function stopVoice() {
    peerRef.current?.close();
    peerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    if (callTimerRef.current !== null) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;
    assistantTextRef.current = "";

    setVoiceStatus("idle");
    setVoiceSpeaker(null);
    setVoiceLevel(0);
    setCaptions([]);
    setPartialCaption(null);
    setCallSeconds(0);
  }

  async function startVoice() {
    if (voiceStatus === "connecting" || voiceStatus === "live") return;
    setVoiceError(null);
    setVoiceStatus("connecting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador nao liberou captura de audio.");
      }

      const tokenResponse = await fetch("/api/realtime/token", {
        cache: "no-store",
      });
      const tokenData = await tokenResponse.json().catch(() => null);
      const ephemeralKey =
        tokenData?.value ?? tokenData?.client_secret?.value ?? tokenData?.client_secret;

      if (!tokenResponse.ok || !ephemeralKey) {
        throw new Error(tokenData?.error ?? "Nao consegui iniciar a chamada.");
      }

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audioRef.current = audio;

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream && audioRef.current) {
          audioRef.current.srcObject = stream;
          void audioRef.current.play().catch(() => undefined);
        }
        if (stream) {
          const remoteSource = audioCtx.createMediaStreamSource(stream);
          const remoteAnalyser = audioCtx.createAnalyser();
          remoteAnalyser.fftSize = 512;
          remoteSource.connect(remoteAnalyser);
          remoteAnalyserRef.current = remoteAnalyser;
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      for (const track of stream.getAudioTracks()) {
        peer.addTrack(track, stream);
      }

      const localSource = audioCtx.createMediaStreamSource(stream);
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 512;
      localSource.connect(localAnalyser);
      localAnalyserRef.current = localAnalyser;

      const dataChannel = peer.createDataChannel("oai-events");
      dataChannel.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          const type: string = data?.type ?? "";

          if (type === "error") {
            setVoiceError("A chamada teve um erro. Tente iniciar de novo.");
            setVoiceStatus("error");
            return;
          }

          if (type.includes("speech_started")) {
            setVoiceSpeaker("user");
            setPartialCaption({ role: "user", text: "" });
            return;
          }

          if (type.includes("input_audio_transcription") && (type.includes("completed") || type.includes("done"))) {
            const text: string = data?.transcript ?? "";
            setPartialCaption(null);
            if (text.trim()) {
              setCaptions((prev) => [...prev.slice(-5), { role: "user", text: text.trim() }]);
            }
            return;
          }

          if (type === "response.created") {
            setVoiceSpeaker("assistant");
            assistantTextRef.current = "";
            setPartialCaption({ role: "assistant", text: "" });
            return;
          }

          if (type.includes("audio_transcript") && type.includes("delta")) {
            assistantTextRef.current += data?.delta ?? "";
            setPartialCaption({ role: "assistant", text: assistantTextRef.current });
            return;
          }

          if (type.includes("audio_transcript") && type.includes("done")) {
            const text = (data?.transcript || assistantTextRef.current).trim();
            assistantTextRef.current = "";
            setPartialCaption(null);
            if (text) {
              setCaptions((prev) => [...prev.slice(-5), { role: "assistant", text }]);
            }
            return;
          }

          if (type.includes("output_audio_buffer") && type.includes("stopped")) {
            setVoiceSpeaker(null);
            return;
          }

          if (type === "response.done") {
            setVoiceSpeaker((current) => (current === "assistant" ? null : current));
          }
        } catch {
          // Eventos da Realtime API podem ser ignorados na UI por enquanto.
        }
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        throw new Error(answerSdp || "Nao consegui conectar a chamada.");
      }

      await peer.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      setVoiceStatus("live");
      startLevelLoop();
      callTimerRef.current = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } catch (error) {
      stopVoice();
      setVoiceStatus("error");
      setVoiceError(
        error instanceof Error
          ? error.message
          : "Nao consegui iniciar a chamada de voz."
      );
    }
  }

  useEffect(() => () => stopVoice(), []);

  return (
    <section
      id="agente"
      className="enter rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/otimizia-mark-dark.png"
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
          />
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Sócio-Assistente
          </h2>
        </div>
        <span className="rounded-md bg-success-50 px-2 py-1 text-xs font-black text-success-700">
          Online
        </span>
      </div>

      {messages.length === 0 ? (
        <>
          <p className="mt-4 text-sm font-medium leading-relaxed text-ink-soft">
            E aí! Bora ver como tá o negócio hoje?
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => submit(prompt.title)}
                className="nav-item rounded-lg border border-line bg-white p-3 text-left hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="flex items-center gap-2 text-[11px] font-black leading-tight text-brand-700">
                  <IconBot className="h-3.5 w-3.5 shrink-0" />
                  {prompt.title}
                </span>
                <span className="mt-1 block text-[11px] font-semibold leading-tight text-ink-muted">
                  {prompt.desc}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div
          ref={scrollRef}
          className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] px-3.5 py-2 text-sm text-white">
                  {message.content}
                </div>
              </div>
            ) : (
              (message.content || index !== messages.length - 1 || !status) && (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-sm text-ink">
                    {message.content}
                  </div>
                </div>
              )
            )
          )}

          {status && (
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
              {status}
            </div>
          )}
        </div>
      )}

      <div
        className={
          "voice-panel mt-4 rounded-lg border border-line bg-surface-2 p-3 " +
          (voiceStatus === "live" ? "is-live" : "")
        }
      >
        {voiceStatus === "live" ? (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className="flex w-full items-center justify-between">
              <span className="voice-live-badge inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-success-700">
                <span className="h-1.5 w-1.5 rounded-full bg-success-600" />
                Ao vivo · {formatCallTime(callSeconds)}
              </span>
              <button
                type="button"
                onClick={stopVoice}
                className="nav-item inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-danger-200 bg-danger-50 px-2.5 text-[11px] font-black text-danger-700 hover:bg-danger-100"
              >
                Encerrar
              </button>
            </div>

            <div
              className={
                "voice-orb " +
                (voiceSpeaker === "assistant"
                  ? "is-speaking"
                  : voiceSpeaker === "user"
                    ? "is-listening"
                    : "")
              }
              style={{ "--level": voiceLevel } as CSSProperties}
            >
              <IconBot className="h-6 w-6" />
            </div>

            <p className="text-[11px] font-black uppercase tracking-wide text-ink-muted">
              {voiceSpeaker === "assistant"
                ? "Sócio-Assistente falando"
                : voiceSpeaker === "user"
                  ? "Ouvindo você"
                  : "Pode falar quando quiser"}
            </p>

            {(captions.length > 0 || partialCaption) && (
              <div
                ref={captionsRef}
                className="voice-captions mt-1 max-h-24 w-full space-y-1.5 overflow-y-auto"
              >
                {captions.map((line, index) => (
                  <p
                    key={index}
                    className={
                      "text-xs font-medium leading-snug " +
                      (line.role === "user"
                        ? "text-right text-ink-muted"
                        : "text-left text-ink")
                    }
                  >
                    {line.text}
                  </p>
                ))}
                {partialCaption && partialCaption.text && (
                  <p
                    className={
                      "text-xs font-medium italic leading-snug opacity-70 " +
                      (partialCaption.role === "user"
                        ? "text-right text-ink-muted"
                        : "text-left text-ink")
                    }
                  >
                    {partialCaption.text}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full " +
                  (voiceStatus === "connecting"
                    ? "bg-brand-100 text-brand-700"
                    : voiceStatus === "error"
                      ? "bg-danger-50 text-danger-700"
                      : "bg-brand-50 text-brand-700")
                }
              >
                <IconMic
                  className={"h-4 w-4 " + (voiceStatus === "connecting" ? "animate-pulse" : "")}
                />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-ink">Voz em tempo real</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-ink-muted">
                  {voiceStatus === "connecting"
                    ? "Conectando microfone..."
                    : voiceError ?? "Converse por áudio com o Sócio-Assistente."}
                </p>
              </div>
            </div>
            {voiceStatus === "connecting" ? (
              <button
                type="button"
                onClick={stopVoice}
                className="nav-item inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 text-xs font-black text-danger-700 hover:bg-danger-100"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoice}
                className="nav-item inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-black text-white hover:bg-brand-800"
              >
                <IconMic className="h-4 w-4" />
                {voiceStatus === "error" ? "Tentar de novo" : "Falar"}
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pergunte algo..."
          maxLength={4000}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="nav-item grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-700 text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] transition-opacity hover:bg-brand-800 disabled:opacity-40"
          aria-label="Enviar pergunta"
        >
          <IconArrowRight className="h-5 w-5 -rotate-45" />
        </button>
      </form>
    </section>
  );
}
