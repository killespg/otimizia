"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePropertyMedia, reorderPropertyMedia } from "@/app/(app)/imoveis/actions";
import { IconTrash } from "@/app/(app)/icons";

type Photo = { id: string; url: string };

export function PropertyPhotoManager({ propertyId, photos }: { propertyId: string; photos: Photo[] }) {
  const [order, setOrder] = useState(photos);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Ressincroniza com a verdade do servidor depois de qualquer revalidação
  // (exclusão, upload, ou o próprio reorder já persistido) — sem isso o
  // estado local do drag-and-drop poderia ficar dessincronizado.
  useEffect(() => {
    setOrder(photos);
  }, [photos]);

  function persist(newOrder: Photo[]) {
    setOrder(newOrder);
    const formData = new FormData();
    formData.set("property_id", propertyId);
    for (const photo of newOrder) formData.append("media_ids", photo.id);
    startTransition(() => {
      reorderPropertyMedia(formData);
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const current = [...order];
    const fromIndex = current.findIndex((p) => p.id === dragId);
    const toIndex = current.findIndex((p) => p.id === targetId);
    setDragId(null);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    persist(current);
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
      {order.map((photo, index) => (
        <div
          key={photo.id}
          draggable
          onDragStart={() => setDragId(photo.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(photo.id)}
          onDragEnd={() => setDragId(null)}
          className={
            "group relative cursor-grab overflow-hidden rounded-lg border border-line active:cursor-grabbing " +
            (dragId === photo.id ? "opacity-40" : "")
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- vem de storage público, sem next/image configurado */}
          <img src={photo.url} alt="" className="aspect-square w-full select-none object-cover" draggable={false} />
          <span className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded bg-black/60 px-1 text-[10px] font-black text-white">
            {index + 1}
          </span>
          <form action={deletePropertyMedia} className="absolute right-1.5 top-1.5">
            <input type="hidden" name="id" value={photo.id} />
            <input type="hidden" name="property_id" value={propertyId} />
            <button
              type="submit"
              aria-label={`Excluir foto ${index + 1}`}
              className="grid h-6 w-6 place-items-center rounded bg-black/60 text-white hover:bg-danger-600"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ))}
      {order.length > 1 && (
        <p className="col-span-2 -mt-1 text-[11px] font-medium text-ink-muted sm:col-span-3">
          Arraste uma foto para reordenar — a foto 1 é a capa, usada na listagem e no seletor de vitrine.
        </p>
      )}
    </div>
  );
}
