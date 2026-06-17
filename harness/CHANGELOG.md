# Changelog

All notable changes to `@oaa/harness` are documented here.

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

- **Tool Wiring validation now applies to every tool `type` (`mcp`, `api`, `local`), not just `mcp`.** A tool of any type that declares `authority.never` rules now requires a real enforcement anchor — `server/proxy/` (mcp), a non-empty `scripts/` dir, or a resolvable `provenance.vendored` pointer — or `validate_graph` reports it as an error ("rule is decorative"). Previously only `type: mcp` tools were checked, so `api`/`local` tools with `never` rules and no enforcement passed validation silently.
- The `server/mcp.json` existence check still applies only to `type: mcp` tools (api/local tools aren't launched as MCP servers, so they have no `server/mcp.json` to check).

This means workspaces with `api`/`local` tools that declare `never` rules but no enforcement code will now see new validation errors that didn't appear before. This is intentional — the rule was already unenforced, this just makes that visible.
