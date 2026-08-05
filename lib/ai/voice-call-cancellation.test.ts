import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrato de cancelamento da chamada de voz.
 *
 * O bug que originou estes testes: fechar a janela do Tim enquanto o
 * `getUserMedia` ainda estava pendente deixava o microfone ligado. O
 * `stopVoice` rodava antes de existir stream para parar, e o stream chegava
 * depois, sem ninguém para desligá-lo.
 *
 * São testes de código-fonte porque o projeto não tem harness para exercitar
 * hooks React (sem jsdom nem testing-library). Eles não substituem um teste de
 * comportamento — o que eles garantem é que as guardas não sumam num refactor,
 * que é exatamente como esse vazamento nasceu.
 */
const source = readFileSync(
  resolve(process.cwd(), "lib/ai/hooks/useVoiceCall.ts"),
  "utf8",
);

/** Corpo do `startVoice`, do começo até o `catch`. */
function startVoiceBody() {
  const start = source.indexOf("async function startVoice()");
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("} catch (error) {", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("cancelamento da chamada de voz", () => {
  it("stopVoice invalida qualquer tentativa em voo", () => {
    const stopStart = source.indexOf("const stopVoice = useCallback(");
    const stopEnd = source.indexOf("async function startVoice()", stopStart);
    const stopBody = source.slice(stopStart, stopEnd);

    expect(stopBody).toMatch(/runIdRef\.current\s*\+=\s*1/);
  });

  it("stopVoice para as tracks do microfone", () => {
    expect(source).toMatch(/streamRef\.current\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  });

  it("startVoice marca sua tentativa antes de qualquer await", () => {
    const body = startVoiceBody();
    const marca = body.indexOf("runIdRef.current = runId");
    const primeiroAwait = body.indexOf("await ");

    expect(marca).toBeGreaterThan(-1);
    expect(primeiroAwait).toBeGreaterThan(-1);
    expect(marca).toBeLessThan(primeiroAwait);
  });

  it("desiste depois do getUserMedia sem guardar o stream, e desliga o que pegou", () => {
    // A ordem é o que importa: a guarda precisa vir ANTES de
    // `streamRef.current = stream`, senão o stream de uma tentativa cancelada
    // passa a valer como o stream vigente.
    const body = startVoiceBody();
    const getUserMedia = body.indexOf("await navigator.mediaDevices.getUserMedia");
    const guarda = body.indexOf("if (cancelled())", getUserMedia);
    const guardaStop = body.indexOf("stream.getTracks().forEach((track) => track.stop())", guarda);
    const guardaFim = body.indexOf("return;", guarda);
    const gravaStream = body.indexOf("streamRef.current = stream", getUserMedia);

    expect(getUserMedia).toBeGreaterThan(-1);
    expect(guarda).toBeGreaterThan(getUserMedia);
    expect(guardaStop).toBeGreaterThan(guarda);
    expect(guardaStop).toBeLessThan(guardaFim);
    expect(guardaFim).toBeLessThan(gravaStream);
  });

  it("desiste depois do token sem sobrescrever a sessão vigente", () => {
    const body = startVoiceBody();
    const token = body.indexOf('await fetch("/api/realtime/token"');
    const guarda = body.indexOf("if (cancelled())", token);
    const gravaSessao = body.indexOf("sessionIdRef.current = sessionId", token);

    expect(guarda).toBeGreaterThan(token);
    expect(guarda).toBeLessThan(gravaSessao);
  });

  it("não sobe para live nem liga o heartbeat depois de cancelada", () => {
    // Sem esta guarda a chamada cancelada ainda ligava o cronômetro e o
    // heartbeat, que seguiria pulsando — e cobrando — uma sessão encerrada.
    const body = startVoiceBody();
    const sdp = body.indexOf("await peer.setRemoteDescription");
    const guarda = body.indexOf("if (cancelled())", sdp);
    const live = body.indexOf('setVoiceStatus("live")', sdp);
    const heartbeat = body.indexOf("HEARTBEAT_INTERVAL_MS", sdp);

    expect(guarda).toBeGreaterThan(sdp);
    expect(guarda).toBeLessThan(live);
    expect(live).toBeLessThan(heartbeat);
  });

  it("encerra a chamada quando o componente desmonta", () => {
    expect(source).toMatch(/useEffect\(\(\) => \(\) => stopVoice\(\), \[stopVoice\]\)/);
  });
});
