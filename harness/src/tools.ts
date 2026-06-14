import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  compileAgent,
  validateGraph,
  getAgentStatus,
  resolveChain,
} from "./compiler.js";
import type { ValidationFinding } from "./types.js";

// ---------------------------------------------------------------------------
// Tool definitions (passed to MCP server)
// ---------------------------------------------------------------------------

export const toolDefinitions = [
  {
    name: "compile_agent",
    description:
      "Walk the OAA chain for a named agent (AGENT.md → ROLE(s) → SKILL(s) → TOOL(s)), compose authority, write AGENTS.md as a runtime instruction file, and update agents.lock. Required before running an agent.",
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
    name: "run_agent",
    description:
      "[STUB] Launch an agent using its compiled AGENTS.md as the system prompt and wire up its declared MCP tools. Not yet implemented — returns the AGENTS.md content for manual use.",
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

      // Stub: resolve chain and return AGENTS.md if it exists
      try {
        const chain = resolveChain(agentName, rootDir);
        if (!chain) {
          return text(`Agent "${agentName}" not found.`);
        }

        const { join: pathJoin, dirname } = await import("path");
        const agentsPath = pathJoin(dirname(chain.agent.path), "AGENTS.md");

        if (!existsSync(agentsPath)) {
          return text(
            `AGENTS.md not found for "${agentName}". Run compile_agent first.\n\n` +
              `Path checked: ${agentsPath}`
          );
        }

        const agentsContent = readFileSync(agentsPath, "utf-8");

        return text(
          `[STUB] run_agent is not yet implemented as an autonomous loop.\n\n` +
            `The compiled AGENTS.md for "${agentName}" follows — use it as a system prompt:\n\n` +
            `---\n\n${agentsContent}`
        );
      } catch (e) {
        return text(`Error preparing agent "${agentName}": ${String(e)}`);
      }
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
