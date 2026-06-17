// SQL schema emitter for OAA Ontology.
// Translates EntityDecl AST nodes into CREATE TABLE statements,
// and DerivedEntityDecl nodes into CREATE VIEW statements.

import type { Program, EntityDecl, DerivedEntityDecl, Expr } from "./ast.js";
import type { OntologySymbols } from "./checker.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function emitSchemaSQL(programs: Program[], symbols: OntologySymbols): string {
  const lines: string[] = [];
  lines.push("-- OAA Ontology schema — generated from .rel source files.");
  lines.push("-- Do not edit by hand. Regenerate with compile_schema.");
  lines.push("-- Base entities become tables; derived concepts become views.");
  lines.push("");
  lines.push("PRAGMA journal_mode=WAL;");
  lines.push("PRAGMA foreign_keys=ON;");
  lines.push("");

  const allStmts = programs.flatMap((p) => p.statements);
  const entities = allStmts.filter((s) => s.kind === "EntityDecl") as EntityDecl[];
  const derived = allStmts.filter((s) => s.kind === "DerivedEntityDecl") as DerivedEntityDecl[];

  for (const entity of entities) {
    lines.push(...renderTable(entity, symbols));
  }

  if (derived.length > 0) {
    const enumValues = buildEnumValues(symbols);
    lines.push("-- Derived concepts as views");
    lines.push("");
    for (const d of derived) {
      lines.push(...renderView(d, enumValues));
    }
  }

  return lines.join("\n");
}

// Returns the SQL WHERE clause for a derived concept's where expression.
export function derivedConceptWhereSQL(decl: DerivedEntityDecl, symbols?: OntologySymbols): string {
  const enumValues = buildEnumValues(symbols);
  return exprToSQL(decl.where, enumValues);
}

// Collects all enum member names from the symbol table into a flat Set.
function buildEnumValues(symbols?: OntologySymbols): Set<string> {
  if (!symbols) return new Set();
  const values = new Set<string>();
  for (const { values: members } of symbols.enums.values()) {
    for (const m of members) values.add(m);
  }
  return values;
}

// Translates a .rel property name (kebab-case) to a SQL column name (underscore).
export function propToCol(name: string): string {
  return name.replace(/-/g, "_");
}

// Translates a .rel Expr AST node to a SQL expression fragment.
//
// `enumValues` is the set of all enum member names across all enums in the
// program. When an IdentRef name appears in this set, it is an enum value
// literal and must be emitted as a quoted SQL string ('Refunded', 'Active',
// etc.). Without quoting, SQLite treats the name as a column reference and
// the WHERE clause silently returns no rows.
export function exprToSQL(expr: Expr, enumValues: Set<string> = new Set()): string {
  switch (expr.kind) {
    case "BinaryExpr": {
      const opMap: Record<string, string> = {
        "and": "AND", "or": "OR",
        ">": ">", "<": "<", ">=": ">=", "<=": "<=", "=": "=", "!=": "!=",
      };
      const op = opMap[expr.op] ?? expr.op;
      return (
        "(" +
        exprToSQL(expr.left, enumValues) +
        " " + op + " " +
        exprToSQL(expr.right, enumValues) +
        ")"
      );
    }
    case "UnaryExpr":
      return "NOT (" + exprToSQL(expr.operand, enumValues) + ")";
    case "IdentRef":
      // An IdentRef resolves to either:
      //   (a) an enum member value  → emit as a quoted SQL string literal
      //   (b) a boolean constant    → emit as SQL integer (1 / 0)
      //   (c) a property reference  → emit as a column name (kebab→underscore)
      if (enumValues.has(expr.name)) {
        return "'" + expr.name.replace(/'/g, "''") + "'";
      }
      if (expr.name === "true")  return "1";
      if (expr.name === "false") return "0";
      return propToCol(expr.name);
    case "PropertyRef":
      return propToCol(expr.name);
    case "NumberLiteral":
      return String(expr.value);
    case "StringLiteral":
      return "'" + expr.value.replace(/'/g, "''") + "'";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapPropertyType(typeName: string, symbols: OntologySymbols): string {
  if (symbols.types.has(typeName)) {
    return mapBuiltIn(symbols.types.get(typeName)!.base);
  }
  if (symbols.enums.has(typeName)) return "TEXT";
  if (symbols.entities.has(typeName)) return "TEXT"; // FK to another entity stored as TEXT
  return mapBuiltIn(typeName);
}

function mapBuiltIn(t: string): string {
  switch (t) {
    case "String":     return "TEXT";
    case "Integer":    return "INTEGER";
    case "Float":      return "REAL";
    case "Boolean":    return "INTEGER";
    case "Currency":   return "REAL";
    case "Date":       return "TEXT";
    case "DateTime":   return "TEXT";
    case "DatePeriod": return "TEXT";
    default:           return "TEXT";
  }
}

function renderTable(entity: EntityDecl, symbols: OntologySymbols): string[] {
  const out: string[] = [];
  if (entity.doc) out.push("-- " + entity.doc);
  out.push("CREATE TABLE IF NOT EXISTS " + entity.name + " (");

  const cols: string[] = [];
  // Primary key column — 'id' TEXT (all identity types are String aliases)
  cols.push("  id TEXT PRIMARY KEY");

  for (const prop of entity.properties) {
    const sqlType = mapPropertyType(prop.type, symbols);
    // Note: do NOT put SQL -- comments inline on column lines — they eat the trailing comma.
    // Doc strings are available in ONTOLOGY.md.
    cols.push("  " + propToCol(prop.name) + " " + sqlType);
  }

  // Relations: FK columns for many-to-one and one-to-one (source side)
  for (const rel of entity.relations) {
    if (rel.cardinality === "many-to-one" || rel.cardinality === "one-to-one") {
      cols.push("  " + propToCol(rel.name) + "_id TEXT REFERENCES " + rel.target + "(id)");
    }
  }

  // Audit columns
  cols.push("  _updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
  cols.push("  _source TEXT");

  out.push(cols.join(",\n"));
  out.push(");");
  out.push("");
  return out;
}

function renderView(d: DerivedEntityDecl, enumValues: Set<string>): string[] {
  const out: string[] = [];
  if (d.doc) out.push("-- " + d.doc);
  const whereSQL = exprToSQL(d.where, enumValues);
  out.push("CREATE VIEW IF NOT EXISTS " + d.name + " AS");
  out.push("  SELECT * FROM " + d.base + " WHERE " + whereSQL + ";");
  out.push("");
  return out;
}
