#!/usr/bin/env node
// oaa: the command-line utility for the deterministic parts of OAA.
//
//   oaa compile <agent> [--root <dir>]    write the agent's AGENTS.md and mcp-config.json,
//                                         update agents.lock, and print the resolved chain and
//                                         composed authority as JSON.
//   oaa validate [--root <dir>] [--json]  structural checks; every finding cites its check.
//
// --root defaults to the current directory (the wrapper root that holds agents/, roles/,
// skills/, tools/ and agents.lock).

import { resolve, relative } from "path";
import {
  compileAgent,
  buildMcpConfig,
  validateGraph,
} from "./compiler.js";
import type { ResolvedNode } from "./types.js";

function usage(): never {
  console.error(
    "usage:\n  oaa compile <agent> [--root <dir>]\n  oaa validate [--root <dir>] [--json]"
  );
  process.exit(2);
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function rel(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, "/");
}

function describe(root: string, node: ResolvedNode) {
  return { name: node.name, kind: node.kind, path: rel(root, node.path), frontmatter: node.frontmatter };
}

const [command, ...args] = process.argv.slice(2);
const root = resolve(option(args, "root") ?? process.cwd());

if (command === "compile") {
  const agentName = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
  if (!agentName) usage();

  const result = compileAgent(agentName, root);
  const { chain, authority, missingMcpConfigs } = result;
  const { config: mcpConfig } = buildMcpConfig(chain, root);

  console.log(
    JSON.stringify(
      {
        root: ".",
        agent: describe(root, chain.agent),
        roles: chain.roles.map((n) => describe(root, n)),
        skills: chain.skills.map((n) => describe(root, n)),
        tools: chain.tools.map((n) => describe(root, n)),
        authority,
        mcpConfig,
        missingMcpConfigs,
        agentsMd: rel(root, result.agentsPath),
        mcpConfigFile: rel(root, result.mcpConfigPath),
        lock: rel(root, result.lockPath),
      },
      null,
      2
    )
  );
} else if (command === "validate") {
  const result = validateGraph(root);
  if (args.includes("--json")) {
    console.log(JSON.stringify({ verdict: result.verdict, findings: result.findings }, null, 2));
  } else {
    for (const f of result.findings) {
      const fix = f.fix ? `\n    fix: ${f.fix}` : "";
      console.log(`${f.severity.toUpperCase()} [${f.check}] ${rel(root, f.file)}: ${f.message}${fix}`);
    }
    console.log(`Verdict: ${result.verdict}`);
  }
  process.exit(result.verdict === "INVALID" ? 1 : 0);
} else {
  usage();
}
