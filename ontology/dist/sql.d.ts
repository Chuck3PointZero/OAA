import type { Program, DerivedEntityDecl, Expr } from "./ast.js";
import type { OntologySymbols } from "./checker.js";
export declare function emitSchemaSQL(programs: Program[], symbols: OntologySymbols): string;
export declare function derivedConceptWhereSQL(decl: DerivedEntityDecl, symbols?: OntologySymbols): string;
export declare function propToCol(name: string): string;
export declare function exprToSQL(expr: Expr, enumValues?: Set<string>): string;
