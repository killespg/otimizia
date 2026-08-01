// Compressão de imagem no navegador, antes do upload.
//
// Foto de celular de corretor sai com 3–8 MB e 4000px de largura. Guardar e
// servir isso do jeito que veio é o que faz o tráfego de saída (egress) do
// Storage explodir: a mesma foto gigante é rebaixada em toda visita a uma
// vitrine, e até a miniatura de 48px da carteira baixa o arquivo inteiro.
// Reduzindo aqui, economiza nos dois lados — o upload do corretor no 4G também
// fica muito mais rápido.
//
// Roda só no cliente (usa canvas).

export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.82;

export type CompressResult = { file: File; originalBytes: number; bytes: number };

// GIF pode ser animado (o canvas achataria pro primeiro quadro) e SVG não é
// bitmap — nesses casos devolvemos o arquivo original.
const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressImage(
  file: File,
  { maxEdge = PHOTO_MAX_EDGE, quality = PHOTO_QUALITY }: { maxEdge?: number; quality?: number } = {}
): Promise<CompressResult> {
  const originalBytes = file.size;
  const unchanged = { file, originalBytes, bytes: originalBytes };
  if (!COMPRESSIBLE.has(file.type)) return unchanged;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation garante que foto tirada de lado no celular não vire
    // deitada depois de passar pelo canvas (o canvas ignora o EXIF sozinho).
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return unchanged;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return unchanged;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return unchanged;

    // Se a "compressão" não ajudou (imagem já pequena e otimizada), fica com o
    // original — não faz sentido reencodar e perder qualidade à toa.
    if (blob.size >= originalBytes) return unchanged;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
      originalBytes,
      bytes: blob.size,
    };
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
