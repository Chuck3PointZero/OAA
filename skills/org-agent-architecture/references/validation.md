# Validation Checklist

Run top to bottom whenever nodes are created, edited, or moved. Classify findings as **error** (invalid structure), **warning** (valid but fragile), or **gap** (undeclared territory). Report all three classes; never silently fix an error in a file the user authored without saying so.

**Every finding must cite its rule.** A finding is only valid if it names the
specific line in this document, `authority-model.md`, or `SKILL.md` that it
violates, quoting the rule text. If you believe something is wrong but cannot
point to a line here that it violates, do not report it as a finding — either the
checklist genuinely has a gap (propose a new line item for this document,
separately, as a change to the convention itself, not as a finding against the
node) or the node is fine as written. Inventing a requirement mid-audit and
grading nodes against it is the single most damaging failure mode this checklist
exists to prevent: worse than a missed finding, because the fix for a fabricated
rule routinely violates a real rule elsewhere (see §4's schema/field-list rules,
a frequent collision point).

**Structural checks prove absence, not correctness.** Most of this checklist
verifies that a file exists, a path resolves, or a string matches — not that the
thing it describes is true. A `provenance.vendored` path that exists on disk
proves the path is real; it does not prove the vendored code actually implements
the claimed enforcement. Report findings from these checks as what they are —
structural, not semantic — and when a claim can only be checked structurally,
say so in the finding rather than implying a stronger guarantee than the check
actually gives.

## 1. Node Identity

- [ ] Every node directory contains exactly one typed root file (`AGENT.md` / `ROLE.md` / `SKILL.md` / `TOOL.md` / `NOUN.md`) — **error** if zero or multiple.
- [ ] Frontmatter `kind` matches the typed filename — **error**.
- [ ] Frontmatter has `kind`, `name`, `description`; `name` matches the directory name (or filename stem for flat-file nodes) — **error**.
- [ ] Directory nodes have a manifest (`<kind>.json`) whose `name`/`kind` match the frontmatter — **warning** if missing, **error** if contradictory.
- [ ] No `{{placeholder}}` text remains anywhere — **error**.
- [ ] No file relies on a path prefix or directory location for meaning — **warning**.
- [ ] AGENT.md body prose does not hand-author content the compile-agent
  workflow generates from the resolved chain — run order, the memory schema
  table, the env-var table (see SKILL.md, "Workflow: Compile an Agent" step 5,
  and "Compilation: memory schema section") — **warning**. A hand-authored copy
  goes stale the instant any role, skill, or tool in the chain changes, and
  duplicates the compiler's own output in the compiled `AGENTS.md`. Move the
  content to its source of truth (memory schema → the role's `## Memory`
  section; env vars → the tool's `env:` field) and let compilation assemble it.
- [ ] A node is never flagged, at any severity, merely for omitting an
  example-only body section (Outputs, Metrics, Inputs, Handoffs, Success
  Criteria, or similar) — this is not a valid finding at all. A template's
  example-section list illustrates what prose *might* contain, not a
  required-sections checklist. See `SKILL.md`, "Workflow: Author Authority," and
  `assets/templates/ROLE.template.md`.

## 2. Edges

- [ ] Every `requires` / `fills` / `allowed-tools` path resolves to an existing typed root file — **error**.
- [ ] No edge points upward (tool→skill, skill→role, role→agent) or laterally (skill→skill, role→role) — **error**.
- [ ] No cycles in the resolved graph — **error**.
- [ ] No node is orphaned (unreachable from any agent) unless deliberately staged — **warning**, ask the user.

## 3. Authority

Run the audit sequence in `references/authority-model.md` ("Auditing an Existing
Block") — items 1–7 there are canonical. This section adds two graph-level checks
that sequence does not cover:

- [ ] **Side-effecting capabilities reachable by some chain.** Walk every resolved
  `AGENT → ROLE → SKILL → TOOL` chain in the graph. For each tool reached, collect
  every function in its `## Declared Functions` table that is side-effecting —
  marked as such in the table/body, or matching a mutating verb (spend, send,
  delete, publish, create, update, activate, modify). For each side-effecting
  function, confirm the chain reaching it is covered by a `decides` bound, an
  `escalates`, or a `never` somewhere on that chain. A side-effecting function
  reached by a chain with none of the three — relying solely on default-escalate
  — is a **gap** worth raising. This is a graph traversal, not a per-node check:
  do not stop at the first chain that covers a function; every distinct chain
  reaching it needs its own coverage.
- [ ] **Every finding cites its rule.** See the preamble above — restated here
  because §3 is where the fabricated-requirement failure mode actually happened.

## 4. Tools and Implementations

- [ ] Every `type: mcp` or `type: api` tool has provenance: `source`/`upstream`, and `status: third-party` where applicable — **warning**.
- [ ] Third-party code is vendored under the tool's `server/` folder, not referenced loose — **warning**.
- [ ] A declared `provenance.vendored` path actually exists on disk — **error** if it doesn't. A TOOL.md claiming a fact about its own state that isn't true is worse than not claiming it.
- [ ] `type: mcp` tools have a real `server/mcp.json` — **error** if missing. A TOOL.md is a declaration, not a server; without this the tool cannot be launched at all.
- [ ] Any tool with `authority.never` rules has an enforcement anchor, regardless of `type` — **error** if missing. This is not mcp-specific: every tool type assumes real code exists somewhere that can actually stop the forbidden action, not just a TOOL.md saying it's forbidden. Accepted anchors:
  - `type: mcp` — a `server/proxy/` that intercepts every call and applies each rule before forwarding to the real backend.
  - `type: api` / `type: local` — a non-empty `scripts/` folder holding the wrapper/enforcement code, **or** a `provenance.vendored` path that resolves to the real backing implementation (e.g. a pointer into a sibling API repo's endpoint/service files that actually enforce the rule).
  An unenforced `never` is worse than no `never` at all: it reads as a guardrail that isn't actually there. This is the check that catches a TOOL.md that was only ever half-built — declared with real authority rules but never wired to real code, in any language or transport.
  - If no anchor exists yet and that's a deliberate, owned decision rather than an oversight, it can be acknowledged instead of left as an error: add `provenance["enforcement-gap"]: { reason, owner, revisit }` to the TOOL.md. `reason` is required — an empty or missing one does not count as acknowledged. `reason` must state the actual constraint causing the gap — a dependency not yet built, a scoping decision, a resourcing note — not a placeholder or a restatement of the `never` rule itself. `reason: "TBD"`, `reason: "not enforced yet"`, or `reason: "no proxy exists"` (restating the gap, not explaining it) do not count as acknowledged and should be treated as if the field were empty. A real example: `reason: "proxy enforcement ships with the Q3 rate-limiter rewrite; until then this is a documentation-only guardrail"`. This downgrades the finding to **gap** (decide), and re-escalates it to **warning** once `revisit` has passed, so an acknowledgment can't be made once and forgotten forever. Using this to suppress a finding without a real reason, owner, and revisit date is the same anti-pattern as the unenforced `never` itself.
- [ ] No credential **values** in any node file, manifest, or `mcp.json` (variable *names* are fine) — **error**.
- [ ] When the connector/capability split is used: skills require capability files, not the connector directly — **warning**.
- [ ] Every tool named in a skill's `allowed-tools`/`requires` is actually invoked
  by name in at least one `## Workflow` step — **warning** if a listed tool is
  never mentioned in the steps (dead reference: either the workflow is incomplete
  or the tool doesn't belong here).
- [ ] Every tool function a skill's workflow step names is present in that tool's
  `## Declared Functions` table — **error** if it names a function the tool
  doesn't declare.
- [ ] No skill or role prose defines a data schema, metrics table, or
  field/column list for anything other than the node's own runtime state — a
  role's `## Memory` section documenting its own `memory/state.json` fields is
  the one sanctioned exception (see `ROLE.template.md`). Any other field/column
  list — a metrics table, an entity schema, an "Outputs" table describing
  another system's data shape — must *reference* a schema that lives elsewhere
  (a tool's `## Data Models` section, or the ontology's `.rel` source) rather
  than defining one in place — **error** if defined in place rather than
  referenced.
- [ ] If skill or role prose defers a schema to a named tool ("schema owned by
  `X`", "see `X`'s data model"), tool `X`'s TOOL.md actually declares that
  schema — **error** if the named tool has no such section to defer to; **gap**
  if the deferral target exists but is too thin for a maintainer to actually
  derive the fields from it.
- [ ] `metadata.schedule` on an AGENT.md, if present, is a valid cron expression
  — **error** if it is a non-cron placeholder string (e.g. `"on-demand"`,
  `"market-hours"`, `"daily"`) that a CRON.json generator cannot parse. If the
  agent is event-driven or on-demand rather than scheduled, omit
  `metadata.schedule` entirely rather than writing a descriptive placeholder in
  its place.
- [ ] For every `executor: remote` agent, the specific function/endpoint named in
  `metadata.remote.endpoint_env` has a documented, verified field for receiving
  the compiled system prompt — **error** if the integration was built assuming
  this without checking the target system's actual request contract (see
  `references/executor.md`, "Before wiring `metadata.remote`"). A remote agent
  whose `AGENTS.md` has no delivery path is not "not bound by it" — it has no
  path to be bound by at all, which is the stronger failure this check catches.
- [ ] For every role filled by an `executor: remote` agent, every `never` rule in
  that role's composed authority (including inherited tool-layer `never`s) has a
  real enforcement anchor reachable from the remote agent's actual tool-call path
  — **gap** if none exists yet and is acknowledged via `provenance["enforcement-gap"]`
  (same mechanism as tools, `reason`/`owner`/`revisit` required), **error** if
  silently declared with no anchor and no acknowledgment. A remote agent's own
  absence of a capability (e.g., no trade-execution function in its tool registry)
  is evidence, not enforcement — note it as a structural fact in the finding, not
  a substitute for a real anchor.

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
