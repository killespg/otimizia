"use client";

import { useEffect, useRef, useState } from "react";
import { PendingButton } from "@/components/ui/PendingButton";
import { UserAvatar } from "@/components/design-system/user-avatar";
import { AVATAR_MAX_BYTES } from "@/lib/account/avatar";
import { removeAvatar, updateAvatar } from "./actions";

/**
 * Escolha da foto de perfil.
 *
 * O envio é imediato ao escolher o arquivo: um botão "salvar" separado só
 * adicionaria um passo para uma ação de campo único. A prévia local aparece
 * antes de a resposta voltar, então a troca parece instantânea mesmo em conexão
 * ruim. O limite de tamanho é checado aqui e de novo no servidor — aqui só para
 * evitar subir 20 MB e receber erro depois.
 */
export function AvatarField({
  displayName,
  photoUrl,
}: {
  displayName: string;
  photoUrl: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A prévia guarda contra qual `photoUrl` ela foi criada. Quando o servidor
  // responde, `photoUrl` muda, a prévia fica velha e o render simplesmente
  // deixa de usá-la — sem efeito nenhum limpando estado depois do fato, que
  // manteria a imagem antiga por um frame se o envio tivesse falhado.
  const [preview, setPreview] = useState<{ url: string; base: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URL não é liberado pelo coletor: sem revogar, cada troca vaza um blob.
  const previewUrl = preview?.url;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function choose() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setError("A foto pode ter no máximo 4 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setPreview({ url: URL.createObjectURL(file), base: photoUrl });
    formRef.current?.requestSubmit();
  }

  const shown = preview && preview.base === photoUrl ? preview.url : photoUrl;

  return (
    <div className="od-band space-y-3 p-3">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={displayName}
          photoUrl={shown}
          className="size-16 bg-violet-500/75 text-base font-bold text-white"
        />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white">Foto de perfil</p>
          <p className="mt-0.5 text-xs leading-5 text-od-text-3">
            Aparece na barra do topo, no menu lateral e na visão geral. JPG, PNG ou WebP,
            até 4 MB.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form ref={formRef} action={updateAvatar}>
          <input
            ref={inputRef}
            id="avatar"
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            onChange={choose}
            className="sr-only"
          />
          <label htmlFor="avatar" className="btn-soft cursor-pointer">
            {photoUrl ? "Trocar foto" : "Escolher foto"}
          </label>
        </form>

        {photoUrl ? (
          <form action={removeAvatar}>
            <PendingButton className="btn-soft" pendingLabel="Removendo">
              Remover
            </PendingButton>
          </form>
        ) : null}
      </div>

      {error ? <p className="text-xs font-semibold text-danger-700">{error}</p> : null}
    </div>
  );
}
