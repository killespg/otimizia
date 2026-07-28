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
