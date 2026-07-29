@AGENTS.md

# Claude-specific instruction

When running `scripts/obsidian-log.ps1` at the end of a material task, always
pass `-Actor Claude`. This overrides the Codex example and identifies the entry
correctly.

Use exactly one session entry per task. Never log secrets, `.env` values,
customer data, diffs, or credential-bearing command output. A successful task
is not complete until its Obsidian entry exists.

## Obsidian MCP access

The `.mcp.json` file connects Claude to the project-scoped server
`otimizia_obsidian`. Its only vault is:

`C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\Obsidian\OtimizIA`

Use it to read, search, create, and update OtimizIA notes. Project settings deny
`delete-note` and `rename-tag`; never attempt to bypass those restrictions.
Never write passwords, tokens, API keys, private customer data, `.env` values,
or credential-bearing command output. Keep VPS and n8n details out of the vault
unless the user explicitly adds them back to scope.
