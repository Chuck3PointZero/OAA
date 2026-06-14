// AST for the OAA Ontology formal language (.rel files)

export type Cardinality =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

// ---------------------------------------------------------------------------
// Expressions — used in constraints and where clauses
// ---------------------------------------------------------------------------

export type Expr =
  | BinaryExpr
  | UnaryExpr
  | PropertyRef
  | NumberLiteral
  | StringLiteral
  | IdentRef;

export interface BinaryExpr {
  kind: "BinaryExpr";
  op: ">" | "<" | ">=" | "<=" | "=" | "!=" | "and" | "or";
  left: Expr;
  right: Expr;
  loc: SourceLoc;
}

export interface UnaryExpr {
  kind: "UnaryExpr";
  op: "not";
  operand: Expr;
  loc: SourceLoc;
}

export interface PropertyRef {
  kind: "PropertyRef";
  name: string;
  loc: SourceLoc;
}

export interface NumberLiteral {
  kind: "NumberLiteral";
  value: number;
  loc: SourceLoc;
}

export interface StringLiteral {
  kind: "StringLiteral";
  value: string;
  loc: SourceLoc;
}

// Resolves to an enum value or boolean constant
export interface IdentRef {
  kind: "IdentRef";
  name: string;
  loc: SourceLoc;
}

// ---------------------------------------------------------------------------
// Declarations within an entity body
// ---------------------------------------------------------------------------

export interface PropertyDecl {
  kind: "PropertyDecl";
  name: string;
  type: string;
  doc?: string;
  constraint?: Expr;
  loc: SourceLoc;
}

export interface RelationDecl {
  kind: "RelationDecl";
  name: string;
  target: string;
  cardinality: Cardinality;
  doc?: string;
  loc: SourceLoc;
}

export interface ConstraintDecl {
  kind: "ConstraintDecl";
  name: string;
  expr: Expr;
  doc?: string;
  loc: SourceLoc;
}

// ---------------------------------------------------------------------------
// Top-level statements
// ---------------------------------------------------------------------------

export type Statement =
  | TypeDecl
  | EnumDecl
  | EntityDecl
  | DerivedEntityDecl
  | MapDecl;

export interface TypeDecl {
  kind: "TypeDecl";
  name: string;
  base: string;
  doc?: string;
  loc: SourceLoc;
}

export interface EnumDecl {
  kind: "EnumDecl";
  name: string;
  values: string[];
  doc?: string;
  loc: SourceLoc;
}

export interface EntityDecl {
  kind: "EntityDecl";
  name: string;
  identifiedBy?: string;
  properties: PropertyDecl[];
  relations: RelationDecl[];
  constraints: ConstraintDecl[];
  doc?: string;
  loc: SourceLoc;
}

export interface DerivedEntityDecl {
  kind: "DerivedEntityDecl";
  name: string;
  base: string;   // entity this is derived from (avoids 'extends' reserved word)
  where: Expr;
  doc?: string;
  loc: SourceLoc;
}

export interface MapEntry {
  source: string;
  target: string;
  note?: string;
}

export interface MapDecl {
  kind: "MapDecl";
  tool: string;
  entries: MapEntry[];
  notes?: string;
  doc?: string;
  loc: SourceLoc;
}

// ---------------------------------------------------------------------------
// Program = list of statements
// ---------------------------------------------------------------------------

export interface Program {
  statements: Statement[];
  sourcePath: string;
}

// ---------------------------------------------------------------------------
// Source location
// ---------------------------------------------------------------------------

export interface SourceLoc {
  line: number;
  col: number;
}
