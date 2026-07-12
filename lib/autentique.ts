import { createHmac, timingSafeEqual } from "node:crypto";

const API_URL = "https://api.autentique.com.br/v2/graphql";

export type AutentiqueSigner = { name: string; email: string };

const CREATE_DOCUMENT_MUTATION = `
  mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
    }
  }
`;

// Envia um PDF para assinatura via Autentique (multipart GraphQL — a
// especificação graphql-multipart-request-spec que a API deles usa: query +
// variables em "operations", "map" apontando o campo do arquivo, e o
// binário em "file"). Retorna null se a integração não está configurada
// (sem token) ou se a chamada falhar — quem chama decide como avisar o
// usuário, igual ao padrão de lib/ai/*.ts.
export async function sendDocumentForSignature(
  fileBytes: Buffer,
  fileName: string,
  documentName: string,
  signers: AutentiqueSigner[]
): Promise<{ id: string } | null> {
  const token = process.env.AUTENTIQUE_API_TOKEN;
  if (!token) return null;

  const operations = JSON.stringify({
    query: CREATE_DOCUMENT_MUTATION,
    variables: {
      document: { name: documentName },
      signers: signers.map((signer) => ({ name: signer.name, email: signer.email, action: "SIGN" })),
      file: null,
    },
  });

  const form = new FormData();
  form.append("operations", operations);
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  // Buffer é aceito como BlobPart em runtime (Node), mas o lib.dom.d.ts do
  // TS exige ArrayBufferView<ArrayBuffer> — o tipo de Buffer é
  // ArrayBufferLike (pode incluir SharedArrayBuffer), daí o cast.
  form.append("file", new Blob([fileBytes as unknown as BlobPart], { type: "application/pdf" }), fileName);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: { createDocument?: { id?: string } }; errors?: unknown };
    const id = json.data?.createDocument?.id;
    return typeof id === "string" && id ? { id } : null;
  } catch {
    return null;
  }
}

const DOCUMENT_SIGNED_URL_QUERY = `
  query DocumentSignedUrlQuery($id: ID!) {
    document(id: $id) {
      files { signed }
    }
  }
`;

// Busca o link do PDF assinado depois que o webhook avisa que terminou.
// A doc da Autentique recomenda não fazer polling de status por aqui — só
// usamos essa query pontualmente, disparada pelo próprio evento de webhook.
export async function fetchSignedDocumentUrl(autentiqueDocumentId: string): Promise<string | null> {
  const token = process.env.AUTENTIQUE_API_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: DOCUMENT_SIGNED_URL_QUERY, variables: { id: autentiqueDocumentId } }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: { document?: { files?: { signed?: string } } } };
    return json.data?.document?.files?.signed ?? null;
  } catch {
    return null;
  }
}

// Verificação HMAC-SHA256 do webhook (header x-autentique-signature),
// documentada em https://docs.autentique.com.br/api/integration-basics/webhooks.
// Sem isso, qualquer requisição não autenticada poderia forjar "assinado" pra
// um documento jurídico.
export function verifyAutentiqueSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.AUTENTIQUE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signatureHeader, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
