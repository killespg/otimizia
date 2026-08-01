import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { hashInvitationToken, maskEmail } from "@/lib/crm/invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptOrganizationInvitation } from "./actions";

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  let tokenHash: string | null = null;
  try {
    tokenHash = hashInvitationToken(token);
  } catch {
    tokenHash = null;
  }

  const admin = createAdminClient();
  const { data: invitation } = tokenHash
    ? await admin
        .from("organization_invitations")
        .select("org_id, email, expires_at, accepted_at, revoked_at")
        .eq("token_hash", tokenHash)
        .maybeSingle()
    : { data: null };
  const { data: organization } = invitation
    ? await admin
        .from("organizations")
        .select("name")
        .eq("id", invitation.org_id)
        .maybeSingle()
    : { data: null };

  const now = new Date();
  const valid =
    invitation &&
    organization &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > now.getTime();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const returnPath = token ? `/convite?token=${encodeURIComponent(token)}` : "/convite";
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(returnPath)}`;
  const emailMatches =
    Boolean(user?.email) &&
    Boolean(invitation?.email) &&
    user!.email!.toLowerCase() === invitation!.email.toLowerCase();

  return (
    <AuthShell
      title={valid ? `Convite para ${organization.name}` : "Convite indisponível"}
      subtitle={
        valid
          ? `O acesso foi reservado para ${maskEmail(invitation.email)}.`
          : "O link expirou, já foi utilizado ou não é válido."
      }
      error={params.error}
      footer={
        <Link href="/" className="font-semibold text-od-accent hover:text-od-accent-hover">
          Voltar para o início
        </Link>
      }
    >
      {!valid ? (
        <div className="mt-6 border-y border-od-border py-5">
          <p className="text-sm leading-relaxed text-od-text-2">
            Peça a um administrador da organização para enviar um novo convite.
          </p>
        </div>
      ) : !user ? (
        <div className="mt-6 space-y-3 border-y border-od-border py-5">
          <p className="text-sm leading-relaxed text-od-text-2">
            Entre com o e-mail convidado. Se ainda não usa o OtimizIA, crie sua conta primeiro.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={loginHref} className="btn inline-flex min-h-11 items-center justify-center">
              Entrar
            </Link>
            <Link
              href={signupHref}
              className="btn-secondary inline-flex min-h-11 items-center justify-center"
            >
              Criar conta
            </Link>
          </div>
        </div>
      ) : !emailMatches ? (
        <div className="mt-6 space-y-3 border-y border-od-border py-5">
          <p className="text-sm leading-relaxed text-od-text-2">
            Você está conectado como <strong className="text-od-text">{user.email}</strong>,
            mas o convite pertence a outro e-mail.
          </p>
          <Link
            href={loginHref}
            className="btn-secondary inline-flex min-h-11 items-center justify-center"
          >
            Entrar com outro e-mail
          </Link>
        </div>
      ) : (
        <form action={acceptOrganizationInvitation} className="mt-6 border-y border-od-border py-5">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm leading-relaxed text-od-text-2">
            Ao aceitar, você passará a compartilhar os dados de trabalho dessa organização.
            Sua organização atual continuará disponível.
          </p>
          <button type="submit" className="btn mt-4 w-full">
            Aceitar convite
          </button>
        </form>
      )}
    </AuthShell>
  );
}
