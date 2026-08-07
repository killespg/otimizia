import { avatarInitials } from "@/lib/account/avatar";

/**
 * Identidade de quem está usando o produto.
 *
 * Um componente só para os seis lugares que desenhavam iniciais à mão: topbar
 * do escritório, do vendedor, do jurídico, rodapé da navegação, configurações
 * rápidas e cabeçalho da visão geral imobiliária. Sem foto continua sendo a
 * mesma pastilha de iniciais de antes; com foto, a imagem preenche o círculo.
 *
 * `<img>` puro em vez de `next/image`: o avatar aparece no layout de toda tela
 * e em seis tamanhos diferentes, e o otimizador não tem o que ganhar num
 * quadrado de 32 a 48 px que já foi recortado no upload.
 */
export function UserAvatar({
  name,
  photoUrl,
  className = "",
  fallback,
}: {
  name: string | null | undefined;
  photoUrl?: string | null;
  /** Tamanho, cor de fundo e tipografia da pastilha — quem chama define. */
  className?: string;
  fallback?: string;
}) {
  const base = "grid shrink-0 place-items-center overflow-hidden rounded-full ";

  if (photoUrl) {
    return (
      <span aria-hidden="true" className={base + className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={base + className}>
      {avatarInitials(name, fallback)}
    </span>
  );
}
