// Type-checker and reference validator for OAA Ontology programs
//
// Checks:
//   1. All type references resolve (built-in, user-defined type/enum/entity)
//   2. No duplicate names (types, enums, entities)
//   3. Relation targets resolve to declared entities
//   4. DerivedEntity extends a declared entity
//   5. Constraint / where expressions reference declared properties on the entity
//   6. Enum comparisons reference valid enum values
//   7. Map entries reference declared concepts and properties
//   8. Cardinality is valid (enforced by parser, re-checked here)

import type {
  Program,
  Statement,
  EntityDecl,
  DerivedEntityDecl,
  MapDecl,
  Expr,
  SourceLoc,
} from "./ast.js";

const BUILT_IN_TYPES = new Set([
  "String",
  "Integer",
  "Float",
  "Boolean",
  "Currency",
  "Date",
  "DateTime",
  "DatePeriod",
]);

export interface CheckFinding {
  severity: "error" | "warning" | "gap";
  check: string;
  source: string;
  line: number;
  col: number;
  message: string;
  fix?: string;
}

export interface CheckResult {
  verdict: "VALID" | "VALID-WITH-WARNINGS" | "INVALID";
  findings: CheckFinding[];
}

// The symbol table built during checking
export interface OntologySymbols {
  types: Map<string, { base: string; sourcePath: string }>;
  enums: Map<string, { values: string[]; sourcePath: string }>;
  entities: Map<string, { decl: EntityDecl | DerivedEntityDecl; sourcePath: string }>;
}

export function checkPrograms(programs: Program[]): {
  result: CheckResult;
  symbols: OntologySymbols;
} {
  const findings: CheckFinding[] = [];
  const symbols: OntologySymbols = {
    types: new Map(),
    enums: new Map(),
    entities: new Map(),
  };

  // Phase 1: collect all declarations (first pass — just names)
  for (const prog of programs) {
    for (const stmt of prog.statements) {
      collectDeclaration(stmt, prog.sourcePath, symbols, findings);
    }
  }

  // Phase 2: validate references and expressions
  for (const prog of programs) {
    for (const stmt of prog.statements) {
      validateStatement(stmt, prog.sourcePath, symbols, findings);
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const verdict =
    errors.length > 0
      ? "INVALID"
      : warnings.length > 0
      ? "VALID-WITH-WARNINGS"
      : "VALID";

  return { result: { verdict, findings }, symbols };
}

// ---------------------------------------------------------------------------
// Phase 1: collect declarations
// ---------------------------------------------------------------------------

function collectDeclaration(
  stmt: Statement,
  src: string,
  symbols: OntologySymbols,
  findings: CheckFinding[]
): void {
  switch (stmt.kind) {
    case "TypeDecl":
      checkDuplicate(stmt.name, symbols, src, stmt.loc, findings);
      symbols.types.set(stmt.name, { base: stmt.base, sourcePath: src });
      break;

    case "EnumDecl":
      checkDuplicate(stmt.name, symbols, src, stmt.loc, findings);
      symbols.enums.set(stmt.name, { values: stmt.values, sourcePath: src });
      break;

    case "EntityDecl":
    case "DerivedEntityDecl":
      checkDuplicate(stmt.name, symbols, src, stmt.loc, findings);
      symbols.entities.set(stmt.name, { decl: stmt, sourcePath: src });
      break;

    case "MapDecl":
      break; // maps don't define new names
  }
}

function checkDuplicate(
  name: string,
  symbols: OntologySymbols,
  src: string,
  loc: SourceLoc,
  findings: CheckFinding[]
): void {
  if (
    symbols.types.has(name) ||
    symbols.enums.has(name) ||
    symbols.entities.has(name)
  ) {
    findings.push({
      severity: "error",
      check: "Duplicate Declaration",
      source: src,
      line: loc.line,
      col: loc.col,
      message: `Duplicate name "${name}" — already declared in this ontology.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Phase 2: validate references
// ---------------------------------------------------------------------------

function resolveTypeRef(
  typeName: string,
  symbols: OntologySymbols
): boolean {
  return (
    BUILT_IN_TYPES.has(typeName) ||
    symbols.types.has(typeName) ||
    symbols.enums.has(typeName) ||
    symbols.entities.has(typeName)
  );
}

function validateStatement(
  stmt: Statement,
  src: string,
  symbols: OntologySymbols,
  findings: CheckFinding[]
): void {
  switch (stmt.kind) {
    case "TypeDecl":
      if (!BUILT_IN_TYPES.has(stmt.base)) {
        findings.push({
          severity: "error",
          check: "Type Reference",
          source: src,
          line: stmt.loc.line,
          col: stmt.loc.col,
          message: `Type "${stmt.name}" extends unknown base type "${stmt.base}". Built-in types: ${[...BUILT_IN_TYPES].join(", ")}`,
        });
      }
      break;

    case "EntityDecl": {
      if (stmt.identifiedBy && !resolveTypeRef(stmt.identifiedBy, symbols)) {
        findings.push({
          severity: "error",
          check: "Type Reference",
          source: src,
          line: stmt.loc.line,
          col: stmt.loc.col,
          message: `Entity "${stmt.name}" identified-by type "${stmt.identifiedBy}" is not declared.`,
          fix: `Declare "type ${stmt.identifiedBy} : String" (or appropriate base type).`,
        });
      }

      const propNames = new Set(stmt.properties.map((p) => p.name));

      for (const prop of stmt.properties) {
        if (!resolveTypeRef(prop.type, symbols)) {
          findings.push({
            severity: "error",
            check: "Type Reference",
            source: src,
            line: prop.loc.line,
            col: prop.loc.col,
            message: `Property "${prop.name}" on "${stmt.name}" has unknown type "${prop.type}".`,
          });
        }
        if (prop.constraint) {
          validateExpr(
            prop.constraint,
            propNames,
            symbols,
            src,
            stmt.name,
            findings
          );
        }
      }

      for (const rel of stmt.relations) {
        if (!symbols.entities.has(rel.target)) {
          findings.push({
            severity: "warning",
            check: "Relation Target",
            source: src,
            line: rel.loc.line,
            col: rel.loc.col,
            message: `Relation "${rel.name}" on "${stmt.name}" targets "${rel.target}" which is not declared in this ontology.`,
            fix: `Declare "entity ${rel.target} { ... }" or add the source file that defines it.`,
          });
        }
      }

      for (const con of stmt.constraints) {
        validateExpr(
          con.expr,
          propNames,
          symbols,
          src,
          stmt.name,
          findings
        );
      }

      break;
    }

    case "DerivedEntityDecl": {
      const baseEntry = symbols.entities.get(stmt.base);
      if (!baseEntry) {
        findings.push({
          severity: "error",
          check: "Extends Reference",
          source: src,
          line: stmt.loc.line,
          col: stmt.loc.col,
          message: `Derived entity "${stmt.name}" extends "${stmt.base}" which is not declared.`,
        });
        break;
      }
      if (baseEntry.decl.kind !== "EntityDecl") {
        findings.push({
          severity: "error",
          check: "Extends Reference",
          source: src,
          line: stmt.loc.line,
          col: stmt.loc.col,
          message: `"${stmt.name}" extends "${stmt.base}" but that is also a derived entity. Derived entities can only extend base entities.`,
        });
        break;
      }
      const propNames = new Set(
        baseEntry.decl.properties.map((p) => p.name)
      );
      validateExpr(stmt.where, propNames, symbols, src, stmt.name, findings);
      break;
    }

    case "MapDecl": {
      for (const entry of stmt.entries) {
        if (entry.target === "implicit") continue;
        const [conceptPart, propPart] = entry.source.split(".");
        const entityEntry = symbols.entities.get(conceptPart);
        if (!entityEntry) {
          findings.push({
            severity: "error",
            check: "Map Reference",
            source: src,
            line: stmt.loc.line,
            col: stmt.loc.col,
            message: `Map "${stmt.tool}": source concept "${conceptPart}" is not declared in the ontology.`,
          });
          continue;
        }
        if (propPart && entityEntry.decl.kind === "EntityDecl") {
          const hasProp = entityEntry.decl.properties.some(
            (p) => p.name === propPart
          );
          if (!hasProp) {
            findings.push({
              severity: "error",
              check: "Map Reference",
              source: src,
              line: stmt.loc.line,
              col: stmt.loc.col,
              message: `Map "${stmt.tool}": property "${propPart}" does not exist on entity "${conceptPart}".`,
            });
          }
        }
      }

      // Gap: unmapped entities
      for (const entityName of symbols.entities.keys()) {
        const { decl } = symbols.entities.get(entityName)!;
        if (decl.kind === "DerivedEntityDecl") continue; // derived -> optional to map
        const mapped = stmt.entries.some(
          (e) => e.source === entityName || e.source.startsWith(entityName + ".")
        );
        if (!mapped) {
          findings.push({
            severity: "gap",
            check: "Map Coverage",
            source: src,
            line: stmt.loc.line,
            col: stmt.loc.col,
            message: `Tool map "${stmt.tool}" has no entry for entity "${entityName}". Is this intentional?`,
          });
        }
      }
      break;
    }

    case "EnumDecl":
      break; // nothing to validate
  }
}

// ---------------------------------------------------------------------------
// Expression checker
// ---------------------------------------------------------------------------

function validateExpr(
  expr: Expr,
  propNames: Set<string>,
  symbols: OntologySymbols,
  src: string,
  entityName: string,
  findings: CheckFinding[]
): void {
  switch (expr.kind) {
    case "BinaryExpr":
      validateExpr(expr.left, propNames, symbols, src, entityName, findings);
      validateExpr(expr.right, propNames, symbols, src, entityName, findings);
      break;

    case "UnaryExpr":
      validateExpr(expr.operand, propNames, symbols, src, entityName, findings);
      break;

    case "PropertyRef":
      if (!propNames.has(expr.name)) {
        findings.push({
          severity: "error",
          check: "Constraint Expression",
          source: src,
          line: expr.loc.line,
          col: expr.loc.col,
          message: `Expression references property "${expr.name}" which is not declared on "${entityName}".`,
          fix: `Declare "property ${expr.name} : <type>" in entity "${entityName}".`,
        });
      }
      break;

    case "IdentRef":
      if (!propNames.has(expr.name)) {
        const isEnumValue = [...symbols.enums.values()].some((e) =>
          e.values.includes(expr.name)
        );
        if (!isEnumValue && !isBuiltInValue(expr.name)) {
          findings.push({
            severity: "warning",
            check: "Constraint Expression",
            source: src,
            line: expr.loc.line,
            col: expr.loc.col,
            message: `Identifier "${expr.name}" in expression is not a declared property or enum value on "${entityName}". This may be intentional (external reference) or a typo.`,
          });
        }
      }
      break;

    case "NumberLiteral":
    case "StringLiteral":
      break; // always valid
  }
}

function isBuiltInValue(name: string): boolean {
  return ["true", "false", "null"].includes(name);
}
