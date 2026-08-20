# OtimizIA functional application instructions

## Automatic Obsidian development record

Registration id: `otimizia-obsidian-dev-log-v1`.

For every material task that analyzes, tests, changes, configures, migrates, or
releases this application, record the outcome exactly once before the final
response:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/obsidian-log.ps1 `
  -Mode session `
  -Actor Codex `
  -Summary "<what was completed>" `
  -Tests "<checks run and results>" `
  -Files "<important files, separated by semicolons>" `
  -Decisions "<durable decisions>" `
  -Risks "<remaining risks or pending verification>"
```

Never log secrets, `.env` values, customer data, diffs, or command output that
may contain credentials. Record concise outcomes, tests, decisions, risks, and
file paths only. Update relevant canonical notes when durable project facts
change. The central history note is
`08 Equipe/Registro automatico de desenvolvimento.md`.

The Git post-commit hook records commits separately and must not be disabled or
bypassed. If another AGENTS file repeats this protocol, create only one session
entry. If the script fails, use the Obsidian MCP or a direct safe append as a
fallback and do not call the task complete until the record exists.

## Cursor Cloud specific instructions

Product: **OtimizIA** — a Next.js 16 (App Router) + React 19 + TypeScript +
Tailwind CRM with a local Supabase backend. Standard commands live in
`README.md` and `package.json` scripts (`dev`, `lint`, `typecheck`, `test`,
`test:integration`, `build`); the CI pipeline that mirrors full validation is
`.github/workflows/ci.yml`. Only the non-obvious cloud caveats are below.

### Backend requires Docker + local Supabase (not in the update script)
The update script only runs `npm ci`. The backend (auth, DB, storage) is a local
Supabase stack that needs Docker, which is a system dependency and is NOT
installed by the update script. On a fresh VM you must bring these up yourself:

- Start the Docker daemon if `docker info` fails: `sudo dockerd` (run it in a
  background tmux session), then `sudo chmod 666 /var/run/docker.sock` so
  `docker`/`supabase` work without sudo. This VM uses the `fuse-overlayfs`
  storage driver (see `/etc/docker/daemon.json`) and `iptables-legacy`; the
  default overlay2/nftables do not work in this Firecracker VM.
- Start Supabase: `npx --no-install supabase start`. This applies all
  `supabase/migrations/*` and `supabase/seed.sql` automatically. First run pulls
  images (~1 min). Studio: http://127.0.0.1:54323, API: http://127.0.0.1:54321,
  Mailpit (captured emails): http://127.0.0.1:54324.
- Stop with `npx --no-install supabase stop` (add `--no-backup` to reset).

### `.env.local` is required and git-ignored
The app and the integration tests read `.env.local` (git-ignored). It must point
at the local Supabase. The Supabase CLI local anon/service keys are fixed demo
values (not secrets); get them with `npx --no-install supabase status -o json`.
Use the Cloudflare Turnstile public **test** keys (`1x0000...`) so the login /
signup captcha auto-passes — automated browsers never get a real token. Other
integration keys (Stripe/Anthropic/OpenAI/Evolution/Cron) can be the same
harmless placeholders CI uses in `.github/workflows/ci.yml`; server routes boot
without real values, but those specific third-party integrations stay inert.

### Auth / signup behavior in local dev
Local Supabase has `enable_confirmations = false` (`supabase/config.toml`), so
new signups are auto-confirmed — no email step. A valid CPF is required to reach
`/painel` (the middleware redirects to `/onboarding/cpf` otherwise); use a real
check-digit-valid CPF such as `529.982.247-25` in tests. Health check:
`GET http://localhost:3000/api/health` returns `{"status":"ok"}`.

### Integration tests need Supabase running first
`npm run test:integration` runs `scripts/require-local-supabase.mjs`, which
FAILS (does not skip) if the local Supabase stack is not up. Start Supabase
before running it. `npm test` (unit) needs no backend.

### Obsidian logging is Windows-only
The `scripts/obsidian-log.ps1` protocol above and the `.githooks/post-commit`
hook call `powershell.exe`, which does not exist on this Linux cloud VM. The
post-commit hook already swallows that failure and exits 0, so commits still
work; do not disable it. Obsidian session logging cannot run here.
