# Runner: From Compiled Agent to Running Company

`executor.md` covers what `compile_agent` produces and how `AGENTS.md` is delivered. This file covers the layer above: how a single compiled agent is invoked, how a company of agents runs on schedule, and how agents coordinate at runtime. OAA compiles the payload. The runner host runs it.

---

## Single-agent invocation

The canonical command (PowerShell shown; adapt line-continuation syntax for other shells):

```powershell
claude.exe `
  -p "Begin your run." `
  --permission-mode dontAsk `
  --system-prompt-file "company\agents\<name>\AGENTS.md" `
  --mcp-config "company\agents\<name>\mcp-config.json" `
  --strict-mcp-config
```

| Flag | Effect |
|------|--------|
| `--system-prompt-file` | Replaces Claude Code's default system prompt entirely with `AGENTS.md`. Not appended — the compiled agent is exactly and only what that file says. |
| `--mcp-config` | Loads only the tool servers this agent's chain requires (`compile_agent` writes this file by merging each tool's `server/mcp.json`). |
| `--strict-mcp-config` | Scopes the tool surface to `--mcp-config`. Tools in the operator's global config are not visible to this run. |
| `--permission-mode dontAsk` | Unattended run — no interactive prompts. |
| `-p` | The trigger prompt. `"Begin your run."` is the conventional unattended cue; the agent's own `AGENTS.md` tells it what "run" means. |

One trigger → one payload → one autonomous run → exit.

---

## Running a company (multiple agents)

Each `AGENT.md` carries a schedule:

```yaml
metadata:
  schedule: "0 8 * * *"   # 5-field cron, UTC
```

A scheduler dispatches the single-agent command above per agent when due. Any cron host satisfies the contract:

| Host | Notes |
|------|-------|
| Python cron driver | See "The pattern" below for the minimal shape. |
| Windows Task Scheduler | Direct invocation of the PowerShell command above. |
| GitHub Actions | Cron-triggered workflow per agent, or a matrix over agents. |
| Any other cron | If it can invoke a shell command on a cron expression, it works. |

**OAA does not ship a scheduler.** The trigger layer is deliberately out of scope — schedules are declared in `metadata.schedule`; how they fire is a host concern.

### The pattern

A minimal cron driver has two phases: a compile step that reads schedules from `AGENT.md` files once, and a tick step that dispatches due agents. Never re-parse `AGENT.md` on every tick — treat it as a source file, compile schedules to a runtime artifact, and read only that at runtime.

```python
# Compile — run after any AGENT.md schedule edit
for agent in agents/*/AGENT.md:
    schedule = parse_cron(agent.metadata.schedule)  # 5-field cron, validate
    write schedules.json: {id, name, schedule, enabled, consecutive_errors}
    # Preserve enabled and consecutive_errors for existing ids

# Tick — every N minutes, invoked by cron / Task Scheduler / Actions
for job in schedules.json where enabled:
    if croniter(job.schedule).next(after=last_run) <= now:
        exit_code = dispatch(job.name)  # the single-agent command above
        job.consecutive_errors = 0 if exit_code == 0 else job.consecutive_errors + 1
        if job.consecutive_errors >= 5:
            job.enabled = False         # auto-disable on repeated failure
```

### Failure modes a naive driver misses

- **Schedule drift** — the compile step above turns `AGENT.md` into a runtime artifact; if the source is edited and not recompiled, the driver runs stale. Diff source vs. compiled at CI time.
- **Stale compiled agent** — refuse to launch when the agent's chain hash in `agents.lock` doesn't match its source. The runner is the last gate against a stale prompt reaching the LLM.
- **Global vs per-agent lock** — a single global lock serializes independent agents; a per-agent lock lets them run concurrently but prevents the same agent from double-firing.
- **Silent failure** — signal failure in the driver's own exit code. A green Task Scheduler tick where every launch failed fools external monitors.
- **No same-day retry** — a daily-cron agent that fails at 08:00 won't fire again until tomorrow unless the driver retries on transient failure within the polling interval.

---

## How work reaches an agent

An agent runs in response to one of three triggers:

| Trigger | Source | Typical use |
|---|---|---|
| Schedule | Cron / Task Scheduler / Actions | The agent's normal shift. |
| Event | Webhook, message, external signal | React outside the normal cadence. |
| On-demand | Human operator or another process | Manual dispatch or targeted rerun. |

Any of the three fires the same single-agent command above. Once running, the agent picks up work from the **tools its role has been granted** — an inbox tool for a support role, a metrics-store tool for a monitor role, an escalation-log tool where one role hands off to whichever role reads that log. The tool's own storage — inbox, table, queue, file, ticket system — holds the pending work; when one role's tool writes to a store, any downstream role whose tool reads from that store picks it up on the next run. Agents don't call each other; there is no message queue owned by OAA.

---

## Escalation routing

When a role escalates, the escalation is a write to a shared escalation sink. OAA defines **what** escalates via each role's `escalates:` field; the runner host defines **where** it goes:

| Sink | Typical use |
|------|-------------|
| Database table | Escalation log queried by a review dashboard. |
| File (JSONL) | Simple append-only audit trail. |
| Notification channel | Discord webhook, Slack, email, PagerDuty — anything an operator sees. |

Document your escalation sink in `CLAUDE.md` at the OAA wrapper root so every agent's runtime knows the address.

---

## Out of scope for OAA

The following are runner-host concerns, not OAA primitives:

- **Scheduling infrastructure** — cron drivers, Task Scheduler, CI cron.
- **Escalation sinks** — where `escalates:` writes actually go.
- **Gateway/broker between `claude.exe` and tool servers** — the layer that enforces `never` rules at the tool-call boundary for `executor: remote` agents (see [authority-model.md](authority-model.md)).
- **Inter-agent transport** — the shared database is a convention, not an OAA-owned artifact.
- **Run history and per-agent watermarks** — the scheduler's job, not the compiler's.

OAA compiles the payload. The host runs it.
