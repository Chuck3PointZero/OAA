# Validation Checklist

Run top to bottom whenever nodes are created, edited, or moved. Classify findings as **error** (invalid structure), **warning** (valid but fragile), or **gap** (undeclared territory). Report all three classes; never silently fix an error in a file the user authored without saying so.

## 1. Node Identity

- [ ] Every node directory contains exactly one typed root file (`AGENT.md` / `ROLE.md` / `SKILL.md` / `TOOL.md` / `NOUN.md`) — **error** if zero or multiple.
- [ ] Frontmatter `kind` matches the typed filename — **error**.
- [ ] Frontmatter has `kind`, `name`, `description`; `name` matches the directory name (or filename stem for flat-file nodes) — **error**.
- [ ] Directory nodes have a manifest (`<kind>.json`) whose `name`/`kind` match the frontmatter — **warning** if missing, **error** if contradictory.
- [ ] No `{{placeholder}}` text remains anywhere — **error**.
- [ ] No file relies on a path prefix or directory location for meaning — **warning**.

## 2. Edges

- [ ] Every `requires` / `fills` / `allowed-tools` path resolves to an existing typed root file — **error**.
- [ ] No edge points upward (tool→skill, skill→role, role→agent) or laterally (skill→skill, role→role) — **error**.
- [ ] No cycles in the resolved graph — **error**.
- [ ] No node is orphaned (unreachable from any agent) unless deliberately staged — **warning**, ask the user.

## 3. Authority

Run the audit sequence in `references/authority-model.md` ("Auditing an Existing Block"). Headlines:

- [ ] `owns` disjoint across all roles — **error**.
- [ ] No `decides` grant that a downstream `never` makes dead — **error**.
- [ ] No constraint duplicated across layers — **warning**.
- [ ] No authority fields on agents — **warning**.
- [ ] Identifiers consistent (exact string reuse) — **warning**.
- [ ] Permissions described in prose but absent from frontmatter — **gap**.
- [ ] Side-effecting capabilities (spend, send, delete, publish) reachable by some chain: confirm each is covered by a `decides` bound, an `escalates`, or a `never` — anything relying solely on default-escalate for a money/destructive action is a **gap** worth raising.

## 4. Tools and Implementations

- [ ] Every `type: mcp` or `type: api` tool has provenance: `source`/`upstream`, and `status: third-party` where applicable — **warning**.
- [ ] Third-party code is vendored under the tool's `server/` folder, not referenced loose — **warning**.
- [ ] No credential **values** in any node file, manifest, or `mcp.json` (variable *names* are fine) — **error**.
- [ ] When the connector/capability split is used: skills require capability files, not the connector directly — **warning**.

## 5. Lockfile

- [ ] `agents.lock` exists at the repository root (or wrapper root) — **warning** if absent (valid but unpinned; offer to generate entries).
- [ ] Every resolved node has an entry; every entry's `requires` matches the files — **error** if divergent (stale lock).
- [ ] Hash scope is correct: typed root + manifest + `references/` + `scripts/` + `assets/` + `server/`; excludes `README.md`, `memory/`, `decisions/` — **error** if a hash claims to cover excluded paths.
- [ ] Third-party entries carry `upstream` URL and `vendored` path — **warning**.
- [ ] Lockfile not hand-edited mid-review: if files changed, regenerate entries rather than patching hashes — hand-patched hashes defeat drift detection entirely — **error**.

## 6. Reporting Format

```
## Validation: <repo or node>
**Errors (must fix)** — item + file + one-line fix
**Warnings (should fix)** — item + file + why it's fragile
**Gaps (decide)** — undeclared territory + the question the owner must answer
Verdict: VALID / VALID-WITH-WARNINGS / INVALID
```

When everything passes, say so briefly and show the resulting resolved chain(s) as an indented tree — the user should see what an agent actually inherits, not just a green light.
