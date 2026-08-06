"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "./notifications-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw).map((char) => char.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "off" | "on" | "busy";

export function PushNotificationToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) {
      const frame = window.requestAnimationFrame(() => setStatus("unsupported"));
      return () => window.cancelAnimationFrame(frame);
    }
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setStatus(sub ? "on" : "off");
      })
      .catch(() => {
        if (!cancelled) setStatus("off");
      });
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey) return;
    setStatus("busy");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("off");
        setError("Você precisa permitir notificações no navegador para ativar.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await savePushSubscription(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setStatus("on");
    } catch {
      setStatus("off");
      setError("Não deu para ativar as notificações agora. Tente de novo.");
    }
  }

  async function disable() {
    setStatus("busy");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("on");
      setError("Não deu para desativar agora. Tente de novo.");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs font-medium text-ink-muted">
        Seu navegador não aceita notificações push, ou o servidor ainda não está configurado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5">
        <div>
          <p className="text-sm font-bold text-ink">Notificações no navegador/app</p>
          <p className="text-xs font-medium text-ink-muted">
            Um aviso por dia com quem está atrasado ou vence hoje.
          </p>
        </div>
        <button
          type="button"
          onClick={status === "on" ? disable : enable}
          disabled={status === "checking" || status === "busy"}
          className={
            "btn-soft shrink-0 !px-3 !py-1.5 !text-xs" +
            (status === "on" ? " !border-success-200 !text-success-700" : "")
          }
        >
          {status === "checking" && "Verificando"}
          {status === "busy" && "Aguarde"}
          {status === "on" && "Ativado"}
          {status === "off" && "Ativar"}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-danger-700">{error}</p>}
    </div>
  );
}
