---
type: oaa/Skill
kind: skill
name: monitor-inbound-email
description: SOP for measuring inbound support/fan email backlog via machincy-grokbot. Read-only; never triages, replies, or dispatches outbound mail.
allowed-tools:
  - ../../tools/machincy-grokbot
---

# Skill: Monitor Inbound Email

Measures the inbound queue that support-inbound-reviewer works. Produces an **inbound-email packet**. Does not classify lanes or send replies.

## Workflow

1. **List inbound.** Call `machincy-grokbot__list_inbound_emails` (oldest-first or as API default). Prefer open / untriaged / unreplied rows if the API exposes status filters; otherwise take a recent page and classify from row fields.

2. **Compute the packet fields:**
   - `open_count` — not yet resolved
   - `oldest_open_age` — age of the oldest open row (or null if none)
   - `past_sla_count` — open rows older than the SLA in run instructions or role default (e.g. 24h or 48h)
   - `sample_ids` — up to a few open row ids for the human (not full bodies unless needed)
   - `anomalies` — e.g. backlog past SLA, sudden volume spike

3. **Bounce / complaint signals.** If bounce or complaint state is only visible via subscriber status or separate admin lists already available on machincy-api, note spikes in `anomalies`. Do not invent webhook processing — capability D is ingress, not this skill’s job.

4. **Skill-level failure.** Non-2xx, timeout, or unparseable list body → escalate tool failure; do not emit fake backlog numbers.

5. **Emit the inbound-email packet.** Never call triage write, reply, or bulk dispatch endpoints.
