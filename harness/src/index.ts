#!/usr/bin/env node
/**
 * @oaa/harness — MCP server for Organizational Agent Architecture
 *
 * Exposes:
 *   Tools:     compile_agent, validate_graph, get_status, get_ontology, run_agent
 *   Resources: oaa://index.json, oaa://node/<name>, oaa://chain/<agent>, oaa://lock, oaa://ontology
 *   Prompts:   oaa_bootstrap, oaa_create_node, oaa_author_authority,
 *              oaa_decompose, oaa_compile, oaa_validate
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { resolve } from "path";
import { toolDefinitions, handleTool } from "./tools.js";
import { listResources, readResource } from "./resources.js";
import { promptDefinitions, getPromptContent } from "./prompts.js";

// ---------------------------------------------------------------------------
// Root directory
// Determined by:
//   1. OAA_ROOT env var (set by caller)
//   2. --root <path> CLI arg
//   3. cwd
// ---------------------------------------------------------------------------

function resolveRootDir(): string {
  if (process.env.OAA_ROOT) {
    return resolve(process.env.OAA_ROOT);
  }

  const rootArgIdx = process.argv.indexOf("--root");
  if (rootArgIdx !== -1 && process.argv[rootArgIdx + 1]) {
    return resolve(process.argv[rootArgIdx + 1]);
  }

  return resolve(process.cwd());
}

const ROOT_DIR = resolveRootDir();

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "oaa-harness",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolDefinitions };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleTool(name, (args ?? {}) as Record<string, unknown>, ROOT_DIR);
});

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const resources = listResources(ROOT_DIR);
    return { resources };
  } catch (e) {
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    const result = readResource(uri, ROOT_DIR);
    return {
      contents: [
        {
          uri,
          mimeType: result.mimeType,
          text: result.text,
        },
      ],
    };
  } catch (e) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Error reading resource ${uri}: ${String(e)}`,
        },
      ],
    };
  }
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: promptDefinitions };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const promptArgs = (args ?? {}) as Record<string, string>;
  const message = getPromptContent(name, promptArgs);
  return {
    description:
      promptDefinitions.find((p) => p.name === name)?.description ?? name,
    messages: [message],
  };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't pollute the MCP stdio protocol
  process.stderr.write(
    `@oaa/harness running. Root: ${ROOT_DIR}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
