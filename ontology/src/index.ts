#!/usr/bin/env node
/**
 * @oaa/ontology — MCP server for OAA business domain ontology
 *
 * Source format: .rel files (formal logic language)
 * Compiled outputs: ONTOLOGY.md + schema.sql (generated, never hand-edited)
 *
 * Tools:
 *   compile_ontology   — parse .rel files, type-check, write ONTOLOGY.md
 *   validate_ontology  — validate without writing output
 *   get_concepts       — return structured concept catalog
 *   compile_schema     — emit schema.sql + initialise SQLite memory store
 *   write_entity       — upsert an entity instance into the store
 *   query_concept      — query base entity or derived concept (returns rows)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { resolve, join } from "path";
import { writeFileSync } from "fs";
import { loadPrograms } from "./loader.js";
import { checkPrograms, type CheckFinding } from "./checker.js";
import { compileToMarkdown } from "./compiler.js";
import { emitSchemaSQL } from "./sql.js";
import { OntologyStore } from "./store.js";

function resolveRootDir(): string {
  if (process.env.OAA_ROOT) return resolve(process.env.OAA_ROOT);
  const idx = process.argv.indexOf("--root");
  if (idx !== -1 && process.argv[idx + 1]) return resolve(process.argv[idx + 1]);
  return resolve(process.cwd());
}

const ROOT_DIR = resolveRootDir();

// Singleton store — initialised on first compile_schema call
let store: OntologyStore | null = null;

const toolDefinitions = [
  {
    name: "compile_ontology",
    description:
      "Parse all .rel files in the workspace, type-check them, then compile ONTOLOGY.md. " +
      "ONTOLOGY.md is generated output — never edit it directly. " +
      "Compilation fails if there are type errors; warnings are reported but do not block.",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
        outputPath: { type: "string", description: "Output path for ONTOLOGY.md. Defaults to <rootDir>/ONTOLOGY.md." },
      },
      required: [],
    },
  },
  {
    name: "validate_ontology",
    description:
      "Parse and type-check all .rel files without writing any output. " +
      "Returns errors (must fix), warnings (should fix), and gaps (coverage holes). " +
      "Verdict: VALID | VALID-WITH-WARNINGS | INVALID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
      },
      required: [],
    },
  },
  {
    name: "get_concepts",
    description:
      "Return the concept catalog from the workspace .rel files — entities, derived concepts, " +
      "their properties, relations, constraints, and identity keys. " +
      "Optionally filter to a specific entity name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Filter to a specific entity name." },
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
      },
      required: [],
    },
  },
  {
    name: "compile_schema",
    description:
      "Emit schema.sql from the .rel source files — CREATE TABLE for each base entity, " +
      "CREATE VIEW for each derived concept. Also initialises the SQLite instance store " +
      "at <rootDir>/memory/ontology.db. Run this once after authoring or changing .rel files. " +
      "Requires the server to be started with: node --experimental-sqlite dist/index.js",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
      },
      required: [],
    },
  },
  {
    name: "write_entity",
    description:
      "Upsert an entity instance into the SQLite store. Validates the kind and field names " +
      "against the ontology schema. compile_schema must be called first to initialise the store. " +
      "Typically called by the performance-audit skill after fetching data from the tool.",
    inputSchema: {
      type: "object" as const,
      properties: {
        kind: { type: "string", description: "Entity name (e.g. Campaign, CreativeAsset)." },
        id: { type: "string", description: "Primary key value (the business identifier)." },
        fields: {
          type: "object",
          description: "Property values keyed by .rel property name (kebab-case ok).",
          additionalProperties: true,
        },
        source: { type: "string", description: "Optional: which skill/run wrote this row." },
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
      },
      required: ["kind", "id", "fields"],
    },
  },
  {
    name: "query_concept",
    description:
      "Query entity instances from the store. Works for both base entities (SELECT * FROM Entity) " +
      "and derived concepts (SELECT * FROM DerivedConcept — these are SQL views that apply the " +
      "where clause from the .rel definition). Optionally filter by field values. " +
      "Returns rows as JSON. Example: query_concept UnderachievingCampaign returns all " +
      "campaigns where rolling_3day_cpa > 35.",
    inputSchema: {
      type: "object" as const,
      properties: {
        concept: { type: "string", description: "Entity or derived concept name." },
        filters: {
          type: "object",
          description: "Optional equality filters: { propertyName: value }.",
          additionalProperties: true,
        },
        rootDir: { type: "string", description: "Workspace root. Defaults to cwd." },
      },
      required: ["concept"],
    },
  },
];

const server = new Server(
  { name: "oaa-ontology", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;
  const rootDir =
    typeof a.rootDir === "string" ? resolve(a.rootDir) : ROOT_DIR;

  switch (name) {
    case "compile_ontology": {
      try {
        const programs = loadPrograms(rootDir);
        if (programs.length === 0) {
          return text("No .rel files found. Create ontology source files with the .rel extension.");
        }

        const { result, symbols } = checkPrograms(programs);
        const errors = result.findings.filter((f) => f.severity === "error");

        if (errors.length > 0) {
          return text(
            "Cannot compile — " + errors.length + " error(s) must be fixed first:\n\n" +
            errors.map((e) => "  [" + e.check + "] " + e.source + ":" + e.line + "\n    " + e.message).join("\n") +
            "\n\nRun validate_ontology for full details."
          );
        }

        const outputPath =
          typeof a.outputPath === "string"
            ? resolve(a.outputPath)
            : join(rootDir, "ONTOLOGY.md");

        compileToMarkdown(programs, symbols, outputPath);

        const warnings = result.findings.filter((f) => f.severity === "warning");
        const entityCount = [...symbols.entities.values()].filter(
          (e) => e.decl.kind === "EntityDecl"
        ).length;
        const derivedCount = [...symbols.entities.values()].filter(
          (e) => e.decl.kind === "DerivedEntityDecl"
        ).length;

        const lines = [
          "ONTOLOGY.md compiled to: " + outputPath,
          "",
          "  Entities:         " + entityCount,
          "  Derived concepts: " + derivedCount,
          "  Enumerations:     " + symbols.enums.size,
          "  Scalar types:     " + symbols.types.size,
          "  Tool maps:        " + programs.flatMap(p => p.statements).filter(s => s.kind === "MapDecl").length,
        ];
        if (warnings.length > 0) {
          lines.push("\nWarnings: " + warnings.length + " — run validate_ontology for details.");
        }

        return text(lines.join("\n"));
      } catch (e) {
        return text("Error: " + String(e));
      }
    }

    case "validate_ontology": {
      try {
        const programs = loadPrograms(rootDir);
        if (programs.length === 0) {
          return text("No .rel files found in workspace.");
        }

        const { result } = checkPrograms(programs);

        const out: string[] = ["Verdict: " + result.verdict, ""];
        const grouped = groupFindings(result.findings);

        if (grouped.errors.length > 0) {
          out.push("ERRORS — must fix (" + grouped.errors.length + ")");
          for (const f of grouped.errors) {
            out.push("  [" + f.check + "] " + f.source + ":" + f.line + ":" + f.col);
            out.push("    " + f.message);
            if (f.fix) out.push("    Fix: " + f.fix);
          }
          out.push("");
        }
        if (grouped.warnings.length > 0) {
          out.push("WARNINGS — should fix (" + grouped.warnings.length + ")");
          for (const f of grouped.warnings) {
            out.push("  [" + f.check + "] " + f.source + ":" + f.line);
            out.push("    " + f.message);
          }
          out.push("");
        }
        if (grouped.gaps.length > 0) {
          out.push("GAPS — review (" + grouped.gaps.length + ")");
          for (const f of grouped.gaps) {
            out.push("  [" + f.check + "] " + f.message);
          }
          out.push("");
        }
        if (result.findings.length === 0) {
          out.push("No findings — ontology is VALID.");
        }

        return text(out.join("\n"));
      } catch (e) {
        return text("Error validating ontology: " + String(e));
      }
    }

    case "get_concepts": {
      try {
        const programs = loadPrograms(rootDir);
        if (programs.length === 0) {
          return text("No .rel files found in workspace.");
        }

        const { symbols } = checkPrograms(programs);
        const filterName = typeof a.name === "string" ? a.name : null;

        const catalog: object[] = [];
        for (const [entityName, { decl, sourcePath }] of symbols.entities) {
          if (filterName && entityName !== filterName) continue;

          if (decl.kind === "EntityDecl") {
            catalog.push({
              name: entityName,
              kind: "entity",
              identifiedBy: decl.identifiedBy,
              doc: decl.doc,
              sourcePath,
              properties: decl.properties.map((p) => ({
                name: p.name,
                type: p.type,
                doc: p.doc,
                constraint: p.constraint ? "(has constraint)" : undefined,
              })),
              relations: decl.relations.map((r) => ({
                name: r.name,
                target: r.target,
                cardinality: r.cardinality,
                doc: r.doc,
              })),
              constraints: decl.constraints.map((c) => ({
                name: c.name,
                doc: c.doc,
              })),
            });
          } else {
            catalog.push({
              name: entityName,
              kind: "derived",
              base: decl.base,
              doc: decl.doc,
              sourcePath,
            });
          }
        }

        if (catalog.length === 0) {
          return text(
            filterName
              ? "Concept \"" + filterName + "\" not found."
              : "No entities declared."
          );
        }

        return text(JSON.stringify(catalog, null, 2));
      } catch (e) {
        return text("Error: " + String(e));
      }
    }

    case "compile_schema": {
      try {
        const programs = loadPrograms(rootDir);
        if (programs.length === 0) {
          return text("No .rel files found in workspace.");
        }

        const { result, symbols } = checkPrograms(programs);
        const errors = result.findings.filter((f) => f.severity === "error");
        if (errors.length > 0) {
          return text("Cannot compile schema — fix errors first. Run validate_ontology.");
        }

        const schemaSQL = emitSchemaSQL(programs, symbols);
        const schemaPath = join(rootDir, "ontology", "schema.sql");
        writeFileSync(schemaPath, schemaSQL, "utf-8");

        // Initialise or re-initialise the store
        store = new OntologyStore(rootDir, symbols, programs);
        const openResult = await store.open(schemaSQL);

        const entityCount = [...symbols.entities.values()].filter(e => e.decl.kind === "EntityDecl").length;
        const derivedCount = [...symbols.entities.values()].filter(e => e.decl.kind === "DerivedEntityDecl").length;

        const out = [
          "schema.sql written to: " + schemaPath,
          "  Tables (base entities): " + entityCount,
          "  Views (derived concepts): " + derivedCount,
          "",
        ];

        if (openResult.ok) {
          out.push("SQLite store: " + rootDir + "/memory/ontology.db — READY");
          out.push("Use write_entity to populate and query_concept to query.");
        } else {
          out.push("SQLite store: NOT available — " + openResult.error);
          out.push("schema.sql is still usable with any external SQLite client.");
        }

        return text(out.join("\n"));
      } catch (e) {
        return text("Error: " + String(e));
      }
    }

    case "write_entity": {
      if (!store || !store.isOpen()) {
        return text("Store not initialised. Call compile_schema first.");
      }
      const kind = typeof a.kind === "string" ? a.kind : "";
      const id = typeof a.id === "string" ? a.id : "";
      const fields = (typeof a.fields === "object" && a.fields !== null)
        ? (a.fields as Record<string, unknown>)
        : {};
      const source = typeof a.source === "string" ? a.source : undefined;

      if (!kind || !id) {
        return text("write_entity requires: kind (entity name) and id (primary key).");
      }

      const result = store.writeEntity(kind, id, fields, source);
      if (result.ok) {
        return text("Written: " + kind + " id=" + id + " (" + Object.keys(fields).length + " fields)");
      } else {
        return text("Error: " + result.error);
      }
    }

    case "query_concept": {
      if (!store || !store.isOpen()) {
        return text("Store not initialised. Call compile_schema first.");
      }
      const concept = typeof a.concept === "string" ? a.concept : "";
      const filters = (typeof a.filters === "object" && a.filters !== null)
        ? (a.filters as Record<string, unknown>)
        : undefined;

      if (!concept) {
        return text("query_concept requires: concept (entity or derived concept name).");
      }

      const result = store.queryConcept(concept, filters);
      if (!result.ok) {
        return text("Error: " + result.error + (result.sql ? "\nSQL: " + result.sql : ""));
      }

      const rows = result.rows ?? [];
      const out = [
        "Concept: " + concept + " — " + rows.length + " row(s)",
        "SQL: " + result.sql,
        "",
        JSON.stringify(rows, null, 2),
      ];
      return text(out.join("\n"));
    }

    default:
      return text("Unknown tool: " + name);
  }
});

function groupFindings(findings: CheckFinding[]) {
  return {
    errors: findings.filter((f) => f.severity === "error"),
    warnings: findings.filter((f) => f.severity === "warning"),
    gaps: findings.filter((f) => f.severity === "gap"),
  };
}

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("@oaa/ontology running. Root: " + ROOT_DIR + "\n");
}

main().catch((err) => {
  process.stderr.write("Fatal: " + String(err) + "\n");
  process.exit(1);
});
