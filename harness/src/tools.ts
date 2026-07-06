import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import {
  compileAgent,
  validateGraph,
  getAgentStatus,
  resolveChain,
} from "./compiler.js";
import type { ValidationFinding } from "./types.js";

// ---------------------------------------------------------------------------
// Compact prompt template — embedded so the package works when installed via
// npm or GitHub without the skill assets directory present on disk.
// Source: skills/org-agent-architecture/assets/prompts/compact-prompt-system-prompt.md
// ---------------------------------------------------------------------------

const COMPACT_PROMPT_TEMPLATE = `You compile a task-execution prompt for a SMALL local language model acting as an autonomous
agent. You will be given a compiled AGENTS.md (identity, roles, skills, tools, composed
authority/never-list, required environment) for one agent. Produce a short, blunt,
rule-based system prompt for that same agent - not a summary of the documentation, a
rewrite from the point of view of "what does this model need to know to act correctly."

## Why this exists

The narrative AGENTS.md is written for a human maintainer and for claude.exe, both of which
handle long, explanatory, rationale-heavy prose without difficulty. Testing found that a small
local model (llama3.1:8b) given that same document verbatim fails in three different ways
across repeated trials: outright refusal (misreading defensive \`never\`-list language as
describing something malicious), garbled hallucinated output instead of a real tool call, and
- worst - calling the WRONG tool with fabricated arguments while narrating a plausible-sounding
justification for having done so. A hand-written replacement of the same content, restructured
around these principles, was reliable across repeated trials. Your job is to generalize that
rewrite, not to summarize or shorten the original text.

## What to ask yourself for every piece of source content

1. Does the model need to know THIS to take its next correct action, or does it only explain
   WHY the system is designed this way? Keep the former. Cut the latter. Design rationale,
   incident history, edge-case philosophy, and cross-references to other roles/agents are for
   the human reading AGENTS.md, not for a model about to make one tool call.
2. Is this a hard constraint (something the agent must NEVER do) or is it descriptive color?
   Hard constraints go in, verbatim, every time - see "Never lose" below. Color gets cut.
3. Is this stated more than once, in different words? State it exactly once, as a short
   imperative rule. Restating the same constraint three ways across a prose document may help
   a human reader; it does not help a small model, which is more likely to follow one clear
   rule than to correctly deduplicate three overlapping ones.
4. Is this an example, an illustration, or a "for instance"? Cut it unless the exact values in
   the example are load-bearing (an enum value, a real threshold, a format string the model
   must reproduce exactly).

## Structure to produce

1. **Identity** - one line: agent name + what it does, in plain terms. Not the full narrative
   description.
2. **Tools** - list every tool this agent can call, by its exact registered name (the same
   name that appears in tools-openai.json / the AGENTS.md Tools section - do not paraphrase or
   shorten it, and do not invent a different name for the same tool). One line per tool, or a
   short list. If the compiled AGENTS.md's Tools section only shows a server-level name without
   the individual function names actually available (this is common - \`allowed-tools\` in this
   OAA model grants a whole MCP server, not individual functions), list the SPECIFIC function
   names actually referenced anywhere in the Roles/Skills narrative text, not the general
   server name - those are the tools this agent's own workflow actually calls.
3. **Rules** - the composed \`never\`-list, verbatim, one item per short imperative line (e.g.
   "Never drop tables." not "This role must never, under any circumstances, execute an action
   that would result in a table being dropped"). Do not add hedging, do not add rationale for
   why each rule exists. If the source names a specific, narrower constraint beyond the
   never-list (e.g. "only call tool X for this workflow, never tool Y even though both are
   technically available"), state that too, as its own rule line.
4. **Workflow** - the actual steps the agent's skills describe, compressed to imperative
   fragments: what to call, what result shape to expect, what to do with each outcome. Keep
   every specific value, threshold, classification label, and format string exactly as
   written. Cut the prose explaining why the workflow is shaped this way (e.g. "this used to
   wait for a streak of 2 but that meant an hour of undetected downtime" - keep only "report on
   first failure, do not wait for a streak" if that's the operative rule; cut the history).
5. **Memory** - only if the agent has a memory schema. List each field name and its type or
   allowed values, one line per field. This is what the model writes to its \`memory_state\`
   block at the end of every run. Omit this section entirely if the agent has no memory schema.
6. **Output contract** - one short line: what the agent should report back and in what shape,
   so the model doesn't ramble past what's needed.

## Never lose

- Every tool name (function-level, not just server-level) the agent's own workflow actually
  calls.
- Every item in the composed \`never\`-list, verbatim.
- Every specific value that changes behavior: enum values, numeric thresholds, status codes,
  format strings, memory field names, environment variable names.
- Every file-based constraint: if the workflow references a file (persona file, known-facts
  list, reference doc), inline the operative rule it enforces rather than the file path.
  A tiny model running in a sandboxed environment cannot read arbitrary filesystem paths;
  give it the constraint directly ("No invented X, Y, Z" or "only values from: A, B, C")
  so it can comply without needing the file.
- The escalation/failure-reporting path if the role has one (what to call and with what
  arguments when something fails).
- Every memory field name from the agent's memory schema, if one exists — the model writes
  these back in its \`memory_state\` block and will invent names if none are given.

Everything else - explanations, history, design tradeoffs, cross-references to sibling
agents/roles, hedging language, restated constraints, illustrative examples with no
load-bearing values - is a candidate for deletion. When in doubt about whether something is a
fact or color, prefer keeping it: an unnecessary sentence costs a little length; a dropped
constraint costs correctness.

## Output

Produce only the compact prompt itself, in the structure above, no preamble, no explanation of
what you did, no markdown headers unless a workflow step genuinely needs a short label.
Optimize for the shortest text that keeps every item under "Never lose." Do not aim for a
specific character count - some agents genuinely need more workflow detail than others; a short
agent should produce a short prompt, a complex multi-skill agent should produce a longer one,
just with none of the narrative weight of the source.`;

// ---------------------------------------------------------------------------
// Tool definitions (passed to MCP server)
// ---------------------------------------------------------------------------

export const toolDefinitions = [
  {
    name: "compile_agent",
    description:
      "Walk the OAA chain for a named agent (AGENT.md → ROLE(s) → SKILL(s) → TOOL(s)), compose authority, write AGENTS.md as a runtime instruction file, merge every required tool's server/mcp.json into one mcp-config.json, and update agents.lock. Required before running an agent.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "The agent name (matches the `name` field in AGENT.md frontmatter).",
        },
        rootDir: {
          type: "string",
          description:
            "Absolute path to the OAA workspace root. Defaults to cwd.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "validate_graph",
    description:
      "Run the OAA validation checklist across the full agent graph. Returns errors (must fix), warnings (should fix), and gaps (decide). Reports verdict: VALID | VALID-WITH-WARNINGS | INVALID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootDir: {
          type: "string",
          description:
            "Absolute path to the OAA workspace root. Defaults to cwd.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_status",
    description:
      "Return the current state of a named agent: whether it has been compiled, last compile time, resolved roles/skills/tools, and recent memory/ entries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The agent name.",
        },
        rootDir: {
          type: "string",
          description:
            "Absolute path to the OAA workspace root. Defaults to cwd.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_ontology",
    description:
      "Return the contents of ONTOLOGY.md if present in the workspace root. The ontology defines shared vocabulary across all agents in the graph.",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootDir: {
          type: "string",
          description:
            "Absolute path to the OAA workspace root. Defaults to cwd.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_compact_prompt_template",
    description:
      "Return the compact-prompt system prompt used for Pass 2 compaction. When compile_agent returns compactNeeded: true (the agent has models: [tiny]), call this tool to get the rewriting instructions, then rewrite AGENTS.orig.md following those instructions and write the result to AGENTS.md.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "run_agent",
    description:
      "Return a named agent's compiled AGENTS.md content, ready to hand to an LLM as its full operating instructions. Execution itself is intentionally out of scope — it depends on which CLI or provider is hosting the run, which this compiler does not assume. See the OAA README's 'Running a Compiled Agent' section for the concrete launch command.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The agent name.",
        },
        rootDir: {
          type: "string",
          description:
            "Absolute path to the OAA workspace root. Defaults to cwd.",
        },
        input: {
          type: "string",
          description: "Initial input or task for the agent.",
        },
      },
      required: ["name"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;

export async function handleTool(
  name: string,
  args: ToolArgs,
  defaultRootDir: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rootDir =
    typeof args.rootDir === "string" ? args.rootDir : defaultRootDir;

  switch (name) {
    case "compile_agent": {
      const agentName = args.name as string;
      if (!agentName) {
        return text("Error: `name` argument is required.");
      }

      try {
        const result = compileAgent(agentName, rootDir);
        const summary = [
          `✅ Compiled agent: ${agentName}`,
          ``,
          `AGENTS.md written to: ${result.agentsPath}`,
          `mcp-config.json written to: ${result.mcpConfigPath}`,
          `agents.lock updated: ${result.lockPath}`,
          ``,
          `Chain:`,
          `  Agent:  ${result.chain.agent.name}`,
          `  Roles:  ${result.chain.roles.map((r) => r.name).join(", ") || "(none)"}`,
          `  Skills: ${result.chain.skills.map((s) => s.name).join(", ") || "(none)"}`,
          `  Tools:  ${result.chain.tools.map((t) => t.name).join(", ") || "(none)"}`,
          ``,
          `Authority composition:`,
          `  owns:     ${result.authority.owns.join(", ") || "(none)"}`,
          `  decides:  ${result.authority.decides.join(", ") || "(none)"}`,
          `  escalates: ${result.authority.escalates.join(", ") || "(none)"}`,
          `  never:    ${result.authority.never.join(", ") || "(none)"}`,
          ...(result.compactNeeded
            ? [
                ``,
                `📋 Pass 2 required: this agent has models: [tiny].`,
                `   AGENTS.orig.md written to: ${result.agentsOrigPath}`,
                `   Call get_compact_prompt_template, rewrite AGENTS.orig.md following those`,
                `   instructions, verify all tool names / env vars / never-list items are`,
                `   present verbatim, then write the compact result to AGENTS.md with`,
                `   "<!-- compacted: see AGENTS.orig.md for the narrative source -->" as the first line.`,
              ]
            : []),
          ...(result.missingMcpConfigs.length > 0
            ? [
                ``,
                `⚠️  Missing server/mcp.json for: ${result.missingMcpConfigs.join(", ")}`,
                `   mcp-config.json was written without these — add each tool's`,
                `   server/mcp.json and recompile before using --mcp-config to run this agent.`,
              ]
            : []),
        ].join("\n");
        return text(summary);
      } catch (e) {
        return text(`Error compiling agent "${agentName}": ${String(e)}`);
      }
    }

    case "validate_graph": {
      try {
        const result = validateGraph(rootDir);
        const lines: string[] = [
          `Verdict: ${result.verdict}`,
          ``,
          `Found ${result.findings.length} finding(s).`,
          ``,
        ];

        const byKind = (severity: ValidationFinding["severity"]) =>
          result.findings.filter((f) => f.severity === severity);

        const errors = byKind("error");
        const warnings = byKind("warning");
        const gaps = byKind("gap");

        if (errors.length > 0) {
          lines.push(`ERRORS (must fix: ${errors.length})`);
          for (const f of errors) {
            lines.push(`  [${f.check}] ${f.file}`);
            lines.push(`    ${f.message}`);
            if (f.fix) lines.push(`    Fix: ${f.fix}`);
          }
          lines.push("");
        }

        if (warnings.length > 0) {
          lines.push(`WARNINGS (should fix: ${warnings.length})`);
          for (const f of warnings) {
            lines.push(`  [${f.check}] ${f.file}`);
            lines.push(`    ${f.message}`);
            if (f.fix) lines.push(`    Fix: ${f.fix}`);
          }
          lines.push("");
        }

        if (gaps.length > 0) {
          lines.push(`GAPS (decide: ${gaps.length})`);
          for (const f of gaps) {
            lines.push(`  [${f.check}] ${f.file}`);
            lines.push(`    ${f.message}`);
          }
          lines.push("");
        }

        if (result.findings.length === 0) {
          lines.push("No findings — graph is VALID.");
        }

        return text(lines.join("\n"));
      } catch (e) {
        return text(`Error validating graph: ${String(e)}`);
      }
    }

    case "get_status": {
      const agentName = args.name as string;
      if (!agentName) {
        return text("Error: `name` argument is required.");
      }

      try {
        const status = getAgentStatus(agentName, rootDir);
        return text(JSON.stringify(status, null, 2));
      } catch (e) {
        return text(`Error getting status for "${agentName}": ${String(e)}`);
      }
    }

    case "get_ontology": {
      const ontologyPath = join(rootDir, "ONTOLOGY.md");
      if (!existsSync(ontologyPath)) {
        return text(
          `No ONTOLOGY.md found at ${ontologyPath}.\n\n` +
            `To create one, add ONTOLOGY.md at the workspace root defining shared vocabulary ` +
            `used across all agents in this graph.`
        );
      }
      const content = readFileSync(ontologyPath, "utf-8");
      return text(content);
    }

    case "run_agent": {
      const agentName = args.name as string;
      if (!agentName) {
        return text("Error: `name` argument is required.");
      }

      // By design: this compiler resolves the chain and hands back AGENTS.md
      // content. Actually running it is host-specific (which CLI, which
      // provider) and is deliberately not this tool's job — see the OAA
      // README's "Running a Compiled Agent" section for the concrete command.
      try {
        const chain = resolveChain(agentName, rootDir);
        if (!chain) {
          return text(`Agent "${agentName}" not found.`);
        }

        const agentsPath = join(dirname(chain.agent.path), "AGENTS.md");

        if (!existsSync(agentsPath)) {
          return text(
            `AGENTS.md not found for "${agentName}". Run compile_agent first.\n\n` +
              `Path checked: ${agentsPath}`
          );
        }

        const agentsContent = readFileSync(agentsPath, "utf-8");

        return text(
          `Execution is host-specific by design — this compiler doesn't assume which CLI or provider is running the agent. ` +
            `See the OAA README's "Running a Compiled Agent" section for the concrete launch command.\n\n` +
            `The compiled AGENTS.md for "${agentName}" follows — hand it to your LLM as its full operating instructions:\n\n` +
            `---\n\n${agentsContent}`
        );
      } catch (e) {
        return text(`Error preparing agent "${agentName}": ${String(e)}`);
      }
    }

    case "get_compact_prompt_template": {
      return text(COMPACT_PROMPT_TEMPLATE);
    }

    default:
      return text(`Unknown tool: ${name}`);
  }
}

function text(
  content: string
): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text" as const, text: content }] };
}
