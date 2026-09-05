# Changelog

All notable changes to `@oaa/harness` are documented here.

## 0.6.0 — 2026-08-26

### Added

- **`references/runner.md` — how to run a compiled agent, and how to run a whole company.** OAA's earlier docs covered what `compile_agent` produces (`AGENTS.md` + `mcp-config.json`), but not what actually runs the payload. `runner.md` fills that gap: the canonical single-agent PowerShell invocation with its flag semantics; the three trigger types (schedule, event, on-demand) with schedule framed as the agent's normal work rhythm; how work flows between roles through the tools they share access to (agents don't call each other — a tool's own storage is the pickup point); a minimal pseudocode cron-driver pattern plus the failure modes a naive driver misses (schedule drift, stale compiled agent, global vs per-agent lock, silent failure, no same-day retry); and an explicit list of what is out of scope for OAA (scheduling infrastructure, escalation sinks, the tool gateway for `executor: remote`).
- **`SKILL.md` now references both `runner.md` and `executor.md`** in the "Files in This Skill" table. Previously `executor.md` shipped without being surfaced there either — fixed alongside the new runner entry.

No code changes in this release; the harness compiler, validator, and MCP server behavior are byte-identical to 0.5.0.

## 0.5.0 — 2026-08-05

### ⚠ Behavior change — multi-role agents gain autonomous authority

- **`decides` now composes by union, not intersection.** `composeAuthority` intersected the `decides` lists of every role an agent fills. Because no two roles of a well-formed agent share grants — `owns` is required to be disjoint, so their decision rights are disjoint by construction — the intersection was empty for every agent filling more than one role. Those agents compiled to `decides: (none)` and escalated everything.

  Grants now accumulate: an agent filling several roles holds the sum of their decision rights, bounded as always by every `never` in the chain and by the unchanged precedence `never` > `escalates` > `decides`.

  **This widens authority on upgrade.** Any multi-role agent will, after recompiling, act autonomously where it previously escalated — which is the correct behavior, but it is a real change in posture. Recompile every multi-role agent and review the resulting `decides` list before running them unattended. Single-role agents are unaffected (intersection of one set is itself, which is why this went unnoticed).

  Regression symptom if this ever returns: `decides: (none)` on an agent that fills more than one role.

- **An empty `decides: []` is now explicitly transparent.** It contributes nothing to the union rather than zeroing its siblings. This is the pure-watcher pattern — a role that owns a domain and deliberately makes no autonomous decisions in it (see `account-sentinel` in `examples/performance-marketing`). Forbidding is `never`'s job; an empty grant list is not a prohibition. The spec previously left this ambiguous.

### Added

- **Introduction slide deck.** A 13-slide technical introduction to OAA in `docs/introduction/`, covering architecture, authority, ontology, and compilation.

### Fixed

- **Agent narrative body is rendered into `AGENTS.md`.** `renderAgentsMd` emitted role and skill bodies but silently dropped the agent's own prose below its frontmatter. An agent that fills no roles compiled to an identity line and an empty authority block — everything its `AGENT.md` actually said was discarded. The body is now always rendered, independent of role count.
- **Node discovery skips `node_modules`.** The `**/{AGENT.md,*.agent.md}` globs in `resolveChain` and `validateGraph` now pass `ignore: ["**/node_modules/**"]`. Vendored packages shipping a file named `Agent.md` (undici, among others) were matching as workspace agent nodes and producing false positives in both resolution and validation.

### Changed

- **Documentation corrected repo-wide.** Intersection was stated in `references/authority-model.md`, `SKILL.md`, `AGENT.template.md`, `README.md`, the introduction deck, and three strings in `prompts.ts` — including the manual-compile fallback that instructs a model how to compose authority by hand when `compile_agent` is unavailable. All now state union. `docs/PROPOSALv2.md` is left as written; it is a superseded design document.

## 0.4.0 — 2026-07-06

### Added

- **`models:` hints and Compiler Pass 2 documented.** The `models` field on `AGENT.md` — a list of capability hints about the target LLM — is now documented in `skills/org-agent-architecture/references/executor.md`. The `tiny` hint triggers Pass 2: `compile_agent` writes `AGENTS.orig.md` alongside `AGENTS.md` and returns `compactNeeded: true`, signaling the LLM to call `get_compact_prompt_template` and perform a compact rewrite before the agent runs. This is the mechanism behind the compact prompt feature.
- **`get_compact_prompt_template` ships with the binary.** The compact-prompt template (Pass 2 rewriting instructions) is now embedded in the server rather than resolved from the filesystem. Previously the tool required the `skills/` directory to be co-located with the installation; it now works from any install path.

### ⚠ Breaking change

- **`agents.lock` key format changed.** Lockfile entries are now keyed by resolved path (`file://./agents/foo/AGENT.md`) instead of the node's declared `name` field. Any `agents.lock` generated by a prior version is incompatible and will cause stale-detection to treat all nodes as unknown. **Action required: delete `agents.lock` and re-run `compile_agent` to regenerate it.**

### Security

- **`query_concept` SQL injection guard.** Filter keys passed to `query_concept` are now validated against the entity's declared properties, relations, and audit columns before being used in the SQL `WHERE` clause. An unknown column returns an error instead of being injected as a raw identifier into the query string.

### Fixed

- **Stale hash detection in `validate_graph` is now enforced.** SHA-256 integrity hashes are computed per node and compared against the stored value in `agents.lock`; a mismatch emits a warning. Previously the stale check ran but never compared hashes.
- **`validate_graph` now walks `requires` entries in role and skill frontmatter.** Missing or unresolvable `requires` paths in ROLE.md and SKILL.md are now reported as validation errors; previously only AGENT.md `requires` was checked.
- **MCP server advertises the version from `package.json`.** The server reads its own `package.json` at startup via `createRequire`; the version field is no longer a hard-coded string that can drift from the package.
- **Path name inference uses `basename` instead of manual string splitting.** Node names derived from file paths now use `path.basename` correctly on all platforms.

## 0.3.0 — 2026-06-17

### Added

- **Acknowledged enforcement gaps.** A tool that declares `authority.never` rules but has no enforcement anchor (no `server/proxy/`, no `scripts/`, no resolvable `provenance.vendored`) used to be reported as an **error** unconditionally. It can now instead carry `provenance["enforcement-gap"]: { reason, owner, revisit }` in its `TOOL.md` frontmatter — a deliberate, owned acknowledgment that enforcement doesn't exist yet, distinct from an oversight. When present with a non-empty `reason`, the finding downgrades from **error** to **gap** (decide), and a `fix` note ties it back to the declared owner. An empty or missing `reason` does not count as acknowledged — the finding stays an error.
- **Automatic re-escalation.** If `revisit` (an ISO date) has passed, the finding automatically escalates from **gap** back to **warning** — an acknowledgment can't be made once and silently forgotten forever. `revisit` is optional; without it the gap has no expiry.
- Hardened date handling: `revisit` is read correctly whether the frontmatter parser hands it back as a string or (per YAML's implicit typing of unquoted ISO date scalars like `2026-09-01`) as a native `Date` object. Both forms now display and compare correctly — previously an unquoted date would print as a verbose `Date.toString()` in finding messages.
- Documented in `OAA/skills/org-agent-architecture/references/validation.md` (§4, Tools and Implementations) alongside the existing Tool Wiring rule it modifies.

### Why

The Tool Wiring check (added in 0.2.0) is deliberately strict: an unenforced `never` is worse than no `never` at all. But not every gap can be closed immediately, and forcing a choice between "leave it failing validation" and "delete the constraint" punishes honesty. This gives a third option — write down why, who owns it, and when to check again — so the validator distinguishes a tracked, owned decision from a forgotten one, without ever silently passing either.

## 0.2.0 — 2026-06-17

### Fixed

- **`requires`/`fills`/`allowed-tools` paths now resolve relative to the declaring node's own file, not the workspace root.** This is the convention documented in every OAA template (`AGENT.template.md`, `ROLE.template.md`, `SKILL.template.md` all show `../../<kind>/{{name}}`-style paths), but the previous resolver checked every path against `rootDir` unconditionally. Any node living below the top level — i.e. effectively every real agent/role/skill in a normal workspace — failed to resolve its dependencies. `resolveRequires` and `validateGraph`'s requires-check now resolve against the requiring node's own directory.
- **`findNodeFile` now also matches paths that spell out the typed filename directly** (e.g. `../../tools/foo/TOOL.md`), not just paths that point at the containing directory (e.g. `../../tools/foo`). Both styles are in real use; only the directory style worked before.

Together these two fixes mean `validate_graph` and `compile_agent` now correctly walk multi-level chains (agent → role → skill → tool) that were previously reported as broken — `roles`/`skills`/`tools` arrays that used to come back empty or partial for any non-trivial graph should now be complete.

This is a behavior change for any graph that was relying on the old (incorrect) root-relative resolution. No backward-compatible fallback was added — pre-1.0, no known production consumers depend on the old behavior.

### Changed

- **Tool Wiring validation now applies to every tool `connector` (`mcp`, `api`, `local`), not just `mcp`.** A tool of any connector type that declares `authority.never` rules now requires a real enforcement anchor — `server/proxy/` (mcp), a non-empty `scripts/` dir, or a resolvable `provenance.vendored` pointer — or `validate_graph` reports it as an error ("rule is decorative"). Previously only `connector: mcp` tools were checked, so `api`/`local` tools with `never` rules and no enforcement passed validation silently.
- The `server/mcp.json` existence check still applies only to `connector: mcp` tools (api/local tools aren't launched as MCP servers, so they have no `server/mcp.json` to check).

This means workspaces with `api`/`local` tools that declare `never` rules but no enforcement code will now see new validation errors that didn't appear before. This is intentional — the rule was already unenforced, this just makes that visible.
