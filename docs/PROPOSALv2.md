---
title: A Convention for Organizational Agent Architecture
status: draft
version: 2
date: 2026-06-11
authors: [Chuck Kosta, Claude (Anthropic)]
---

# A Convention for Organizational Agent Architecture

## The Problem

Current agent standards solve the skill and tool layers well. The [Agent Skills specification](https://agentskills.io) defines how a skill is structured, discovered, and progressively disclosed. MCP defines how capabilities are transported and invoked. [SEP-2640](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640) is actively connecting the two.

What none of them address is the organizational layer above skills: who owns which domain, which skills belong to which function, what an agent may decide autonomously, and what it must escalate. Without that layer, agents fill every vacuum — or wait for permissions that never come.

There is a second problem. Files in agent systems currently derive their identity from directory structure and filename prefixes (`asa_`, `_skills`, `AGENTS.md`). Change the path, lose the identity. This creates fragile, location-dependent conventions that break under reorganization.

There is also a trap waiting inside the obvious solution: defining the missing layers as a stack of separate specifications that are clearly the same shape. Four schemas to learn, four validators to write, four ways for the layers to drift apart — an isomorphism observed but never used.

This proposal uses it.

---

## The Reference Chain

```
AGENT → ROLE(s) → SKILL(s) → TOOL(s) → implementation
```

Every layer is a **reference** to the next, not a container of it. An agent does not own its skills. A skill does not own its tools. Each layer knows what it needs by looking at what it references — nothing is hardcoded into the layer above.

This means:
- Swap a role, the agent's skill set changes
- Swap a skill, the tool authorization changes
- Swap a tool implementation (MCP to REST API), the skill is unaffected
- An agent filling multiple roles composes skills from all of them

The four layers are not four formats. They are **one format with a `kind` field**, and the chain is a recursion of a single primitive.

---

## One Primitive, Four Kinds

A **node** is the only structure this convention defines. AGENT, ROLE, SKILL, and TOOL are kinds of node. Every node has the same anatomy:

1. A **typed root file** — `AGENT.md`, `ROLE.md`, `SKILL.md`, or `TOOL.md` — whose filename declares its kind and whose YAML frontmatter follows one common schema
2. An optional **manifest** (`agent.json`, `role.json`, `skill.json`, `tool.json`) declaring the directory's canonical composition
3. Optional **support folders** — `references/` always, plus kind-specific folders
4. **References downward** — the `requires` field, the only edge type in the system. A `requires` may point to the next layer down, or laterally to nodes of the *same* kind — a skill composing sub-skills, an agent delegating to sub-agents. It may never point upward.

A node is minimally a single typed file, and a node that grows gets a directory — but the directory form is the canonical one, and it is identical for every kind. Each kind's directory carries the same anatomy plus one kind-specific folder for the thing only that kind accumulates: roles accumulate **decisions**, agents accumulate **memory**, skills accumulate **scripts and assets**, and tools accumulate an **implementation** — the `server/` folder, which is where MCP server code, vendored third-party packages, proxy code, and transport configuration live. The chain's final hop, `TOOL → implementation`, is not a pointer out of the repository; it is the tool node's own `server/` folder (or, for remote implementations, a reference pinned in the lockfile). This is the self-similarity made literal: the structure is not *like* itself as you descend the chain — it *is* itself, all the way down to the code.

### The Common Frontmatter

```yaml
# Identical schema in AGENT.md, ROLE.md, SKILL.md, TOOL.md
kind: role                        # agent | role | skill | tool
name: audience-manager
description: Owns the subscriber relationship end to end.
requires:                         # references to the layer below
  - ../../skills/audience-growth
  - ../../skills/list-hygiene
authority:
  owns: [subscriber-list, segments]
  decides: [send-time, segment-membership]
  escalates: [list-purchase, monthly-spend-over-500]
  never: [delete-subscriber-records, share-pii]
```

The parser, the discovery walk, the manifest format, the progressive-disclosure model, and the validator are written once and apply to every kind.

### Kind-Specific Surfaces

Each kind adds what only it needs. These additions live in the frontmatter or body of the typed root file; they never alter the common schema.

**TOOL** — a declaration of a single capability.

```yaml
kind: tool
name: resend-email
type: api                         # api | mcp | local
inputs: ...
outputs: ...
authority:
  never: [send-to-unverified-address, exceed-1000-recipients-per-call]
```

| Type | What it wraps |
|------|--------------|
| `api` | Direct HTTP call to an external service |
| `mcp` | Function exposed by an MCP server |
| `local` | Internal operation (database, filesystem, internal service) |

A tool's `authority.never` block is what other systems call **guardrails** — constraints that travel with the capability regardless of who calls it — expressed here in the same vocabulary as every other layer rather than as a tool-only concept.

The tool-specific folder is `server/`: the implementation itself. For `type: mcp`, that means the MCP server code or the vendored third-party package, any enforcement proxy, and the transport configuration (`mcp.json`); for `type: api`, the client wrapper and endpoint definitions; for `type: local`, the script or binary. The chain's last hop — `TOOL → implementation` — lands inside the tool's own directory, hash-covered by the lockfile like everything else.

One server commonly exposes many capabilities, and a tool is a declaration of *one*. The pattern for that is lateral composition, same as everywhere else in the chain: the directory's `TOOL.md` is the **connector** — provenance, transport, shared context, and the `server/` folder — and each capability is a small single-file sub-tool (`insights.md`, `update-budget.md`) that `requires` the connector. Skills require the capability files, never the connector directly. Each capability carries only its own `never`; the connector carries what applies to the whole transport. A genuinely single-capability tool collapses the pattern: one `TOOL.md`, its `server/`, done.

**SKILL** — a procedure. Fully compatible with the [agentskills.io specification](https://agentskills.io/specification): YAML frontmatter, progressive disclosure (catalog metadata ~100 tokens, full instructions on activation, supporting files on demand), `SKILL.md` at root with optional `scripts/`, `references/`, `assets/`. For kind `skill`, the edge field MAY be spelled `allowed-tools` per agentskills.io; the resolver treats `allowed-tools` and `requires` as the same field. Compatible with SEP-2640: a skill directory maps directly to `skill://` Resources, with `SKILL.md` as the root resource.

**ROLE** — an organizational function. Adds one field:

```yaml
watches: [open-rates, unsubscribe-spikes, deliverability-warnings]
```

Everything else a job description traditionally contains — what the role owns, what it decides autonomously, when it escalates to a human, what it explicitly does not own — is the common `authority` block. The role-specific folder is `decisions/`, a log of escalations and their outcomes.

**AGENT** — an implementation that fills one or more roles. For kind `agent`, the edge field MAY be spelled `fills`; the resolver treats `fills` and `requires` as the same field. An agent does not independently declare skills — it fills roles, and roles carry the skill references. The agent-specific folder is `memory/`, state that persists between activations. The body of `AGENT.md` carries runtime operating context: environment, constraints, how to reach dependencies.

---

## The Authority Block

This is the unification that matters most. Agent systems tend to define the same concept several times under several names: **guardrails** on tools, **"does not own"** statements on roles, **escalation thresholds** on agents. All three are bounded authority. A guardrail is a does-not-own statement about an operation. An escalation threshold is a does-not-own statement about a decision. This convention defines bounded authority once and requires it at every layer.

```yaml
authority:
  owns:       # domains this node is responsible for
  decides:    # actions taken autonomously, no escalation
  escalates:  # actions requiring a human (or owning role) to decide
  never:      # actions forbidden regardless of who is asking
```

The identifiers inside these fields — `subscriber-list`, `send-time`, `share-pii` — are **nouns and actions of the organization's domain**. In this specification they are opaque strings; the convention does not yet validate what they refer to. This is a known gap, addressed in [Addendum A](#addendum-a--nouns).

### The Intersection Rule

Authority **composes by intersection down the chain**. A layer can only narrow what it inherits — never widen it.

- `never` accumulates by union: every `never` declared anywhere along the path `AGENT → ROLE → SKILL → TOOL` applies. A role cannot loosen a tool's `never`. An agent cannot loosen anything.
- `decides` composes by intersection: an action is autonomous only if every layer along the path that declares `decides` includes it.
- `escalates` accumulates by union: any layer can add an escalation trigger; none can remove one declared above or below it.
- Precedence is fixed: **never > escalates > decides**. If an action matches a `never` anywhere, it is forbidden, even if a `decides` elsewhere names it.

### The Default Disposition

What about an action mentioned nowhere? The problem statement of this proposal is that agents either fill every vacuum or wait for instructions that never come. The authority model resolves this by choosing the middle as the default:

> **An action not covered by any `decides`, `escalates`, or `never` along the active path defaults to `escalates`.**

Unlisted is not forbidden and not permitted — it is *asked about*. This makes the vacuum self-documenting: every default-escalation is a signal that a role definition has a gap, and the `decisions/` log of the owning role records how the gap was resolved. Over time, the org chart converges on reality the same way human job descriptions do — by escalations becoming precedents becoming policy. Richer dispositions (explicit deny-by-default regimes, visibility classes) are deliberately deferred; see [Addendum B](#addendum-b--allow--deny--secret).

### What This Buys

Because the field is uniform and the composition rule is mechanical, boundaries stop being prose discipline and become checkable:

- **Conflict detection.** Two roles claiming the same entry in `owns` is a validation error, caught statically, before any agent runs.
- **Handoff tables.** The point where one role's `decides` ends and a sibling's begins can be computed, not inferred from careful reading.
- **Provable floor.** It is statically provable that no agent anywhere in the chain can be authorized to do what a tool's `never` forbids — which is the question this whole convention exists to answer: who is responsible when something goes wrong, and what could they have done about it.

---

## Directory Convention

Each node follows the same structural pattern:

```
[node-name]/
├── [kind].json        ← per-directory manifest (one schema, kind-named file)
├── [KIND].md          ← typed root file, common frontmatter
├── references/        ← supporting content loaded on demand
└── [kind-specific]/   ← decisions/ for roles, memory/ for agents,
                          scripts/ + assets/ for skills, server/ for tools
```

**Typed filenames are the identity mechanism.** `SKILL.md` means it's a skill. `ROLE.md` means it's a role. No directory path required. No prefix conventions. Any agent walking a directory reads the filenames and knows what it has — and because every kind shares one schema, it knows how to read them before it knows what kind they are.

### The Manifest

A file at the root of any node directory declaring its canonical composition — regardless of how the files arrived. npm, pip, MCP installs, and human-written files can all land in the same directory; the manifest declares which of them constitute the node.

```json
{
  "kind": "skill",
  "name": "audience-growth",
  "root": "SKILL.md",
  "requires": [
    "../../tools/resend-email.md",
    "../../tools/database-write.md"
  ]
}
```

The manifest schema is identical for every kind; only the filename varies (`skill.json`, `role.json`, `agent.json`, `tool.json`) to preserve the typed-filename identity mechanism. A manifest is optional for a node that is a single file and mandatory for a node that is a directory.

### The Universal Entry Point

README.md is the convention every reader — human, LLM, scheduled process — already knows to read first. Rather than expanding `AGENTS.md` into a general context file or inventing new entry-point filenames, README.md is the entry point into any directory's operating context.

`AGENTS.md` is not a coder's file. It is not a thinker's file either. If a file needs to speak to every possible agent type, it's already called README.md.

The README has a second property: it is **excluded from node identity** (see The Lockfile, below). The typed root file and manifest are the node; the README is narrative *about* the node. Agents may regenerate READMEs from the node graph as part of their work without changing what anything *is*.

---

## The Lockfile

The repository root contains `agents.lock`, a generated file that pins every node in the resolved reference chain to an exact location and a content hash.

```json
{
  "lockfileVersion": 1,
  "nodes": {
    "audience-manager": {
      "kind": "role",
      "resolved": "file://./roles/audience-manager",
      "integrity": "sha256-9f2c…",
      "requires": ["audience-growth", "list-hygiene"]
    },
    "audience-growth": {
      "kind": "skill",
      "resolved": "skill://audience-growth",
      "integrity": "sha256-b71a…",
      "requires": ["resend-email", "database-write"]
    },
    "resend-email": {
      "kind": "tool",
      "resolved": "file://./tools/resend-email.md",
      "integrity": "sha256-44d0…",
      "requires": []
    }
  }
}
```

Rules:

1. **Generated, never hand-edited.** A resolver walks every `AGENT.md`, follows `requires` transitively, and emits the lock. The resolver is the only tool this convention requires beyond a text editor, and a repository without a lockfile is still a valid (merely unpinned) repository.
2. **Committed.** The lockfile is the auditable record of exactly which organizational structure was in force at any commit. `git log agents.lock` is the history of the org chart.
3. **The integrity hash covers node identity, not node narrative.** Hash inputs: the typed root file, the manifest, and the contents of `references/`, `scripts/`, and `assets/`. Excluded: `README.md` (narrative, regenerable) and `memory/` and `decisions/` (runtime state, mutable by design).
4. **Drift detection.** If any file inside a node's identity changes — whether by a human, an agent, or a package manager — the hash no longer matches and the lock is stale. An agent modifying its own skills is not prevented; it is *detected*, and the change does not take effect in a pinned deployment until the lock is regenerated and committed.
5. **Third-party nodes are vendored and pinned.** A skill installed by pip, fetched from an MCP server, or copied from another repository enters the lock with its source URI and hash like any other node. The directory you don't control is wrapped by a manifest you do, and the hash makes its contents tamper-evident.

The lockfile is the entire versioning story. There are no semver ranges, no registry, no constraint solver. One generated file answers independent tool versioning (pin by hash), third-party coexistence (vendor and pin), and the mutating-README question (narrative excluded from identity, everything else drift-detected).

---

## Repository Structure

```
/
├── README.md              ← universal entry point
├── agents.lock            ← generated; pins the resolved chain
├── roles/                 ← kind: role
│   └── [role-name]/
│       ├── role.json
│       ├── ROLE.md
│       ├── references/
│       └── decisions/
├── skills/                ← kind: skill
│   └── [skill-name]/
│       ├── skill.json
│       ├── SKILL.md
│       ├── scripts/
│       ├── references/
│       └── assets/
├── tools/                 ← kind: tool
│   └── [tool-name]/
│       ├── tool.json
│       ├── TOOL.md        ← the connector: provenance, transport, shared context
│       ├── references/
│       ├── server/        ← the implementation: MCP server code, vendored
│       │                     packages, proxy, transport config (mcp.json)
│       └── [capability].md  ← optional single-file sub-tools, one per
│                               capability, each requiring the connector
└── agents/                ← kind: agent
    └── [agent-name]/
        ├── agent.json
        ├── AGENT.md
        ├── references/
        └── memory/
```

The top-level folders are a convenience, not a requirement. Identity comes from typed filenames and the lockfile, not from paths — a role found anywhere in the tree is still a role. Reorganize freely; regenerate the lock.

---

## Structural Isomorphism with MCP

An MCP server manifest declares five components. A node directory contains the same five, expressed as files and folders:

| MCP Manifest Component | Node Equivalent |
|---|---|
| `name` | `name` in manifest and frontmatter |
| `description` | `description` in frontmatter |
| `tools` | `requires` references resolving to kind: tool |
| `resources` | Files in `references/` — loaded on demand |
| `prompts` | Files in `assets/` — templates and structured formats |

The body of the typed root file is the server instructions — the prose loaded at initialization that tells any connected agent how to operate in this context.

MCP is a location with data. So is a node directory. The transport — stdio, HTTP, local filesystem — is how you reach the location. The location has the same shape regardless of how you arrived. Because the four layers collapse into one primitive, this is true of the *entire hierarchy*, not just skills: `skill://audience-manager/ROLE.md` is a perfectly well-formed SEP-2640 resource. Serving an organization over MCP requires no structural change, because the organization is already organized the way a server is.

### Self-Similarity Down the Chain

A skill orchestrating sub-skills does not merely *look* structurally identical to an agent orchestrating roles — they are the same type. A complex skill that grows sub-skills becomes an agent by editing one frontmatter field. One discovery mechanism, one manifest format, one progressive-disclosure model, one authority algebra — at every level, because there is only one level, repeated.

### Remote Agents

Just as a TOOL can point to a remote MCP server, an AGENT can be remote. Remote agents are contacted through the de facto standard of the OpenAI-compatible API layer — the same HTTP interface used by any language model host.

A remote node entry resolves in the lockfile like any other: a URI and, where the remote supports it, an integrity hash of its declared contract. The reference chain does not know or care where a node lives — local file, containerized service, or third-party hosted model. What matters is the contract: the kind it declares, the authority it carries, the requires it exposes.

```
AGENT → ROLE(s) → SKILL(s) → TOOL(s) → [local | MCP server | API endpoint]
```

Enforcement of authority at runtime — a gateway that intersects the authority blocks of everything mounted and refuses calls outside the result — is something a *host* builds on top of this convention. The convention defines the shape and the semantics; MCP and the API layer define the transport; enforcement is deliberately left to deployments. This mirrors the boundary the Skills Over MCP Working Group drew from the other side: they scoped transport in and bundle packaging out; we scope shape and semantics in and transport out.

---

## Relationship to Existing Standards

| Layer | Standard | This Proposal |
|-------|----------|---------------|
| TOOL | MCP tool schemas | Compatible — `TOOL.md` adds the `authority` block to the JSON-schema pattern |
| SKILL | agentskills.io | Adopted — frontmatter, progressive disclosure, directory structure; `allowed-tools` honored as the skill-kind spelling of `requires` |
| SKILL transport | SEP-2640 (Resources-based) | Compatible — every node, not just skills, maps to `skill://` URIs |
| ROLE | None | New — organizational ownership layer; no existing standard covers this |
| AGENT | AGENTS.md (partial, coder-focused) | Extended — any agent type, fills multiple roles |
| Versioning | npm/cargo lockfiles (prior art) | Adopted in minimal form — `agents.lock`, hashes only, no ranges or registry |

The ROLE layer, the unified authority algebra, and the lockfile are what this proposal adds to the landscape.

---

## What This Is Not

This is not a new protocol. It does not compete with MCP or agentskills.io. It is a directory and file convention — a human-readable, machine-parseable organizational spec that sits above the transport layer and gives the layers beneath it a coherent structure to reference.

It is not an enforcement system. The authority block is checkable and the lockfile is tamper-evident, but nothing here prevents a misbehaving host from ignoring both. Enforcement is a deployment concern; this convention makes enforcement *possible* by making authority machine-readable.

It is not finished. Two known gaps are documented as addendums below rather than solved in the main specification, because solving them now would trade the convention's core property — adoptable with a text editor, auditable with `git diff` — for ceremony the problem may not yet warrant.

---
---

# Addendum A — NOUNs / ENTITIES / ONTOLOGY

*Status: proposed, not yet part of the convention. Adopt when authority vocabularies stabilize.*

## The Gap

The authority block is built from identifiers: `owns: [subscriber-list]`, `decides: [send-time]`, `never: [share-pii]`. The main specification treats these as opaque strings. That is a real hole, and it is load-bearing:

- **Conflict detection depends on canonical names.** Two roles claiming `audience` and `subscriber-base` may or may not be a conflict — the validator cannot know, because nothing says whether those are the same thing.
- **Ambiguity hides in compound nouns.** Does `newsletter` mean the publication, an individual issue, the template, or the sending infrastructure? A role that `owns: [newsletter]` and a role that `decides: [newsletter-content]` have an undefined relationship.
- **Authority over a thing requires the thing to exist somewhere.** `subscriber-list` lives in an actual system — a database table, a SaaS object. Nothing in the convention records where, which means "who owns this domain" never connects to "where this domain physically is."

The four kinds are the organization's **verbs** — what acts, and through what procedure. The strings inside authority blocks are its **nouns** — what is acted upon. The verbs are specified; the nouns are folklore.

## The Sketch

A fifth kind, fitting the existing primitive without modification:

```yaml
# nouns/subscriber-list/NOUN.md
kind: noun
name: subscriber-list
description: The canonical set of people who have opted in to receive mail.
system-of-record: postgres://main/subscribers     # where it actually lives
states: [pending, confirmed, unsubscribed, suppressed]
relationships:
  has-many: [segments]
  distinct-from: [purchased-lists]                # explicitly NOT this
classification: restricted                        # reserved; see Addendum B
```

Nouns get a `/nouns/` top-level folder, typed `NOUN.md` root files, manifests, and lockfile entries — the same anatomy as everything else, because there is only one anatomy. Nouns do not participate in the execution chain; they are its objects, not its links. Their `requires` is replaced by `relationships`, because nouns reference each other laterally, not downward.

Note the `distinct-from` field: a noun definition can do for vocabulary what `never` does for authority — declare the negative space. `subscriber-list` is *not* `purchased-lists` is exactly the kind of boundary that prevents two agents from politely corrupting each other's domains.

## The Validation Rule (when adopted)

> Every identifier appearing in any `authority` field MUST resolve to a `kind: noun` node, either by exact name or by a declared alias.

With this rule active, conflict detection becomes sound instead of lexical, the handoff table becomes a join over real objects, and `system-of-record` connects organizational ownership to physical location — when something goes wrong in a database, the path from table to noun to owning role to responsible human is a lookup, not an investigation.

## Why It Is an Addendum

Ceremony cost, and sequencing. Requiring a defined noun for every authority string on day one means an org must build its ontology before it can write its first role — the same trap that makes enterprise data-governance projects die in committee. The adoption path should be gradual:

1. **Now:** authority strings are opaque; pick names as if they will become nouns
2. **Lint level:** the resolver warns on authority strings that don't resolve to a noun, and emits a stub `NOUN.md` skeleton for each unknown — the vocabulary documents itself out of the gaps
3. **Strict level:** the validation rule above, per-repository opt-in

The gaps found at lint level are themselves the discovery mechanism: every warning is a noun the organization uses but has never defined, which is useful information about the organization independent of any agent.

---

# Addendum B — Allow / Deny / Secret

*Status: deliberately deferred. The reserved surface is defined now so later adoption does not break existing repositories.*

## What the Authority Block Already Is

The authority block is, on inspection, a three-verdict access-control policy:

| Classical term | Authority field | Composition |
|---|---|---|
| allow | `decides` | intersection down the chain |
| deny | `never` | union down the chain; deny wins |
| (no classical equivalent) | `escalates` | union; the verdict classical systems lack |
| default disposition | unlisted → `escalates` | the middle, by design |

This is deliberate. Classical allow/deny systems force every unanticipated case into one of two wrong answers: default-allow (agents fill every vacuum) or default-deny (agents wait for permissions that never come). The third verdict — *ask* — is the organizational primitive that ACLs never needed because humans escalate naturally. Agents don't; the convention makes them.

So the question is not whether this convention has an authorization model — it has one, with fixed precedence (`never` > `escalates` > `decides`) and a monotone composition rule. The question is what the classical world has that it lacks, and whether it is too early for it.

## What Is Missing, and What Is Too Early

**Subjects and clearances.** Authority here attaches to nodes in the chain; there is no notion of *who is asking* beyond chain position. Real organizations eventually need: this agent may use this skill, but only against nouns below a given sensitivity. That is a clearance model.

**Secrecy.** Allow/deny governs what you may *do*. Secret governs what you may *know exists*. In progressive-disclosure terms: should a node's catalog entry even mention `acquisition-target-list` to a reader with no business knowing the company has one? The mechanism is already present — progressive disclosure *is* a visibility system — but the convention discloses by relevance, not by sensitivity.

**Why deferred.** Two reasons, one principled and one practical. Principled: this convention's enforcement stance (see What This Is Not) is that it makes policy machine-readable and leaves enforcement to hosts; a `secret` classification that is readable by anyone with repository access is not a secret, and making it one requires encryption, split repositories, or a policy-serving layer — infrastructure that contradicts "adoptable with a text editor." Practical: the organizations this convention targets today have the *boundary* problem (who decides what) far more acutely than the *clearance* problem (who may know what). Solving the second before the first is how access-control projects consume years.

## The Reserved Surface

To keep today's repositories forward-compatible, two fields are reserved now and ignored by current tooling:

```yaml
# On any noun (requires Addendum A):
classification: public | internal | restricted | secret

# On any agent:
clearance: public | internal | restricted | secret
```

With the future rule, stated here only so the reserved fields have defined meaning:

> A node may not appear in the resolved chain of an agent whose `clearance` is below the `classification` of any noun in that node's authority block, and catalog-level disclosure (the ~100-token metadata layer) MUST omit such nodes entirely.

When adopted, the natural compile target is an existing policy engine (Cedar, OPA): the authority blocks, noun classifications, and agent clearances compile to policy; the engine enforces at the gateway; the files remain the source of truth. The convention stays files. The enforcement stays someone else's excellent problem.

## The Dependency Order

Addendum B requires Addendum A. Classification attaches to nouns; without a noun layer there is nothing to classify but strings. This is the strongest practical argument for the adoption path in Addendum A: organizations that anticipate needing secrecy should begin lint-level noun discovery early, because the vocabulary is the prerequisite for the clearance model, and vocabularies take longest to stabilize.

---

