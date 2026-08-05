# Slide 13 — Install and Run

**Title:** From Zero to Running Agent

---

## Step 1: Install the Skill

```bash
# Universal (any agent host)
npx skills add Chuck3PointZero/OAA --skill '*'

# Claude Code
claude skills add Chuck3PointZero/OAA
```

Once installed, mention OAA or ask to create an agent hierarchy — the skill activates automatically.

## Step 2: Add the MCP Servers (optional, unlocks compile + validate)

```bash
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#v0.5.0:harness
claude mcp add oaa-ontology \
  -- env NODE_OPTIONS=--experimental-sqlite \
  npx -y github:Chuck3PointZero/OAA#v0.5.0:ontology
```

## Step 3: Compile and Run

```bash
# Compile (the AI does this for you via compile_agent)
# → writes AGENTS.md + mcp-config.json

# Run the compiled agent
claude.exe \
  -p "Begin your run." \
  --permission-mode dontAsk \
  --system-prompt-file "company/agents/ads-manager/AGENTS.md" \
  --mcp-config "company/agents/ads-manager/mcp-config.json" \
  --strict-mcp-config
```

## What AGENTS.md Is

`AGENTS.md` is NOT a record of the compile — it **IS the payload**. "Running" an agent means handing that file to an LLM as its complete operating instructions. One trigger → one payload → one autonomous run → exit.

## Team Distribution

Add to `.claude/settings.json` to make the OAA marketplace available to the whole team:

```json
{
  "extraKnownMarketplaces": [{
    "name": "OAA",
    "sourceURL": "https://raw.githubusercontent.com/Chuck3PointZero/OAA/main/.agents/marketplace.json"
  }]
}
```

## Speaker Notes

- `--system-prompt-file` REPLACES Claude Code's default system prompt with the verbatim contents of `AGENTS.md`. Not append — the compiled agent is exactly and only what AGENTS.md says.
- `--strict-mcp-config` scopes this run to only the tools AGENTS.md names, isolated from whatever else sits in the operator's global config.
- `mcp-config.json` is NOT hand-authored — `compile_agent` writes it by merging the `server/mcp.json` of every tool the agent's chain requires.
- Scheduling (cron, Windows Task Scheduler, GitHub Actions) is out of scope for OAA — any host that can run the command above on schedule satisfies the contract.
- v0.4.0 breaking change: agents.lock keys are now resolved paths, not declared name fields. Delete old lockfile and re-run compile_agent.
