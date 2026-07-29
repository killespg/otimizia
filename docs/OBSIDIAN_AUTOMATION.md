# Registro automático no Obsidian

O desenvolvimento da OtimizIA usa duas trilhas complementares:

1. Cada tarefa material do Codex ou do Claude registra resumo, testes, arquivos,
   decisões e riscos ao terminar, identificando corretamente o agente.
2. Cada commit do repositório funcional gera uma entrada adicional pelo hook
   `post-commit`, inclusive quando foi criado manualmente ou por outra
   ferramenta.

O destino é:

`08 Equipe/Registro automatico de desenvolvimento.md`

## Ativação local

O repositório deve usar a pasta de hooks versionada:

```powershell
git config core.hooksPath .githooks
```

## Registro manual

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts/obsidian-log.ps1 `
  -Mode session `
  -Actor Manual `
  -Summary "Resumo do trabalho" `
  -Tests "Testes executados" `
  -Files "arquivo-a; arquivo-b" `
  -Decisions "Decisões duráveis" `
  -Risks "Pendências"
```

## Verificação

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File scripts/obsidian-log.ps1 `
  -Mode verify
```

## Segurança

O hook registra metadados do commit e caminhos, nunca o diff. O script também
redige padrões comuns de tokens e valores nomeados como segredo. Ainda assim,
quem escreve o resumo deve evitar qualquer senha, chave, dado de cliente ou
saída de comando com credenciais.

O Codex recebe a regra pelos arquivos `AGENTS.md`; o Claude recebe a mesma regra
pelos arquivos `CLAUDE.md` e usa `-Actor Claude`.
