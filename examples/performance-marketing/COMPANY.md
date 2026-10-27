# Performance Marketing Company Map

<!-- GENERATED - do not hand-edit. Regenerate by running compile-company-map.prompt.md. -->

This document maps the OAA agent graph for human readers, so nobody has to open node files to see who owns what. Authority and accountability live at the role level: agents only fill roles, and every boundary below comes from a role's or a tool's frontmatter.

## Role to Agent Mapping

| Agent | Role | Schedule |
|---|---|---|
| ads-manager | account-sentinel | `0 8,14,20 * * *` |
| ads-manager | budget-steward | `0 8,14,20 * * *` |
| ads-manager | creative-manager | `0 8,14,20 * * *` |

## Roles

### account-sentinel

It owns `meta-ad-account-health`. It decides nothing on its own. It escalates to a human on `account-policy-violation-detected`, `unusual-spend-pattern-detected`, `api-error-rate-above-threshold`, `billing-issue-detected`. It is never permitted to: `modify-any-campaign-setting`, `modify-campaign-budget`, `modify-ad-creative`. It is implemented by the [performance-audit](#performance-audit), [account-monitoring](#account-monitoring) skills, and is filled by the ads-manager agent.

### budget-steward

It owns `campaign-budgets`, `cpa-targets`. It decides `budget-increase-within-20pct-per-24h`, `budget-decrease-any-amount`, `pause-campaign-below-cpa-floor`. It escalates to a human on `budget-increase-over-20pct-per-24h`, `cpa-target-change`. It is never permitted to: `modify-ad-creative`, `modify-targeting`, `activate-paused-campaign-without-approval`. It is implemented by the [budget-pacing](#budget-pacing), [performance-audit](#performance-audit) skills, and is filled by the ads-manager agent.

### creative-manager

It owns `ad-creatives`, `creative-rotation`. It decides `pause-ad-above-frequency-ceiling`, `swap-creative-within-approved-brief`. It escalates to a human on `launch-new-creative-without-approved-brief`, `modify-targeting-on-any-ad`, `activate-paused-campaign`. It is never permitted to: `modify-campaign-budget`, `set-campaign-budget`, `delete-campaign`. It is implemented by the [launch-campaign](#launch-campaign), [performance-audit](#performance-audit) skills, and is filled by the ads-manager agent.

## Skills

Skills are the only place tools are invoked; no role or agent calls a tool directly.

#### account-monitoring

Checks Meta ad account health - policy status, billing flags, API error rates, and unusual spend patterns outside normal campaign bounds. Tools: meta-ads.

#### budget-pacing

Adjusts daily campaign budgets to maintain on-pace spend; increases or decreases within the bounds declared on the calling role. Tools: meta-ads.

#### launch-campaign

Creates and activates a new campaign on Meta Ads from an approved brief; maps business-domain fields to API vocabulary using the ontology tool map. Tools: meta-ads.

#### performance-audit

Pulls rolling 3-day campaign performance from Meta Ads and computes CPA, CTR delta, and frequency; surfaces campaigns that are below the CPA floor or above the frequency ceiling. Tools: meta-ads.

## Gaps

This section lists every gap-severity finding from the validation run that produced this document - undeclared territory the convention flags but does not forbid. Absence from this section is not a guarantee of completeness beyond what validation actually checked.

- Tool "meta-ads" has an acknowledged enforcement gap (owner: OAA examples, revisit: 2099-01-01): This is an illustrative example. The enforcement proxy and the vendored upstream server are described below but are not built in this repository, and server/mcp.json shows the shape of the transport config only. Node: `tools/meta-ads/TOOL.md`. Rule: Tool Wiring (references/validation.md, section 4).
