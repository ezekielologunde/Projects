---
type: reference
status: active
last_updated: 2026-08-22
tags: [type/reference, claude-integration]
---

# Initial Knowledge Base Audit Prompt

Paste this into Claude Code inside a project to generate its knowledge base (replace `<PROJECT>` with the project name):

````text
Audit the entire project and build an Obsidian-compatible project knowledge base.

First inspect: CLAUDE.md, .claude/, README files, package.json, source directories, database migrations, Edge Functions, database types, API/service layers, authentication, RLS policies, payment implementation, tests, configuration, deployment configuration, and existing documentation.

Do not modify application code.

Create docs/obsidian/ with: Project.md, Architecture.md, Database.md, Backend.md, Frontend.md, Security.md, Payments.md, Features.md, Decisions.md, Bugs.md, Tasks.md, Changelog.md. (Skip files that genuinely don't apply — e.g. Payments.md for a project with no payments — and note the omission in Project.md.)

Every document must contain YAML frontmatter compatible with Obsidian:
project: <PROJECT>
type:
status: active
last_updated:

Create meaningful [[internal links]] between documents.

The documentation must describe the ACTUAL current implementation. Do not infer functionality that does not exist. Clearly separate: implemented, partially implemented, planned, deprecated, known risk.

- Database.md: tables, relationships, important fields, RPCs, triggers, RLS policies, migrations.
- Architecture.md: major system components and how data flows between them.
- Security.md: authentication, authorization, RLS, storage security, privileged functions, threat controls, known security risks.
- Payments.md: the actual payment lifecycle; clearly identify anything still a placeholder.
- Decisions.md: significant architectural and product decisions extracted from the repository and docs.
- Tasks.md: incomplete work discovered during the audit.
- Changelog.md: meaningful project history reconstructed from Git history and existing documentation.

At the end, report: 1) files created, 2) files containing uncertain information, 3) missing documentation, 4) implementation gaps discovered, 5) recommended future documentation automation.
````

## Related

- [[🔧 Setup Guide — Claude Projects → Obsidian]]
