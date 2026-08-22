---
type: guide
status: active
last_updated: 2026-08-22
tags: [type/reference, claude-integration]
---

# 🔧 Setup Guide — Claude Projects → Obsidian

Make Obsidian automatically show up-to-date knowledge bases for every Claude Code project. The flow:

```
Project repo → Claude Code maintains docs/obsidian/*.md → symlink → this vault
```

The repo stays the source of truth; Obsidian just sees Markdown appear.

## Step 1 — Install Obsidian and open this vault

1. Download Obsidian from https://obsidian.md and install it.
2. Clone this repository somewhere permanent, e.g. `C:\Users\WT8\Obsidian Vault` (keep it **outside** your project repos).
3. In Obsidian: **Open folder as vault** → select that folder. All settings (templates, daily notes, attachments) are pre-configured in `.obsidian/`.

## Step 2 — Prepare a project (once per project)

From the project repo (e.g. `C:\Projects\preppa-app`), copy the **project kit** from this vault:

- `99 - System/Claude Integration/project-kit/.claude/skills/obsidian-sync/SKILL.md` → `<project>/.claude/skills/obsidian-sync/SKILL.md`
- `99 - System/Claude Integration/project-kit/.claude/commands/sync-docs.md` → `<project>/.claude/commands/sync-docs.md`
- Append [[CLAUDE.md Documentation Rules]] to the project's `CLAUDE.md`.
- Create an empty `docs/obsidian/` folder.

## Step 3 — Generate the initial knowledge base

Open a terminal in the project and run `claude`, then paste the prompt from [[Initial Knowledge Base Audit Prompt]]. Claude audits the whole codebase and writes `docs/obsidian/` with Project, Architecture, Database, Backend, Frontend, Security, Payments, Features, Decisions, Bugs, Tasks, and Changelog notes — all with YAML frontmatter and `[[internal links]]`.

## Step 4 — Link the project into this vault

Run PowerShell **as Administrator** (or use the script in [[link-project.ps1]]):

```powershell
New-Item -ItemType SymbolicLink `
  -Path "C:\Users\WT8\Obsidian Vault\02 - Projects\Preppa" `
  -Target "C:\Projects\preppa-app\docs\obsidian"
```

Obsidian now shows the project's notes live. When Claude updates the docs in the repo, the vault updates instantly — no sync daemon needed.

> [!tip] Git note
> Symlinked folders inside the vault belong to the *project's* repo, not the vault repo. Add `02 - Projects/<symlinked-project>/` to this vault's `.gitignore` if you commit the vault, so the two repos never fight.

## Step 5 — Keep docs fresh automatically

- The `obsidian-sync` skill makes Claude update affected docs whenever it makes significant code changes.
- Run `/sync-docs` any time to reconcile documentation against the actual codebase and Git history.

## Repeat for every project

Same three moves per project: copy the kit → run the audit prompt → symlink into `02 - Projects/`. Candidates from your GitHub: preppa-app, deeperlife-columbia, khs-prp-system, cacna-convention, bagsly, cyntraix, ot-vuln-lab, XAI…

## Related

- [[CLAUDE.md Documentation Rules]]
- [[Initial Knowledge Base Audit Prompt]]
- [[link-project.ps1]]
- [[🏠 Home]]
