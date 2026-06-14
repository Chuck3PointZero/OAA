# Worked Example: Meta Ads Manager

A condensed real case exercising every pattern in this skill: one agent, three roles, four skills (one shared), and one named tool. Use it as the shape to imitate, not content to copy.

## The Graph

```
agents/ads-manager                          fills 3 roles; declares no authority

roles/budget-steward                        owns: campaign-budgets, cpa-target
  requires → skills/performance-audit       shared skill, required directly by the role
  requires → skills/budget-pacing

roles/creative-manager                      owns: ad-creatives, creative-rotation, audience-placements
  requires → skills/performance-audit       same node, deduplicated in the lock
  requires → skills/creative-rotation

roles/account-sentinel                      owns: meta-ad-account-health; decides: []  ← pure watcher
  requires → skills/performance-audit       same node, deduplicated in the lock
  requires → skills/account-health-audit

skills/performance-audit    allowed-tools → tools/meta-ads
skills/budget-pacing        allowed-tools → tools/meta-ads
skills/creative-rotation    allowed-tools → tools/meta-ads
skills/account-health-audit allowed-tools → tools/meta-ads

tools/meta-ads/TOOL.md      server/ → Meta Marketing API
```

Why three roles: the original single role mixed three accountabilities whose escalations different humans review — spending money, making creative, watching the account. `owns` lists are disjoint by construction. The watcher role's empty `decides` is intentional: watching the actors' domain is *someone's job*, and the conflict checker stops the actors from absorbing it.

Why a shared skill: all three roles reason from the same metrics (rolling 3-day CPA, week-over-week CTR delta, frequency). `performance-audit` defines them once; all three roles require it directly; the resolver deduplicates it to one lockfile entry.

## The Tool (named tool pattern)

```
tools/meta-ads/
├── TOOL.md          ← provenance, all never rules consolidated
└── server/
    ├── mcp.json     ← transport config (env var NAMES only)
    ├── proxy/       ← enforcement layer; applies every never
    └── vendor/meta-ads-mcp/   ← vendored, hash-pinned
```

```yaml
kind: tool
name: meta-ads
type: mcp
env: META_ACCESS_TOKEN
provenance:
  source: github.com/pipeboard-co/meta-ads-mcp
  status: third-party
  vendored: server/vendor/meta-ads-mcp
  pinned-in: agents.lock
authority:
  never:
    - daily-budget-over-200
    - lifetime-budget-over-5000
    - activate-without-human-approval
    - create-with-active-status
    - modify-targeting-on-any-campaign
```

All `never` rules are consolidated on one node. Skills reference this tool directly; no capability split is needed because all four skills use the same tool and the `never` rules are short enough to read at a glance.

When to use the connector/capability split instead: if `budget-pacing` had a `never` that would incorrectly block `account-health-audit` (which only reads), split then. The single named tool is the right default — split only when constraints diverge across skills.

## Effective Authority (resolver output, shown for review)

| Situation | Verdict | Why |
|---|---|---|
| Raise daily budget $100 → $110 | autonomous | role `decides` (≤20%/24h), under tool's $200 `never` |
| Raise $100 → $130 | escalate | role `escalates` (>20%) |
| Set $250/day | forbidden | tool `never`; no role can widen |
| Pause ad at CTR 0.8% | autonomous | creative-manager `decides` |
| Activate the ad it just drafted | forbidden → human | tool `never` (`activate-without-human-approval`) |
| Modify targeting | forbidden | tool `never` (`modify-targeting-on-any-campaign`) |
| Account policy flag | escalate | account-sentinel `escalates` |
| Same call fails 3× | escalate | skill `escalates`, by union |
| Duplicate campaign to new geography | escalate | listed nowhere → default disposition; logged in `decisions/` |

## Lockfile Shape (abbreviated)

```json
{
  "ads-manager":          { "kind": "agent",  "requires": ["budget-steward", "creative-manager", "account-sentinel"] },
  "budget-steward":       { "kind": "role",   "requires": ["performance-audit", "budget-pacing"] },
  "creative-manager":     { "kind": "role",   "requires": ["performance-audit", "creative-rotation"] },
  "account-sentinel":     { "kind": "role",   "requires": ["performance-audit", "account-health-audit"] },
  "performance-audit":    { "kind": "skill",  "requires": ["meta-ads"],  "← appears ONCE despite 3 parents": "" },
  "budget-pacing":        { "kind": "skill",  "requires": ["meta-ads"] },
  "creative-rotation":    { "kind": "skill",  "requires": ["meta-ads"] },
  "account-health-audit": { "kind": "skill",  "requires": ["meta-ads"] },
  "meta-ads":             { "kind": "tool",   "resolved": "file://./company/tools/meta-ads",
                            "upstream": "https://github.com/pipeboard-co/meta-ads-mcp",
                            "vendored": "file://./company/tools/meta-ads/server/vendor/meta-ads-mcp",
                            "integrity": "sha256-… (covers TOOL.md + server/)" }
}
```

## Lessons to Generalize

1. Constraints appear once: $200 ceiling on the tool; 20% rule on one role; nowhere else.
2. Shared skills are required by roles, not by peer skills — edges only flow downward.
3. The agent is one line per role and nothing more — splitting it later is moving a `fills` line.
4. Named tool is the default; connector/capability split is a deliberate choice, not the starting point.
5. Dangerous-but-possible beats the alternative orderings: `never` (forbidden) > `escalates` (asked) > `decides` (bounded grant). Choose the strongest level the workflow tolerates.
6. Provenance is frontmatter on the tool, not a README footnote — it gets hashed.
