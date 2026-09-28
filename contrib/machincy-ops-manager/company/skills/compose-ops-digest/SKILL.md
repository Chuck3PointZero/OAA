---
type: oaa/Skill
kind: skill
name: compose-ops-digest
description: SOP for stitching signup, inbound-email, and platform-health packets plus flagged_issues into one short daily ops digest for the human.
allowed-tools: []
---

# Skill: Compose Ops Digest

## Workflow

1. **Inputs.** signup-health packet, inbound-email packet, platform-health packet, and flagged_issues from evaluate-and-flag-issues.

2. **Structure the digest (in order):**
   - **Red / flagged** — every flagged_issues item, one line each with code + summary
   - **Signups** — new count, welcome gaps, status mix highlights
   - **Inbound email** — open count, oldest age, past-SLA count
   - **Platform** — uptime, security event count, app errors, write integrity
   - **Recommended actions** — only human actions; never imply the Bot will send mail or change data

3. **Tone.** Short. Lead with red. Empty sections can be one line (“Signups: quiet”).

4. **Route.** Post or return the digest to the human conversation (and only to Discord/email if this agent is explicitly given that tool and authority — default is human-facing digest only).

5. **Do not** re-query the API here; do not call write endpoints; do not expand into full row dumps unless a flagged issue requires one id as evidence.
