---
type: oaa/Skill
kind: skill
name: monitor-signups
description: SOP for measuring Machincy signup health via machincy-grokbot - recent volume, welcome_sent gaps, status mix, and anomalous patterns. Read-only; never registers, resubscribes, or changes subscriber status.
allowed-tools:
  - ../../tools/machincy-grokbot
---

# Skill: Monitor Signups

Daily (or on-demand) measurement of the signup funnel. Produces a **signup-health packet** for evaluate-and-flag-issues / compose-ops-digest. Does not own welcome dispatch or status changes - those belong to signup-monitor and related roles.

## Workflow

1. **Establish the window.** Prefer the last 24 hours unless the run instructions specify another range. Record `window_start` / `window_end` in the packet.

2. **List subscribers.** Call `machincy-grokbot__list_subscribers` (and paginate if needed) for the window. Where the API supports filters, use `status` and presence/absence of `welcome_sent_at` to avoid pulling the entire history on every run.

3. **Compute the packet fields:**
   - `new_signups_count` - rows created in the window
   - `active_count` / `unsubscribed_count` / `quarantined_count` / `ignore_count` - by status in the sample or window
   - `welcome_not_sent_count` - active (or new) rows with null `welcome_sent_at`
   - `anomalies` - empty array, or short strings such as:
     - volume far above/below the role's expected daily baseline (if baseline is in memory or run instructions)
     - welcome gap above threshold (e.g. more than N new actives without welcome)
     - sudden quarantined/ignore spike

4. **Pass / fail for the skill itself.** A skill-level failure is only tool failure: non-2xx, timeout, or unparseable body on list_subscribers. Empty result set is a pass (quiet day). On tool failure, do not invent counts - escalate tool failure and stop.

5. **Emit the signup-health packet** (structured summary for the parent role). Do not call register, resubscribe, PATCH signup, or any write. Do not send email.
