"use client";

import { useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceSpeaker = "user" | "assistant" | null;
export type VoiceLine = { role: "user" | "assistant"; text: string };

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

// Hook compartilhado pela chamada de voz em tempo real (widget flutuante e
// o painel embutido no dashboard) para não duplicar a lógica de WebRTC.
export function useVoiceCall() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSpeaker, setVoiceSpeaker] = useState<VoiceSpeaker>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [captions, setCaptions] = useState<VoiceLine[]>([]);
  const [partialCaption, setPartialCaption] = useState<VoiceLine | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const assistantTextRef = useRef("");

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

  return {
    voiceStatus,
    voiceError,
    voiceSpeaker,
    voiceLevel,
    captions,
    partialCaption,
    callSeconds,
    startVoice,
    stopVoice,
  };
}
