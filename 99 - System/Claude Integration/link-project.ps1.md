---
type: reference
status: active
last_updated: 2026-08-22
tags: [type/reference, claude-integration]
---

# link-project.ps1

PowerShell helper to symlink a project's `docs/obsidian` into this vault. Save as `link-project.ps1` and run **as Administrator**:

```powershell
param(
  [Parameter(Mandatory)][string]$ProjectPath,   # e.g. C:\Projects\preppa-app
  [Parameter(Mandatory)][string]$ProjectName,   # e.g. Preppa
  [string]$VaultPath = "C:\Users\WT8\Obsidian Vault"
)

$target = Join-Path $ProjectPath "docs\obsidian"
$link   = Join-Path $VaultPath "02 - Projects\$ProjectName"

if (-not (Test-Path $target)) {
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Write-Host "Created $target"
}

if (Test-Path $link) {
  Write-Error "$link already exists — remove it first or pick another name."
  exit 1
}

New-Item -ItemType SymbolicLink -Path $link -Target $target | Out-Null
Write-Host "Linked: $link -> $target"
Write-Host "Reminder: add '02 - Projects/$ProjectName/' to the vault's .gitignore if you commit the vault."
```

Usage:

```powershell
.\link-project.ps1 -ProjectPath "C:\Projects\preppa-app" -ProjectName "Preppa"
```

> [!note] If symlinks are blocked
> Enable Windows **Developer Mode** (Settings → System → For developers) to create symlinks without Administrator rights, or use a directory junction instead: `cmd /c mklink /J "<link>" "<target>"`.
