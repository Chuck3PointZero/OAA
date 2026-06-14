# The Authority Model

Bounded authority is the convention's load-bearing idea. This file is the complete algebra. Read it fully before writing or auditing any `authority` block.

## The Block

```yaml
authority:
  owns:       # domains this node is accountable for (role-centric; rare on other kinds)
  decides:    # actions taken autonomously, no escalation
  escalates:  # actions a human (or the owning role) must decide
  never:      # actions forbidden regardless of who asks — including humans asking the agent
```

Omit any field with no content. Every identifier is a lowercase, hyphenated string naming a domain noun or action; reuse identifiers exactly across files — they are future `NOUN.md` candidates and the conflict checker matches them lexically until the noun layer is adopted.

## Composition Rules

Given an active path `AGENT → ROLE → SKILL → … → TOOL`:

1. **`never` — union.** Every `never` declared by any node on the path applies. Nothing removes a `never`; not a role above it, not a human instruction routed through the agent. (Humans act outside the chain — directly in the underlying system — or formally amend the declaring node through review.)
2. **`decides` — intersection.** An action is autonomous only if every node on the path that declares a `decides` includes it. Nodes that declare no `decides` are transparent — they neither grant nor block.
3. **`escalates` — union.** Any node may add a trigger; none may remove one.
4. **Precedence: `never` > `escalates` > `decides`.** A match in a stronger field wins regardless of weaker matches elsewhere.
5. **Default disposition: escalate.** An action matching nothing on the path is neither permitted nor forbidden — it is asked about. Log every default escalation in the owning role's `decisions/` folder; each is a missing line in a role definition.
6. **Monotone narrowing.** A node may only narrow inherited authority. Any edit that would widen authority relative to a node lower in the chain is invalid at the widened node — fix it by amending the lower node (a reviewed change), never by overriding above.

## Placement Discipline

One constraint, one layer. The composition rules propagate it; duplication creates divergent copies.

| Constraint type | Layer | Field |
|---|---|---|
| Hard ceiling, irreversibility guard, safety invariant | tool (capability) | `never` |
| Transport-wide rule (applies to every capability of a server) | tool (connector) | `never` |
| Decision right with bounds | role | `decides` |
| Human-judgment threshold | role | `escalates` |
| Explicit non-ownership (another role's domain) | role | `never` |
| Failure handling intrinsic to a procedure | skill | `escalates` |
| Anything | agent | *(declare nothing)* |

## Worked Composition

Path: `ads-manager → budget-steward → budget-pacing → meta-ads-update-budget`

```yaml
# role budget-steward          # skill budget-pacing        # tool update-budget
decides:                        escalates:                    never:
  - budget-change-within-         - repeated-tool-failure       - daily-budget-over-200
    20pct-per-24h
escalates:
  - budget-change-over-20pct
  - cpa-3day-average-over-35
```

| Proposed action | Verdict | Rule applied |
|---|---|---|
| +10% to a $100/day budget | autonomous | in role `decides`; no `never` or `escalates` match |
| +25% to a $100/day budget | escalate | role `escalates` (union) outranks nothing — no `decides` match anyway |
| set $250/day | forbidden | tool `never` (union); precedence over everything |
| +10% but the call failed twice already, third attempt fails | escalate | skill `escalates` (union) |
| archive an old campaign | escalate | matches nothing → default disposition |

## Auditing an Existing Block

When reviewing, check in this order:

1. Any identifier appearing in two roles' `owns` → **error** (ownership conflict).
2. Any `decides` entry that semantically overlaps a `never` anywhere downstream → **error** (dead grant; the `never` wins, so the grant misleads).
3. The same constraint stated at two layers → **warning** (drift risk; keep the owning layer's copy).
4. Authority fields on an agent → **warning** (almost always belongs on a role).
5. Prose in any body describing permissions absent from every frontmatter field → **gap** (prose does not compose; lift it into the block or strike it).
6. Identifier spelling variants ("campaign-budget" vs "campaign-budgets") → **warning** (breaks lexical conflict checking).
