// Compile OAA Ontology programs (parsed AST) into ONTOLOGY.md

import { writeFileSync } from "fs";
import type {
  Program,
  Statement,
  EntityDecl,
  DerivedEntityDecl,
  MapDecl,
  Expr,
  PropertyDecl,
  RelationDecl,
  ConstraintDecl,
} from "./ast.js";
import type { OntologySymbols } from "./checker.js";

export function compileToMarkdown(
  programs: Program[],
  symbols: OntologySymbols,
  outputPath: string
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  const allStmts = programs.flatMap((p) => p.statements);

  const types = allStmts.filter((s) => s.kind === "TypeDecl") as any[];
  const enums = allStmts.filter((s) => s.kind === "EnumDecl") as any[];
  const entities = allStmts.filter((s) => s.kind === "EntityDecl") as EntityDecl[];
  const derived = allStmts.filter((s) => s.kind === "DerivedEntityDecl") as DerivedEntityDecl[];
  const maps = allStmts.filter((s) => s.kind === "MapDecl") as MapDecl[];

  lines.push("# Business Domain Ontology");
  lines.push("");
  lines.push("> **Generated artifact** — compiled from `.rel` source files on " + now + ".");
  lines.push("> Do not edit by hand. Edit the source files and run `compile_ontology`.");
  lines.push("");
  lines.push(
    "This ontology defines the canonical vocabulary for this organization's business domain. " +
    "OAA agent roles, skills, and authority fields reference these concept names. " +
    "Tool nodes provide the mapping from business names to API vocabulary via `concept-map` declarations."
  );
  lines.push("");

  lines.push("## Contents");
  lines.push("");
  if (entities.length > 0) lines.push("- [Entities](#entities)");
  if (derived.length > 0) lines.push("- [Derived Concepts](#derived-concepts)");
  if (enums.length > 0) lines.push("- [Value Types and Enumerations](#value-types-and-enumerations)");
  if (maps.length > 0) lines.push("- [Tool Vocabulary Maps](#tool-vocabulary-maps)");
  lines.push("- [Quick Reference](#quick-reference)");
  lines.push("");
  lines.push("---");
  lines.push("");

  if (entities.length > 0) {
    lines.push("## Entities");
    lines.push("");
    for (const entity of entities) {
      lines.push(...renderEntity(entity));
    }
  }

  if (derived.length > 0) {
    lines.push("## Derived Concepts");
    lines.push("");
    lines.push(
      "Derived concepts are subtypes defined by logical rules over base entities. " +
      "An instance belongs to a derived concept when its base entity satisfies the `where` clause."
    );
    lines.push("");
    for (const d of derived) {
      lines.push(...renderDerived(d));
    }
  }

  if (types.length > 0 || enums.length > 0) {
    lines.push("## Value Types and Enumerations");
    lines.push("");
    if (types.length > 0) {
      lines.push("### Scalar Types");
      lines.push("");
      lines.push("| Name | Base Type | Description |");
      lines.push("|------|-----------|-------------|");
      for (const t of types) {
        lines.push("| `" + t.name + "` | " + t.base + " | " + (t.doc ?? "") + " |");
      }
      lines.push("");
    }
    if (enums.length > 0) {
      lines.push("### Enumerations");
      lines.push("");
      for (const e of enums) {
        lines.push("**" + e.name + "**" + (e.doc ? " — " + e.doc : ""));
        lines.push("");
        lines.push("Values: " + e.values.map((v: string) => "`" + v + "`").join(", "));
        lines.push("");
      }
    }
  }

  if (maps.length > 0) {
    lines.push("## Tool Vocabulary Maps");
    lines.push("");
    lines.push(
      "Business concept names map to API vocabulary for each tool. " +
      "This is the **only** place API names appear — everything above uses business terms."
    );
    lines.push("");
    for (const map of maps) {
      lines.push(...renderMap(map, symbols));
    }
  }

  lines.push("## Quick Reference");
  lines.push("");
  lines.push("| Concept | Kind | Description |");
  lines.push("|---------|------|-------------|");
  for (const entity of entities) {
    const anchor = entity.name.toLowerCase();
    lines.push(
      "| [" + entity.name + "](#" + anchor + ") | entity | " + (entity.doc ?? "") + " |"
    );
  }
  for (const d of derived) {
    const anchor = d.name.toLowerCase();
    lines.push(
      "| [" + d.name + "](#" + anchor + ") | derived (extends " + d.base + ") | " + (d.doc ?? "") + " |"
    );
  }
  lines.push("");

  const content = lines.join("\n");
  writeFileSync(outputPath, content, "utf-8");
  return content;
}

function renderEntity(entity: EntityDecl): string[] {
  const lines: string[] = [];
  const anchor = entity.name.toLowerCase();

  lines.push("### " + entity.name);
  lines.push("<a id=\"" + anchor + "\"></a>");
  lines.push("");

  if (entity.doc) {
    lines.push(entity.doc);
    lines.push("");
  }

  if (entity.identifiedBy) {
    lines.push("**Identity key:** `" + entity.identifiedBy + "`");
    lines.push("");
  }

  if (entity.properties.length > 0) {
    lines.push("**Properties:**");
    lines.push("");
    lines.push("| Name | Type | Constraint | Description |");
    lines.push("|------|------|------------|-------------|");
    for (const prop of entity.properties) {
      const constraintStr = prop.constraint
        ? "`" + renderExpr(prop.constraint) + "`"
        : "";
      lines.push(
        "| `" + prop.name + "` | " + prop.type + " | " + constraintStr + " | " + (prop.doc ?? "") + " |"
      );
    }
    lines.push("");
  }

  if (entity.relations.length > 0) {
    lines.push("**Relationships:**");
    lines.push("");
    lines.push("| Name | Target | Cardinality | Description |");
    lines.push("|------|--------|-------------|-------------|");
    for (const rel of entity.relations) {
      const targetLink = "[" + rel.target + "](#" + rel.target.toLowerCase() + ")";
      lines.push(
        "| `" + rel.name + "` | " + targetLink + " | `" + rel.cardinality + "` | " + (rel.doc ?? "") + " |"
      );
    }
    lines.push("");
  }

  if (entity.constraints.length > 0) {
    lines.push("**Integrity constraints:**");
    lines.push("");
    for (const con of entity.constraints) {
      lines.push("- `" + con.name + "`: `" + renderExpr(con.expr) + "`" + (con.doc ? " — " + con.doc : ""));
    }
    lines.push("");
  }

  return lines;
}

function renderDerived(d: DerivedEntityDecl): string[] {
  const lines: string[] = [];
  const anchor = d.name.toLowerCase();

  lines.push("### " + d.name);
  lines.push("<a id=\"" + anchor + "\"></a>");
  lines.push("");

  if (d.doc) {
    lines.push(d.doc);
    lines.push("");
  }

  lines.push("**Extends:** [" + d.base + "](#" + d.base.toLowerCase() + ")");
  lines.push("");
  lines.push("**Rule:** An instance is a `" + d.name + "` when `" + renderExpr(d.where) + "`");
  lines.push("");

  return lines;
}

function renderMap(map: MapDecl, symbols: OntologySymbols): string[] {
  const lines: string[] = [];

  lines.push("### " + map.tool);
  lines.push("");

  if (map.doc) {
    lines.push(map.doc);
    lines.push("");
  }

  const conceptEntries = map.entries.filter((e) => !e.source.includes("."));
  const propEntries = map.entries.filter((e) => e.source.includes("."));
  const implicitEntries = map.entries.filter((e) => e.target === "implicit" && !e.source.includes("."));
  const activeConceptEntries = conceptEntries.filter((e) => e.target !== "implicit");

  if (activeConceptEntries.length > 0) {
    lines.push("**Object type mappings:**");
    lines.push("");
    lines.push("| Business Concept | API Object | Notes |");
    lines.push("|-----------------|-----------|-------|");
    for (const e of activeConceptEntries) {
      lines.push("| `" + e.source + "` | `" + e.target + "` | " + (e.note ?? "") + " |");
    }
    lines.push("");
  }

  const activePropEntries = propEntries.filter((e) => e.target !== "implicit");
  if (activePropEntries.length > 0) {
    lines.push("**Field mappings:**");
    lines.push("");
    lines.push("| Business Property | API Field | Notes |");
    lines.push("|-------------------|----------|-------|");
    for (const e of activePropEntries) {
      lines.push("| `" + e.source + "` | `" + e.target + "` | " + (e.note ?? "") + " |");
    }
    lines.push("");
  }

  const implicitPropEntries = propEntries.filter((e) => e.target === "implicit");
  const allImplicit = [...implicitEntries, ...implicitPropEntries];
  if (allImplicit.length > 0) {
    lines.push("**Implicit mappings** (no direct API field — derived or computed in skill logic):");
    lines.push("");
    for (const e of allImplicit) {
      lines.push("- `" + e.source + "`" + (e.note ? " — " + e.note : ""));
    }
    lines.push("");
  }

  const mappedConcepts = new Set(
    map.entries.map((e) => e.source.split(".")[0])
  );
  const unmapped = [...symbols.entities.keys()].filter(
    (name) => {
      const entry = symbols.entities.get(name);
      return entry?.decl.kind === "EntityDecl" && !mappedConcepts.has(name);
    }
  );
  if (unmapped.length > 0) {
    lines.push(
      "_Unmapped entities (no equivalent in this tool): " + unmapped.join(", ") + "_"
    );
    lines.push("");
  }

  if (map.notes) {
    lines.push("> " + map.notes);
    lines.push("");
  }

  return lines;
}

function renderExpr(expr: Expr): string {
  switch (expr.kind) {
    case "BinaryExpr":
      return renderExpr(expr.left) + " " + expr.op + " " + renderExpr(expr.right);
    case "UnaryExpr":
      return "not " + renderExpr(expr.operand);
    case "PropertyRef":
      return expr.name;
    case "IdentRef":
      return expr.name;
    case "NumberLiteral":
      return String(expr.value);
    case "StringLiteral":
      return '"' + expr.value + '"';
  }
}
