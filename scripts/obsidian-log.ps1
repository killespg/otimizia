[CmdletBinding()]
param(
  [ValidateSet("session", "commit", "verify")]
  [string]$Mode = "session",

  [string]$Summary = "",
  [string]$Tests = "",
  [string]$Files = "",
  [string]$Decisions = "",
  [string]$Risks = "",
  [ValidateSet("Codex", "Claude", "Manual")]
  [string]$Actor = "Codex",
  [string]$Repository = "",
  [string]$VaultPath = "",
  [string]$EntryId = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Protect-Text {
  param(
    [AllowEmptyString()]
    [string]$Value,
    [int]$MaximumLength = 3000
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $protected = $Value.Trim()
  $protected = [regex]::Replace(
    $protected,
    "(?i)\b(?:sb_secret|sk_(?:live|test|proj)|whsec)_[A-Za-z0-9_-]+\b",
    "[REDACTED]"
  )
  $protected = [regex]::Replace(
    $protected,
    "\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]{10,}){1,2}\b",
    "[REDACTED_JWT]"
  )
  $protected = [regex]::Replace(
    $protected,
    "(?im)^(\s*[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)[A-Z0-9_]*\s*[:=]\s*).+$",
    '$1[REDACTED]'
  )
  $protected = [regex]::Replace(
    $protected,
    "(?i)\b(senha|password)\b\s*[:=]\s*\S+",
    '$1=[REDACTED]'
  )

  if ($protected.Length -gt $MaximumLength) {
    return $protected.Substring(0, $MaximumLength) + "..."
  }

  return $protected
}

function Invoke-GitText {
  param([string[]]$Arguments)

  $result = & git -C $Repository @Arguments 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao consultar o Git: git $($Arguments -join ' ')"
  }
  return ($result -join "`n").Trim()
}

if ([string]::IsNullOrWhiteSpace($VaultPath)) {
  if (-not [string]::IsNullOrWhiteSpace($env:OTIMIZIA_OBSIDIAN_VAULT)) {
    $VaultPath = $env:OTIMIZIA_OBSIDIAN_VAULT
  } else {
    $VaultPath = "C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\Obsidian\OtimizIA"
  }
}

$resolvedVault = [System.IO.Path]::GetFullPath($VaultPath)
$obsidianAppConfig = Join-Path $resolvedVault ".obsidian\app.json"
$logDirectory = Join-Path $resolvedVault "08 Equipe"
$logPath = Join-Path $logDirectory "Registro automatico de desenvolvimento.md"

if (-not (Test-Path -LiteralPath $obsidianAppConfig -PathType Leaf)) {
  throw "Cofre Obsidian invalido ou nao inicializado: $resolvedVault"
}

if ($Mode -eq "verify") {
  [pscustomobject]@{
    Status = "ok"
    Vault = $resolvedVault
    Log = $logPath
    LogExists = Test-Path -LiteralPath $logPath -PathType Leaf
    GitHook = Join-Path $PSScriptRoot "..\.githooks\post-commit"
  } | Format-List
  exit 0
}

$sourceLabel = "$Actor / tarefa de desenvolvimento"
$occurredAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
$title = ""
$fileItems = @()

if ($Mode -eq "commit") {
  if ([string]::IsNullOrWhiteSpace($Repository)) {
    $Repository = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
  } else {
    $Repository = [System.IO.Path]::GetFullPath($Repository)
  }

  $commitHash = Invoke-GitText @("rev-parse", "HEAD")
  $shortHash = Invoke-GitText @("rev-parse", "--short=10", "HEAD")
  $commitSubject = Protect-Text (Invoke-GitText @("show", "-s", "--format=%s", "HEAD")) 500
  $commitAuthor = Protect-Text (Invoke-GitText @("show", "-s", "--format=%an", "HEAD")) 200
  $commitDate = Protect-Text (Invoke-GitText @("show", "-s", "--format=%cI", "HEAD")) 100
  $changedFiles = Invoke-GitText @(
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-status",
    "-r",
    "HEAD"
  )

  $EntryId = "commit:$commitHash"
  $sourceLabel = "Git post-commit"
  $occurredAt = $commitDate
  $title = "Commit $shortHash - $commitSubject"
  $Summary = "Commit criado por $commitAuthor."
  $Tests = "Nao inferidos pelo hook. Consultar a entrada de tarefa relacionada."
  $Decisions = "Consultar a entrada de tarefa relacionada."
  $Risks = "Nenhum risco inferido automaticamente."
  if (-not [string]::IsNullOrWhiteSpace($changedFiles)) {
    $fileItems = @($changedFiles -split "\r?\n")
  }
} else {
  if ([string]::IsNullOrWhiteSpace($Summary)) {
    throw "O modo session exige -Summary."
  }

  if ([string]::IsNullOrWhiteSpace($EntryId)) {
    $randomSuffix = [guid]::NewGuid().ToString("N").Substring(0, 8)
    $EntryId = "session:$((Get-Date).ToString('yyyyMMddTHHmmss'))-$randomSuffix"
  } else {
    $EntryId = "session:$EntryId"
  }

  $title = Protect-Text $Summary 500
  if (-not [string]::IsNullOrWhiteSpace($Files)) {
    $fileItems = @(
      $Files -split "(?:\r?\n|;)" |
        ForEach-Object { $_.Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -First 200
    )
  }
}

$safeSummary = Protect-Text $Summary
$safeTests = Protect-Text $Tests
$safeDecisions = Protect-Text $Decisions
$safeRisks = Protect-Text $Risks
$safeEntryId = Protect-Text $EntryId 300
$safeSource = Protect-Text $sourceLabel 200
$safeTitle = Protect-Text $title 500

$entryLines = [System.Collections.Generic.List[string]]::new()
$entryLines.Add("")
$entryLines.Add("<!-- auto-id: $safeEntryId -->")
$entryLines.Add("## $occurredAt - $safeTitle")
$entryLines.Add("")
$entryLines.Add("- **Origem:** $safeSource")
$entryLines.Add("- **Resumo:** $safeSummary")
$entryLines.Add("- **Testes:** $(if ($safeTests) { $safeTests } else { 'Nao informados.' })")
$entryLines.Add("- **Decisoes:** $(if ($safeDecisions) { $safeDecisions } else { 'Nenhuma decisao duravel registrada.' })")
$entryLines.Add("- **Riscos/pendencias:** $(if ($safeRisks) { $safeRisks } else { 'Nenhum informado.' })")

if ($fileItems.Count -gt 0) {
  $entryLines.Add("")
  $entryLines.Add("### Arquivos")
  $entryLines.Add("")
  foreach ($fileItem in $fileItems) {
    $safeFile = (Protect-Text $fileItem 500).Replace("``", "")
    $entryLines.Add("- ``$safeFile``")
  }
}

$entry = ($entryLines -join "`r`n") + "`r`n"

if ($DryRun) {
  Write-Output $entry
  exit 0
}

if (-not (Test-Path -LiteralPath $logDirectory -PathType Container)) {
  [System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null
}

$lockPath = Join-Path $resolvedVault ".obsidian\otimizia-development-log.lock"
$lockStream = $null
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $lockStream = [System.IO.File]::Open(
      $lockPath,
      [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
    break
  } catch [System.IO.IOException] {
    Start-Sleep -Milliseconds 100
  }
}

if ($null -eq $lockStream) {
  throw "Nao foi possivel obter o bloqueio do registro automatico."
}

try {
  $existing = if (Test-Path -LiteralPath $logPath -PathType Leaf) {
    [System.IO.File]::ReadAllText($logPath)
  } else {
    ""
  }

  $marker = "<!-- auto-id: $safeEntryId -->"
  if ($existing.Contains($marker)) {
    Write-Output "already-recorded $safeEntryId"
    exit 0
  }

  [System.IO.File]::AppendAllText($logPath, $entry, $utf8NoBom)
} finally {
  $lockStream.Dispose()
}

Write-Output "recorded $safeEntryId"
